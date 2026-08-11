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

import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Alert } from "react-native";
import { useAuthStore } from "@/src/features/auth/auth.store";
import { ENV } from "@/src/config/env";
import type {
  ParsedClassSchedule,
  ParsedCalendarEvent,
  ParsedExamWeek,
} from "@/src/components/schedule/ParsedItemRow";

export type SelectedFile =
  | { type: "document"; name: string; uri: string; mimeType: string }
  | {
      type: "image";
      uri: string;
      mimeType: string;
      name: string;
      thumbnail: string;
    };

export interface ParsedScheduleResult {
  classSchedules: ParsedClassSchedule[];
  calendarEvents: ParsedCalendarEvent[];
  examWeeks: ParsedExamWeek[];
}

export interface UseScheduleScannerResult {
  selectedFile: SelectedFile | null;
  isLoading: boolean;
  error: string | null;
  pickDocument: () => Promise<void>;
  pickFromGallery: () => Promise<void>;
  pickFromCamera: () => Promise<void>;
  clearFile: () => void;
  clearError: () => void;
  uploadAndParse: (currentSchedule?: string) => Promise<ParsedScheduleResult | null>;
}

export function useScheduleScanner(): UseScheduleScannerResult {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearFile = () => setSelectedFile(null);
  const clearError = () => setError(null);

  // ── File Pickers ─────────────────────────────────────────────────────────────

  const pickDocument = async () => {
    setError(null);
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
      setSelectedFile({
        type: "document",
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType ?? "application/pdf",
      });
    } catch {
      setError("Could not open the file. Please try again.");
    }
  };

  const pickFromGallery = async () => {
    setError(null);
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
        quality: 0.85,
        allowsEditing: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const mime = asset.mimeType ?? "image/jpeg";
      setSelectedFile({
        type: "image",
        uri: asset.uri,
        mimeType: mime,
        name: asset.fileName ?? `schedule_image.${mime.split("/")[1]}`,
        thumbnail: asset.uri,
      });
    } catch {
      setError("Could not load the image. Please try again.");
    }
  };

  const pickFromCamera = async () => {
    setError(null);
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
        quality: 0.85,
        allowsEditing: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const mime = asset.mimeType ?? "image/jpeg";
      setSelectedFile({
        type: "image",
        uri: asset.uri,
        mimeType: mime,
        name: asset.fileName ?? `schedule_photo.${mime.split("/")[1]}`,
        thumbnail: asset.uri,
      });
    } catch {
      setError("Could not capture the photo. Please try again.");
    }
  };

  // ── Upload & Parse ─────────────────────────────────────────────────────────

  const uploadAndParse = async (
    currentSchedule?: string
  ): Promise<ParsedScheduleResult | null> => {
    if (!selectedFile) return null;
    setError(null);
    setIsLoading(true);

    try {
      const httpBodyParams: Record<string, string> = {};
      if (currentSchedule) {
        httpBodyParams.currentSchedule = currentSchedule;
      }

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
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Handle token expiration
      if (uploadResult.status === 401) {
        const refreshed = await useAuthStore.getState().refreshSession();
        if (!refreshed) {
          throw new Error("Session expired. Please log in again.");
        }
        
        const newAccessToken = useAuthStore.getState().accessToken;
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
              Authorization: `Bearer ${newAccessToken}`,
            },
          }
        );
      }

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        let msg = `Server error (${uploadResult.status})`;
        try {
          const body = JSON.parse(uploadResult.body);
          msg = body.message || msg;
        } catch {}
        if (uploadResult.status === 415)
          throw new Error(
            "That file type is not supported. Try a PDF, Word doc, or image."
          );
        if (uploadResult.status === 413)
          throw new Error("Your file is too large (max 10 MB). Try a smaller file.");
        if (uploadResult.status === 503)
          throw new Error(
            "The AI service is temporarily busy. Please try again in a moment."
          );
        throw new Error(msg);
      }

      const json = JSON.parse(uploadResult.body);
      const data = json?.data;
      if (!data) throw new Error("Unexpected response from the server.");
      return data as ParsedScheduleResult;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    selectedFile,
    isLoading,
    error,
    pickDocument,
    pickFromGallery,
    pickFromCamera,
    clearFile,
    clearError,
    uploadAndParse,
  };
}
