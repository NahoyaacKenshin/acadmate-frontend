import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Text } from "@/src/components/ui/text";
import { Button } from "@/src/components/ui/button";
import { UploadPickerCard } from "@/src/components/schedule/UploadPickerCard";
import { AILoadingOverlay } from "@/src/components/schedule/AILoadingOverlay";
import { useScheduleScanner } from "@/src/hooks/useScheduleScanner";
import {
  FileText,
  Image as ImageIcon,
  Camera,
  ChevronLeft,
  Sparkles,
  X,
} from "lucide-react-native";

export default function ScheduleUploadScreen() {
  const {
    selectedFile,
    isLoading,
    error,
    pickDocument,
    pickFromGallery,
    pickFromCamera,
    clearFile,
    uploadAndParse,
  } = useScheduleScanner();

  const handleReadSchedule = async () => {
    const data = await uploadAndParse();
    if (!data) return;
    router.push({
      pathname: "/(app)/schedule-confirm" as any,
      params: { payload: JSON.stringify(data) },
    });
    setTimeout(() => clearFile(), 500);
  };

  return (
    <>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
              <ChevronLeft size={22} color="#94A3B8" />
            </Pressable>
            <Text style={styles.headerTitle}>Scan Schedule</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Sparkles size={28} color="#6C8EFF" />
            </View>
            <Text style={styles.heroTitle}>Upload your class schedule</Text>
            <Text style={styles.heroSub}>
              AcadMate AI will read your schedule and automatically add classes, events, and exam weeks to your calendar.
            </Text>
          </View>

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

          {selectedFile && (
            <View style={styles.previewCard}>
              <View style={styles.previewLeft}>
                {selectedFile.type === "image" ? (
                  <Image source={{ uri: selectedFile.thumbnail }} style={styles.previewThumb} />
                ) : (
                  <View style={styles.previewFileIcon}>
                    <FileText size={20} color="#6C8EFF" />
                  </View>
                )}
                <View style={styles.previewText}>
                  <Text style={styles.previewName} numberOfLines={1}>{selectedFile.name}</Text>
                  <Text style={styles.previewType}>
                    {selectedFile.mimeType.includes("pdf") ? "PDF Document" :
                      selectedFile.mimeType.includes("word") ? "Word Document" : "Image"}
                  </Text>
                </View>
              </View>
              <Pressable style={styles.previewRemove} onPress={clearFile} hitSlop={8}>
                <X size={16} color="#64748B" />
              </Pressable>
            </View>
          )}

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.tipBanner}>
            <Text style={styles.tipText}>
              Works best with clear, text-based schedules. Handwritten or blurry photos may reduce accuracy.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            style={[styles.ctaBtn, !selectedFile && styles.ctaBtnDisabled]}
            onPress={handleReadSchedule}
            disabled={!selectedFile || isLoading}
          >
            <Text style={[styles.ctaText, !selectedFile && styles.ctaTextDisabled]}>
              {selectedFile ? "Read My Schedule  →" : "Select a file to continue"}
            </Text>
          </Button>
        </View>
      </SafeAreaView>

      <AILoadingOverlay visible={isLoading} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#10131C" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, paddingBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#161A26", borderWidth: 1, borderColor: "#2A3143", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff" },
  hero: { alignItems: "center", paddingVertical: 20, marginBottom: 8 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(108, 142, 255, 0.12)", borderWidth: 1, borderColor: "rgba(108, 142, 255, 0.25)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  heroTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff", marginBottom: 8, textAlign: "center" },
  heroSub: { fontSize: 13, color: "#94A3B8", textAlign: "center", lineHeight: 20, maxWidth: 300 },
  sectionLabel: { fontSize: 12, fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  cards: { gap: 10, marginBottom: 20 },
  previewCard: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(108, 142, 255, 0.08)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(108, 142, 255, 0.25)", padding: 12, marginBottom: 12, gap: 12 },
  previewLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  previewThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#1A1F2E" },
  previewFileIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#1A1F2E", alignItems: "center", justifyContent: "center" },
  previewText: { flex: 1 },
  previewName: { fontSize: 13, fontWeight: "600", color: "#ffffff", marginBottom: 2 },
  previewType: { fontSize: 11, color: "#6C8EFF" },
  previewRemove: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#1A1F2E", alignItems: "center", justifyContent: "center" },
  errorBanner: { backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.3)", padding: 14, marginBottom: 12 },
  errorText: { fontSize: 13, color: "#EF4444", lineHeight: 18 },
  tipBanner: { backgroundColor: "#161A26", borderRadius: 12, borderWidth: 1, borderColor: "#2A3143", padding: 14 },
  tipText: { fontSize: 12, color: "#64748B", lineHeight: 18 },
  footer: { paddingHorizontal: 20, paddingBottom: Platform.OS === "android" ? 20 : 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#1A1F2E", backgroundColor: "#10131C" },
  ctaBtn: { backgroundColor: "#6C8EFF", borderRadius: 14, height: 56, alignItems: "center", justifyContent: "center" },
  ctaBtnDisabled: { backgroundColor: "#1A1F2E", borderWidth: 1, borderColor: "#2A3143" },
  ctaText: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  ctaTextDisabled: { color: "#64748B" },
});
