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
import {
  FileText,
  Image as ImageIcon,
  Camera,
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  File,
} from 'lucide-react-native';

interface UploadSourceSheetProps {
  visible: boolean;
  notebookId: string;
  onClose: () => void;
  onUploaded: () => void; // refresh list after upload
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
}: {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pickerCard,
        { borderColor: `${color}33` },
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.4 },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.pickerIconWrap, { backgroundColor: `${color}1A` }]}>
        {icon}
      </View>
      <Text style={styles.pickerLabel}>{label}</Text>
      <Text style={styles.pickerSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

export function UploadSourceSheet({
  visible,
  notebookId,
  onClose,
  onUploaded,
}: UploadSourceSheetProps) {
  const { accessToken } = useAuthStore();

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0); // 0–1

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

  const handleClose = () => {
    if (uploadState === 'uploading') return;
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
    setUploadState('uploading');
    setErrorMsg(null);
    setUploadProgress(0);

    try {
      const uploadUrl = `${ENV.API_URL}/notebooks/${notebookId}/sources`;
      
      const uploadTask = FileSystem.createUploadTask(
        uploadUrl,
        selectedFile.uri,
        {
          httpMethod: 'POST',
          uploadType: (FileSystem as any).FileSystemUploadType?.MULTIPART ?? 0,
          fieldName: 'file',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        (data) => {
          if (data.totalBytesExpectedToSend > 0) {
            const progress = data.totalBytesSent / data.totalBytesExpectedToSend;
            setUploadProgress(progress);
          }
        }
      );

      const response = await uploadTask.uploadAsync();

      if (!response) {
        throw new Error('Upload returned no response.');
      }

      if (response.status >= 400) {
        let errorMessage = 'Upload failed.';
        try {
          const body = JSON.parse(response.body);
          errorMessage = body.message ?? errorMessage;
        } catch {}
        if (response.status === 413) errorMessage = 'File is too large (max 20MB).';
        if (response.status === 415) errorMessage = 'Unsupported file type.';
        throw new Error(errorMessage);
      }

      setUploadProgress(1);
      setUploadState('success');
      // Auto-close after success and refresh the list
      setTimeout(() => {
        resetState();
        onUploaded();
        onClose();
      }, 1500);
    } catch (err: any) {
      setUploadState('error');
      setErrorMsg(err.message ?? 'Something went wrong. Please try again.');
      setUploadProgress(0);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

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
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <Upload size={18} color="#6C8EFF" />
            </View>
            <Text style={styles.headerTitle}>Add Source</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={handleClose} disabled={uploadState === 'uploading'}>
            <X size={20} color="#64748B" />
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Choose a file to upload</Text>

        {/* Picker cards */}
        <View style={styles.pickerRow}>
          <PickerCard
            icon={<FileText size={22} color="#EF4444" />}
            label="PDF / Word"
            subtitle="PDF, DOCX, TXT"
            color="#EF4444"
            onPress={pickDocument}
            disabled={uploadState === 'uploading'}
          />
          <PickerCard
            icon={<ImageIcon size={22} color="#8B5CF6" />}
            label="Gallery"
            subtitle="JPG, PNG"
            color="#8B5CF6"
            onPress={pickImage}
            disabled={uploadState === 'uploading'}
          />
          <PickerCard
            icon={<Camera size={22} color="#22C55E" />}
            label="Camera"
            subtitle="Take a photo"
            color="#22C55E"
            onPress={pickCamera}
            disabled={uploadState === 'uploading'}
          />
        </View>

        {/* Selected file preview */}
        {selectedFile && (
          <View style={styles.filePreview}>
            <View style={styles.filePreviewIcon}>
              <File size={18} color="#6C8EFF" />
            </View>
            <View style={styles.filePreviewInfo}>
              <Text style={styles.filePreviewName} numberOfLines={1}>{selectedFile.name}</Text>
              {fileSizeLabel && <Text style={styles.filePreviewSize}>{fileSizeLabel}</Text>}
            </View>
            {uploadState !== 'uploading' && (
              <Pressable onPress={() => setSelectedFile(null)} hitSlop={8}>
                <X size={16} color="#64748B" />
              </Pressable>
            )}
          </View>
        )}

        {/* Progress bar */}
        {uploadState === 'uploading' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressBarWidth }]} />
            </View>
            <Text style={styles.progressLabel}>
              {Math.round(uploadProgress * 100)}% — Uploading, please wait…
            </Text>
          </View>
        )}

        {/* Success state */}
        {uploadState === 'success' && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={16} color="#22C55E" />
            <Text style={styles.successText}>Uploaded! AI indexing started in the background.</Text>
          </View>
        )}

        {/* Error state */}
        {uploadState === 'error' && errorMsg && (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color="#EF4444" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* CTA */}
        {uploadState !== 'success' && (
          <Pressable
            style={[
              styles.uploadBtn,
              (!selectedFile || uploadState === 'uploading') && styles.uploadBtnDisabled,
            ]}
            onPress={handleUpload}
            disabled={!selectedFile || uploadState === 'uploading'}
          >
            {uploadState === 'uploading' ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Upload size={18} color="#ffffff" />
                <Text style={styles.uploadBtnText}>Upload & Index</Text>
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
    backgroundColor: '#161A26',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#2A3143',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: '#2A3143',
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
    backgroundColor: 'rgba(108,142,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2330',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 14,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  pickerCard: {
    flex: 1,
    backgroundColor: '#10131C',
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
    color: '#ffffff',
  },
  pickerSubtitle: {
    fontSize: 11,
    color: '#4A5568',
    textAlign: 'center',
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108,142,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.2)',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 16,
  },
  filePreviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(108,142,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePreviewInfo: {
    flex: 1,
  },
  filePreviewName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  filePreviewSize: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  progressContainer: {
    marginBottom: 16,
    gap: 8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#1E2330',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C8EFF',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6C8EFF',
    fontWeight: '600',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  successText: {
    fontSize: 13,
    color: '#22C55E',
    fontWeight: '600',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
  },
  uploadBtn: {
    flexDirection: 'row',
    backgroundColor: '#6C8EFF',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#6C8EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  uploadBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  uploadBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
