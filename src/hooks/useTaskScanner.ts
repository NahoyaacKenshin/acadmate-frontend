/**
 * useTaskScanner
 *
 * Encapsulates file picking and AI upload logic for scanning tasks
 * from syllabi, assignment sheets, rubric photos, and LMS screenshots.
 */

import { useState, useRef } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import { ENV } from '@/src/config/env';
import {
  assertOnline,
  classifyError,
  refreshSharedSession,
  getValidAccessToken,
} from '@/src/lib/aiRequest';
import { SubjectRow } from '@/src/hooks/useSubjects';

export type SelectedFile =
  | { type: 'document'; name: string; uri: string; mimeType: string; size?: number }
  | {
      type: 'image';
      uri: string;
      mimeType: string;
      name: string;
      thumbnail: string;
      size?: number;
    };

export interface ParsedScannedTask {
  tempId: string;
  title: string;
  description: string | null;
  dueDate: string | null; // ISO-8601 string in PHT
  subjectId: string | null;
  subjectName: string | null;
  selected: boolean;
}

export interface UseTaskScannerResult {
  selectedFile: SelectedFile | null;
  isLoading: boolean;
  error: string | null;
  isRetryable: boolean;
  pickDocument: () => Promise<void>;
  pickFromGallery: () => Promise<void>;
  pickFromCamera: () => Promise<void>;
  clearFile: () => void;
  clearError: () => void;
  cancelUpload: () => void;
  uploadAndScan: (subjects: SubjectRow[]) => Promise<ParsedScannedTask[] | null>;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
const SCAN_TIMEOUT_MS = 60000; // 60 seconds

export function useTaskScanner(): UseTaskScannerResult {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetryable, setIsRetryable] = useState(false);

  const isCancelledRef = useRef(false);

  const clearFile = () => setSelectedFile(null);
  const clearError = () => {
    setError(null);
    setIsRetryable(false);
  };

  const cancelUpload = () => {
    isCancelledRef.current = true;
    setIsLoading(false);
    setError(null);
    setIsRetryable(false);
  };

  // ── File Pickers ─────────────────────────────────────────────────────────────

  const pickDocument = async () => {
    clearError();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];

      if (asset.size && asset.size > MAX_FILE_SIZE_BYTES) {
        setError('Your file exceeds the 10 MB limit. Please choose a smaller file.');
        setIsRetryable(false);
        return;
      }

      setSelectedFile({
        type: 'document',
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'application/pdf',
        size: asset.size,
      });
    } catch {
      setError('Could not open the file. Please try again.');
      setIsRetryable(true);
    }
  };

  const pickFromGallery = async () => {
    clearError();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Allow access to your photo library to upload an assignment image.'
      );
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
        setError('Your image exceeds the 10 MB limit. Please choose a smaller image.');
        setIsRetryable(false);
        return;
      }

      const ext = asset.uri.split('.').pop() ?? 'jpg';
      setSelectedFile({
        type: 'image',
        uri: asset.uri,
        mimeType: asset.mimeType ?? `image/${ext}`,
        name: asset.fileName ?? `task_scan_${Date.now()}.${ext}`,
        thumbnail: asset.uri,
        size: asset.fileSize,
      });
    } catch {
      setError('Could not select the image. Please try again.');
      setIsRetryable(true);
    }
  };

  const pickFromCamera = async () => {
    clearError();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Allow access to your camera to capture an assignment or syllabus.'
      );
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
        setError('The captured photo is too large. Please try again.');
        setIsRetryable(false);
        return;
      }

      const ext = asset.uri.split('.').pop() ?? 'jpg';
      setSelectedFile({
        type: 'image',
        uri: asset.uri,
        mimeType: asset.mimeType ?? `image/${ext}`,
        name: `camera_task_scan_${Date.now()}.${ext}`,
        thumbnail: asset.uri,
        size: asset.fileSize,
      });
    } catch {
      setError('Could not take the photo. Please try again.');
      setIsRetryable(true);
    }
  };

  // ── Upload & Parse ───────────────────────────────────────────────────────────

  const uploadAndScan = async (subjects: SubjectRow[]): Promise<ParsedScannedTask[] | null> => {
    if (!selectedFile) return null;

    try {
      assertOnline();
    } catch (err) {
      const classified = classifyError(err);
      setError(classified.message);
      setIsRetryable(classified.retryable);
      return null;
    }

    setIsLoading(true);
    setError(null);
    setIsRetryable(false);
    isCancelledRef.current = false;

    try {
      // 1. Check file size
      const fileInfo = await FileSystem.getInfoAsync(selectedFile.uri);
      if (fileInfo.exists && fileInfo.size > MAX_FILE_SIZE_BYTES) {
        const classified = classifyError(new Error('FILE_TOO_LARGE'));
        setError(classified.message);
        setIsRetryable(false);
        setIsLoading(false);
        return null;
      }

      const uploadUrl = `${ENV.API_URL}/tasks/scan`;

      // Subjects payload for context matching
      const subjectsPayload = JSON.stringify(
        subjects.map((s) => ({ id: s.id, name: s.name }))
      );

      const performUpload = async (token: string | null) => {
        const uploadPromise = FileSystem.uploadAsync(uploadUrl, selectedFile.uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType: selectedFile.mimeType,
          parameters: {
            subjects: subjectsPayload,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            const timeoutErr = new Error('Task scan took too long to respond. Please try again.');
            (timeoutErr as any).type = 'TIMEOUT';
            reject(timeoutErr);
          }, SCAN_TIMEOUT_MS);
        });

        return await Promise.race([uploadPromise, timeoutPromise]);
      };

      let token = await getValidAccessToken();
      let response = await performUpload(token);

      // Handle 401 Session Expiration
      if (response && response.status === 401) {
        const refreshed = await refreshSharedSession();
        if (!refreshed) {
          throw new Error('Your session expired. Please sign in again.');
        }
        token = await getValidAccessToken();
        response = await performUpload(token);
      }

      if (isCancelledRef.current) return null;

      if (!response) {
        throw new Error('No response received from the server.');
      }

      let parsedBody: any;
      try {
        parsedBody = JSON.parse(response.body);
      } catch {
        const classified = classifyError(new Error('SERVER'), response.status);
        setError(classified.message);
        setIsRetryable(classified.retryable);
        setIsLoading(false);
        return null;
      }

      if (response.status >= 400) {
        const rawMsg = parsedBody?.message ?? 'Task scanning failed.';
        const classified = classifyError(new Error(rawMsg), response.status);
        setError(classified.message);
        setIsRetryable(classified.retryable);
        setIsLoading(false);
        return null;
      }

      const tasksRaw = Array.isArray(parsedBody?.data?.tasks) ? parsedBody.data.tasks : [];

      if (tasksRaw.length === 0) {
        setError("We couldn't detect any tasks or assignments in this document. Please ensure the document is clear and readable.");
        setIsRetryable(true);
        setIsLoading(false);
        return null;
      }

      const scannedTasks: ParsedScannedTask[] = tasksRaw.map((t: any, idx: number) => ({
        tempId: `scanned_${Date.now()}_${idx}`,
        title: String(t.title || 'Untitled Task').trim(),
        description: t.description ? String(t.description).trim() : null,
        dueDate: t.dueDate ?? null,
        subjectId: t.subjectId ?? null,
        subjectName: t.subjectName ?? null,
        selected: true,
      }));

      setIsLoading(false);
      return scannedTasks;
    } catch (err: any) {
      if (isCancelledRef.current) return null;

      const classified = classifyError(err);
      setError(classified.message);
      setIsRetryable(classified.retryable);
      setIsLoading(false);
      return null;
    }
  };

  return {
    selectedFile,
    isLoading,
    error,
    isRetryable,
    pickDocument,
    pickFromGallery,
    pickFromCamera,
    clearFile,
    clearError,
    cancelUpload,
    uploadAndScan,
  };
}
