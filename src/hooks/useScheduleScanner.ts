/**
 * useScheduleScanner
 *
 * Encapsulates all file-picking and AI upload logic so it can be used
 * from both the initial upload screen and the "Scan Another File" flow
 * on the review screen.
 *
 * When `currentSchedule` is provided, it is sent to the backend alongside
 * the new file so that Gemini can intelligently merge/update existing items.
 */

import { useState, useRef, useCallback } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Alert } from "react-native";
import { useAuthStore } from "@/src/features/auth/auth.store";
import { ENV } from "@/src/config/env";
import {
  assertOnline,
  classifyError,
  refreshSharedSession,
  getValidAccessToken,
} from "@/src/lib/aiRequest";
import type {
  ParsedSemesterInfo,
  ParsedClassSchedule,
  ParsedCalendarEvent,
  ParsedExamWeekBlocker,
  ParsedExamEvent,
  ParsedExamWeek,
} from "@/src/components/schedule/ParsedItemRow";

export type SelectedFile =
  | { type: "document"; name: string; uri: string; mimeType: string; size?: number }
  | {
      type: "image";
      uri: string;
      mimeType: string;
      name: string;
      thumbnail: string;
      size?: number;
    };

export interface ParsedScheduleResult {
  semesterInfo?: ParsedSemesterInfo | null;
  classSchedules: ParsedClassSchedule[];
  calendarEvents: ParsedCalendarEvent[];
  examWeekBlockers?: ParsedExamWeekBlocker[];
  examEvents?: ParsedExamEvent[];
  examWeeks: ParsedExamWeek[];
}

export interface UseScheduleScannerResult {
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
  uploadAndParse: (currentSchedule?: string) => Promise<ParsedScheduleResult | null>;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
const SCAN_TIMEOUT_MS = 60000; // 60 seconds

export function useScheduleScanner(): UseScheduleScannerResult {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetryable, setIsRetryable] = useState(false);

  const isCancelledRef = useRef(false);

  const clearFile = useCallback(() => setSelectedFile(null), []);
  const clearError = useCallback(() => {
    setError(null);
    setIsRetryable(false);
  }, []);

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
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];

      // Pre-check size if available from picker
      if (asset.size && asset.size > MAX_FILE_SIZE_BYTES) {
        setError("Your file exceeds the 10 MB limit. Please choose a smaller file.");
        setIsRetryable(false);
        return;
      }

      setSelectedFile({
        type: "document",
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType ?? "application/pdf",
        size: asset.size,
      });
    } catch {
      setError("Could not open the file. Please try again.");
      setIsRetryable(true);
    }
  };

  const pickFromGallery = async () => {
    clearError();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow access to your photo library to upload a schedule image."
      );
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.75,
        allowsEditing: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const mime = asset.mimeType ?? "image/jpeg";

      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
        setError("Your image exceeds the 10 MB limit. Please select a smaller photo.");
        setIsRetryable(false);
        return;
      }

      setSelectedFile({
        type: "image",
        uri: asset.uri,
        mimeType: mime,
        name: asset.fileName ?? `schedule_image.${mime.split("/")[1] ?? "jpg"}`,
        thumbnail: asset.uri,
        size: asset.fileSize,
      });
    } catch {
      setError("Could not load the image. Please try again.");
      setIsRetryable(true);
    }
  };

  const pickFromCamera = async () => {
    clearError();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow camera access to take a photo of your schedule."
      );
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.75,
        allowsEditing: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const mime = asset.mimeType ?? "image/jpeg";

      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
        setError("Captured photo exceeds 10 MB. Please try again.");
        setIsRetryable(false);
        return;
      }

      setSelectedFile({
        type: "image",
        uri: asset.uri,
        mimeType: mime,
        name: asset.fileName ?? `schedule_photo.${mime.split("/")[1] ?? "jpg"}`,
        thumbnail: asset.uri,
        size: asset.fileSize,
      });
    } catch {
      setError("Could not capture the photo. Please try again.");
      setIsRetryable(true);
    }
  };

  // ── Upload & Parse ─────────────────────────────────────────────────────────

  const uploadAndParse = async (
    currentSchedule?: string
  ): Promise<ParsedScheduleResult | null> => {
    if (!selectedFile) return null;
    clearError();
    isCancelledRef.current = false;

    // 1. Pre-flight offline check
    try {
      assertOnline();
    } catch (err) {
      const classified = classifyError(err);
      setError(classified.message);
      setIsRetryable(classified.retryable);
      return null;
    }

    // 2. Pre-flight file size check via FileSystem if not checked yet
    try {
      const fileInfo = await FileSystem.getInfoAsync(selectedFile.uri);
      if (fileInfo.exists && typeof fileInfo.size === "number" && fileInfo.size > MAX_FILE_SIZE_BYTES) {
        setError("Your file exceeds the 10 MB limit. Please select a smaller file.");
        setIsRetryable(false);
        return null;
      }
    } catch {
      // Non-fatal if info cannot be read, proceed to upload
    }

    setIsLoading(true);

    try {
      const httpBodyParams: Record<string, string> = {};
      if (currentSchedule) {
        httpBodyParams.currentSchedule = currentSchedule;
      }

      const token = await getValidAccessToken();

      // Wrapped upload promise with timeout guard
      const uploadPromise = (async () => {
        let uploadResult = await FileSystem.uploadAsync(
          `${ENV.API_URL}/schedule-parser/parse`,
          selectedFile.uri,
          {
            httpMethod: "POST",
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: "file",
            mimeType: selectedFile.mimeType || "image/jpeg",
            parameters: httpBodyParams,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (isCancelledRef.current) return null;

        // Auto-refresh token if 401
        if (uploadResult.status === 401) {
          const refreshed = await refreshSharedSession();
          if (!refreshed) {
            const err = new Error("Session expired. Please sign in again.");
            (err as any).type = "AUTH_EXPIRED";
            throw err;
          }

          const newToken = await getValidAccessToken();
          uploadResult = await FileSystem.uploadAsync(
            `${ENV.API_URL}/schedule-parser/parse`,
            selectedFile.uri,
            {
              httpMethod: "POST",
              uploadType: FileSystem.FileSystemUploadType.MULTIPART,
              fieldName: "file",
              mimeType: selectedFile.mimeType || "image/jpeg",
              parameters: httpBodyParams,
              headers: {
                Authorization: `Bearer ${newToken}`,
              },
            }
          );
        }

        return uploadResult;
      })();

      // Timeout racer
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const err = new Error("Request timed out");
          (err as any).type = "TIMEOUT";
          reject(err);
        }, SCAN_TIMEOUT_MS);
      });

      const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);

      if (isCancelledRef.current || !uploadResult) {
        return null;
      }

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        let msg = `Server error (${uploadResult.status})`;
        try {
          const body = JSON.parse(uploadResult.body);
          msg = body.message || msg;
        } catch {}
        const classified = classifyError(new Error(msg), uploadResult.status);
        setError(classified.message);
        setIsRetryable(classified.retryable);
        return null;
      }

      const json = JSON.parse(uploadResult.body);
      const data = json?.data as ParsedScheduleResult | undefined;

      if (!data) {
        setError("Unexpected response from the server. Please try again.");
        setIsRetryable(true);
        return null;
      }

      // Empty schedule detection guard
      const hasClasses = Array.isArray(data.classSchedules) && data.classSchedules.length > 0;
      const hasEvents = Array.isArray(data.calendarEvents) && data.calendarEvents.length > 0;
      const hasExamWeeks = Array.isArray(data.examWeeks) && data.examWeeks.length > 0;
      const hasExamEvents = Array.isArray(data.examEvents) && data.examEvents.length > 0;

      if (!hasClasses && !hasEvents && !hasExamWeeks && !hasExamEvents) {
        const classified = classifyError(new Error("Empty schedule detected"), undefined);
        setError(classified.message);
        setIsRetryable(true);
        return null;
      }

      return data;
    } catch (err: unknown) {
      if (isCancelledRef.current) {
        return null;
      }
      const classified = classifyError(err);
      setError(classified.message);
      setIsRetryable(classified.retryable);
      return null;
    } finally {
      setIsLoading(false);
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
    uploadAndParse,
  };
}
