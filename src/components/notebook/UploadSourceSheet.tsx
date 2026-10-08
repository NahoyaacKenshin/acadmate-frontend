import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Text } from '@/src/components/ui/text';
import { ENV } from '@/src/config/env';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useTheme } from '@/src/theme/useTheme';
import {
  FileText,
  Image as ImageIcon,
  Camera,
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  File,
  WifiOff,
} from 'lucide-react-native';
import { useSystemStore } from '@/src/store/systemStore';
import {
  assertOnline,
  classifyError,
  refreshSharedSession,
  getValidAccessToken,
} from '@/src/lib/aiRequest';

interface UploadSourceSheetProps {
  visible: boolean;
  notebookId: string;
  onClose: () => void;
  onUploaded: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface SelectedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

function PickerCard({
  icon,
  label,
  subtitle,
  color,
  onPress,
  disabled,
  cardBg,
  borderColor,
  textColor,
  mutedColor,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  cardBg: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pickerCard,
        { backgroundColor: cardBg, borderColor },
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.4 },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.pickerIconWrap, { backgroundColor: `${color}1A` }]}>
        {icon}
      </View>
      <Text style={[styles.pickerLabel, { color: textColor }]}>{label}</Text>
      <Text style={[styles.pickerSubtitle, { color: mutedColor }]}>{subtitle}</Text>
    </Pressable>
  );
}

export function UploadSourceSheet({
  visible,
  notebookId,
  onClose,
  onUploaded,
}: UploadSourceSheetProps) {
  const { colors, isDark } = useTheme();
  const { accessToken } = useAuthStore();
  const isOnline = useSystemStore((s) => s.isOnline);

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadTaskRef = useRef<FileSystem.UploadTask | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: uploadProgress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [uploadProgress]);

  const resetState = () => {
    setSelectedFile(null);
    setUploadState('idle');
    setErrorMsg(null);
    setUploadProgress(0);
    progressAnim.setValue(0);
  };

  const handleCancelUpload = async () => {
    if (uploadTaskRef.current) {
      try {
        await uploadTaskRef.current.cancelAsync();
      } catch {}
      uploadTaskRef.current = null;
    }
    setUploadState('idle');
    setUploadProgress(0);
    setErrorMsg('Upload cancelled.');
  };

  const handleClose = () => {
    if (uploadState === 'uploading') {
      handleCancelUpload();
    }
    resetState();
    onClose();
  };

  // ─── File pickers ──────────────────────────────────────────────────────────

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setSelectedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/pdf', size: asset.size });
    } catch {
      setErrorMsg('Could not open document picker.');
    }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setErrorMsg('Gallery permission is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    setSelectedFile({ uri: asset.uri, name: `image.${ext}`, mimeType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
  };

  const pickCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { setErrorMsg('Camera permission is required.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    setSelectedFile({ uri: asset.uri, name: `capture.${ext}`, mimeType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
  };

  // ─── Upload ────────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      assertOnline();
    } catch (err) {
      const classified = classifyError(err);
      setUploadState('error');
      setErrorMsg(classified.message);
      return;
    }

    setUploadState('uploading');
    setErrorMsg(null);
    setUploadProgress(0);

    try {
      const uploadUrl = `${ENV.API_URL}/notebooks/${notebookId}/sources`;
      let token = await getValidAccessToken();
      
      const createAndRunTask = async (authToken: string | null) => {
        const task = FileSystem.createUploadTask(
          uploadUrl,
          selectedFile.uri,
          {
            httpMethod: 'POST',
            uploadType: (FileSystem as any).FileSystemUploadType?.MULTIPART ?? 0,
            fieldName: 'file',
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          },
          (data) => {
            if (data.totalBytesExpectedToSend > 0) {
              const progress = data.totalBytesSent / data.totalBytesExpectedToSend;
              setUploadProgress(progress);
            }
          }
        );
        uploadTaskRef.current = task;
        return await task.uploadAsync();
      };

      let response = await createAndRunTask(token);

      // Handle 401 session expiration
      if (response && response.status === 401) {
        const refreshed = await refreshSharedSession();
        if (!refreshed) {
          throw new Error('Session expired. Please sign in again.');
        }
        token = await getValidAccessToken();
        response = await createAndRunTask(token);
      }

      uploadTaskRef.current = null;

      if (!response) {
        throw new Error('Upload returned no response.');
      }

      if (response.status >= 400) {
        let msg = 'Upload failed.';
        try {
          const body = JSON.parse(response.body);
          msg = body.message ?? msg;
        } catch {}
        const classified = classifyError(new Error(msg), response.status);
        throw new Error(classified.message);
      }

      setUploadProgress(1);
      setUploadState('success');
      setTimeout(() => {
        resetState();
        onUploaded();
        onClose();
      }, 1500);
    } catch (err: any) {
      uploadTaskRef.current = null;
      setUploadState('error');
      const classified = classifyError(err);
      setErrorMsg(classified.message);
      setUploadProgress(0);
    }
  };

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const fileSizeLabel = selectedFile?.size
    ? selectedFile.size < 1024 * 1024
      ? `${(selectedFile.size / 1024).toFixed(1)} KB`
      : `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.headerIconWrap,
                { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF' },
              ]}
            >
              <Upload size={18} color="#6366F1" />
            </View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Add Source</Text>
          </View>
          <Pressable
            style={[
              styles.closeBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F4F4F5' },
            ]}
            onPress={handleClose}
            disabled={uploadState === 'uploading'}
          >
            <X size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {!isOnline && (
          <View
            style={[
              styles.offlineBanner,
              {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FEF3C7',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A',
              },
            ]}
          >
            <WifiOff size={16} color={isDark ? '#F59E0B' : '#D97706'} />
            <Text
              style={[
                styles.offlineText,
                { color: isDark ? '#F59E0B' : '#D97706' },
              ]}
            >
              You're offline. Reconnect to upload and index documents.
            </Text>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CHOOSE A FILE TO UPLOAD</Text>

        {/* Picker cards */}
        <View style={styles.pickerRow}>
          <PickerCard
            icon={<FileText size={22} color="#EF4444" />}
            label="PDF / Word"
            subtitle="PDF, DOCX, TXT"
            color="#EF4444"
            onPress={pickDocument}
            disabled={!isOnline || uploadState === 'uploading'}
            cardBg={isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'}
            borderColor={colors.border}
            textColor={colors.foreground}
            mutedColor={colors.mutedForeground}
          />
          <PickerCard
            icon={<ImageIcon size={22} color="#8B5CF6" />}
            label="Gallery"
            subtitle="JPG, PNG"
            color="#8B5CF6"
            onPress={pickImage}
            disabled={!isOnline || uploadState === 'uploading'}
            cardBg={isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'}
            borderColor={colors.border}
            textColor={colors.foreground}
            mutedColor={colors.mutedForeground}
          />
          <PickerCard
            icon={<Camera size={22} color="#10B981" />}
            label="Camera"
            subtitle="Take a photo"
            color="#10B981"
            onPress={pickCamera}
            disabled={!isOnline || uploadState === 'uploading'}
            cardBg={isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'}
            borderColor={colors.border}
            textColor={colors.foreground}
            mutedColor={colors.mutedForeground}
          />
        </View>

        {/* Selected file preview */}
        {selectedFile && (
          <View
            style={[
              styles.filePreview,
              {
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#C7D2FE',
              },
            ]}
          >
            <View
              style={[
                styles.filePreviewIcon,
                { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#E0E7FF' },
              ]}
            >
              <File size={18} color="#6366F1" />
            </View>
            <View style={styles.filePreviewInfo}>
              <Text style={[styles.filePreviewName, { color: colors.foreground }]} numberOfLines={1}>
                {selectedFile.name}
              </Text>
              {fileSizeLabel && (
                <Text style={[styles.filePreviewSize, { color: colors.mutedForeground }]}>
                  {fileSizeLabel}
                </Text>
              )}
            </View>
            {uploadState !== 'uploading' && (
              <Pressable onPress={() => setSelectedFile(null)} hitSlop={8}>
                <X size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        )}

        {/* Progress bar */}
        {uploadState === 'uploading' && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <Animated.View style={[styles.progressFill, { width: progressBarWidth }]} />
            </View>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>
                {Math.round(uploadProgress * 100)}% — Uploading, please wait…
              </Text>
              <Pressable onPress={handleCancelUpload} hitSlop={8}>
                <Text style={styles.cancelUploadText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Success state */}
        {uploadState === 'success' && (
          <View
            style={[
              styles.successBanner,
              {
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
                borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0',
              },
            ]}
          >
            <CheckCircle2 size={16} color="#10B981" />
            <Text style={styles.successText}>Uploaded! AI indexing started in the background.</Text>
          </View>
        )}

        {/* Error state */}
        {uploadState === 'error' && errorMsg && (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
              },
            ]}
          >
            <AlertCircle size={16} color="#EF4444" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* CTA */}
        {uploadState !== 'success' && (
          <Pressable
            style={[
              styles.uploadBtn,
              (!selectedFile || !isOnline || uploadState === 'uploading') && styles.uploadBtnDisabled,
            ]}
            onPress={handleUpload}
            disabled={!selectedFile || !isOnline || uploadState === 'uploading'}
          >
            {uploadState === 'uploading' ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Upload size={18} color="#ffffff" />
                <Text style={styles.uploadBtnText}>
                  {!isOnline ? 'Offline — Connect to Upload' : 'Upload & Index'}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    includeFontPadding: false,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 14,
    includeFontPadding: false,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  pickerCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  pickerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '700',
    includeFontPadding: false,
  },
  pickerSubtitle: {
    fontSize: 11,
    textAlign: 'center',
    includeFontPadding: false,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 16,
  },
  filePreviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePreviewInfo: {
    flex: 1,
  },
  filePreviewName: {
    fontSize: 13,
    fontWeight: '600',
    includeFontPadding: false,
  },
  filePreviewSize: {
    fontSize: 11,
    marginTop: 2,
    includeFontPadding: false,
  },
  progressContainer: {
    marginBottom: 16,
    gap: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
    includeFontPadding: false,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  successText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    flex: 1,
    includeFontPadding: false,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
    includeFontPadding: false,
  },
  uploadBtn: {
    flexDirection: 'row',
    backgroundColor: '#6366F1',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  uploadBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  uploadBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    includeFontPadding: false,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    includeFontPadding: false,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelUploadText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 4,
    includeFontPadding: false,
  },
});
