import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/src/components/ui/text';
import { Button } from '@/src/components/ui/button';
import { UploadPickerCard } from '@/src/components/schedule/UploadPickerCard';
import { AILoadingOverlay } from '@/src/components/schedule/AILoadingOverlay';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { ENV } from '@/src/config/env';
import {
  FileText,
  Image as ImageIcon,
  Camera,
  ChevronLeft,
  Sparkles,
  X,
} from 'lucide-react-native';

// ── Types ─────────────────────────────────────────────────────────────────────

type SelectedFile =
  | { type: 'document'; name: string; uri: string; mimeType: string }
  | { type: 'image'; uri: string; mimeType: string; name: string; thumbnail: string };

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ScheduleUploadScreen() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── File pickers ─────────────────────────────────────────────────────────

  const pickDocument = async () => {
    setError(null);
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
      setSelectedFile({
        type: 'document',
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'application/pdf',
      });
    } catch {
      setError('Could not open the file. Please try again.');
    }
  };

  const pickFromGallery = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access to your photo library to upload a schedule image.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const mime = asset.mimeType ?? 'image/jpeg';
      setSelectedFile({
        type: 'image',
        uri: asset.uri,
        mimeType: mime,
        name: asset.fileName ?? `schedule_image.${mime.split('/')[1]}`,
        thumbnail: asset.uri,
      });
    } catch {
      setError('Could not load the image. Please try again.');
    }
  };

  const pickFromCamera = async () => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take a photo of your schedule.');
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        allowsEditing: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const mime = asset.mimeType ?? 'image/jpeg';
      setSelectedFile({
        type: 'image',
        uri: asset.uri,
        mimeType: mime,
        name: asset.fileName ?? `schedule_photo.${mime.split('/')[1]}`,
        thumbnail: asset.uri,
      });
    } catch {
      setError('Could not capture the photo. Please try again.');
    }
  };

  // ── Submit to AI ──────────────────────────────────────────────────────────

  const handleReadSchedule = async () => {
    if (!selectedFile) return;
    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      // React Native's FormData accepts objects with uri/name/type
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType,
      } as unknown as Blob);

      const response = await fetch(`${ENV.API_URL}/schedule-parser/parse`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          // Do NOT set Content-Type — fetch sets it with the correct boundary for multipart
        },
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const msg = body?.message ?? `Server error (${response.status})`;

        if (response.status === 415) throw new Error('That file type is not supported. Try a PDF, Word doc, or image.');
        if (response.status === 413) throw new Error('Your file is too large (max 10 MB). Try a smaller file.');
        if (response.status === 503) throw new Error('The AI service is temporarily busy. Please try again in a moment.');
        throw new Error(msg);
      }

      const json = await response.json();
      const data = json?.data;

      if (!data) throw new Error('Unexpected response from the server.');

      // Navigate to review screen with the result
      router.push({
        pathname: '/(app)/schedule-confirm',
        params: { payload: JSON.stringify(data) },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
              <ChevronLeft size={22} color="#94A3B8" />
            </Pressable>
            <Text style={styles.headerTitle}>Scan Schedule</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Hero / description */}
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Sparkles size={28} color="#6C8EFF" />
            </View>
            <Text style={styles.heroTitle}>Upload your class schedule</Text>
            <Text style={styles.heroSub}>
              AcadMate AI will read your schedule and automatically add classes, events, and exam weeks to your calendar.
            </Text>
          </View>

          {/* Option cards */}
          <Text style={styles.sectionLabel}>Choose how to upload</Text>
          <View style={styles.cards}>
            <UploadPickerCard
              icon={<FileText size={22} color="#6C8EFF" />}
              label="PDF or Word Document"
              subtitle="Attach a PDF or .docx file from your device"
              accent="#6C8EFF"
              onPress={pickDocument}
            />
            <UploadPickerCard
              icon={<ImageIcon size={22} color="#10B981" />}
              label="Image from Gallery"
              subtitle="Pick a photo of your schedule from your library"
              accent="#10B981"
              onPress={pickFromGallery}
            />
            <UploadPickerCard
              icon={<Camera size={22} color="#8B5CF6" />}
              label="Take a Photo"
              subtitle="Open your camera and snap your schedule sheet"
              accent="#8B5CF6"
              onPress={pickFromCamera}
            />
          </View>

          {/* Selected file preview */}
          {selectedFile && (
            <View style={styles.previewCard}>
              <View style={styles.previewLeft}>
                {selectedFile.type === 'image' ? (
                  <Image source={{ uri: selectedFile.thumbnail }} style={styles.previewThumb} />
                ) : (
                  <View style={styles.previewFileIcon}>
                    <FileText size={20} color="#6C8EFF" />
                  </View>
                )}
                <View style={styles.previewText}>
                  <Text style={styles.previewName} numberOfLines={1}>{selectedFile.name}</Text>
                  <Text style={styles.previewType}>
                    {selectedFile.mimeType.includes('pdf') ? 'PDF Document' :
                      selectedFile.mimeType.includes('word') ? 'Word Document' : 'Image'}
                  </Text>
                </View>
              </View>
              <Pressable style={styles.previewRemove} onPress={() => setSelectedFile(null)} hitSlop={8}>
                <X size={16} color="#64748B" />
              </Pressable>
            </View>
          )}

          {/* Error banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Tip */}
          <View style={styles.tipBanner}>
            <Text style={styles.tipText}>
              💡 Works best with clear, text-based schedules. Handwritten or blurry photos may reduce accuracy.
            </Text>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.footer}>
          <Button
            style={[styles.ctaBtn, !selectedFile && styles.ctaBtnDisabled]}
            onPress={handleReadSchedule}
            disabled={!selectedFile || isLoading}
          >
            <Text style={[styles.ctaText, !selectedFile && styles.ctaTextDisabled]}>
              {selectedFile ? 'Read My Schedule  →' : 'Select a file to continue'}
            </Text>
          </Button>
        </View>
      </SafeAreaView>

      {/* Full-screen AI loading overlay */}
      <AILoadingOverlay visible={isLoading} />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#10131C',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#2A3143',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 142, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(108, 142, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },

  // Section label
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // Cards
  cards: { gap: 10, marginBottom: 20 },

  // Preview
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 142, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(108, 142, 255, 0.25)',
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  previewLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1A1F2E',
  },
  previewFileIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1A1F2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: { flex: 1 },
  previewName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  previewType: {
    fontSize: 11,
    color: '#6C8EFF',
  },
  previewRemove: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#1A1F2E',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Error
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 14,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    lineHeight: 18,
  },

  // Tip
  tipBanner: {
    backgroundColor: '#161A26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 14,
  },
  tipText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },

  // Footer CTA
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'android' ? 20 : 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A1F2E',
    backgroundColor: '#10131C',
  },
  ctaBtn: {
    backgroundColor: '#6C8EFF',
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnDisabled: {
    backgroundColor: '#1A1F2E',
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  ctaTextDisabled: {
    color: '#64748B',
  },
});
