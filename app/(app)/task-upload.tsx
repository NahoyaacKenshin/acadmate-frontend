import React, { useMemo, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Image,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { UploadPickerCard } from "@/src/components/schedule/UploadPickerCard";
import { AILoadingOverlay, TASK_STAGES } from "@/src/components/schedule/AILoadingOverlay";
import { useTaskScanner } from "@/src/hooks/useTaskScanner";
import { useSubjects } from "@/src/hooks/useSubjects";
import {
  FileText,
  Image as ImageIcon,
  Camera,
  ChevronLeft,
  Sparkles,
  X,
  WifiOff,
  RotateCw,
} from "lucide-react-native";
import { useSystemStore } from "@/src/store/systemStore";
import { useTheme } from "@/src/theme/useTheme";
import type { ThemeColors } from "@/src/theme/tokens";

export default function TaskUploadScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const { isOnline } = useSystemStore();
  const { subjects } = useSubjects();
  const {
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
  } = useTaskScanner();

  // Clear any failed attempt error messages whenever the user leaves this screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearError();
      };
    }, [clearError])
  );

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleBack = () => {
    clearError();
    router.back();
  };

  const handleScanTasks = async () => {
    const data = await uploadAndScan(subjects);
    if (!data) return;
    clearError();
    router.push({
      pathname: "/(app)/task-confirm" as any,
      params: { payload: JSON.stringify(data) },
    });
    setTimeout(() => clearFile(), 500);
  };

  return (
    <>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={8}>
              <ChevronLeft size={22} color={colors.foreground} />
            </Pressable>
            <Text style={styles.headerTitle}>Scan Tasks</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Sparkles size={28} color="#6366F1" />
            </View>
            <Text style={styles.heroTitle}>Upload assignment or syllabus</Text>
            <Text style={styles.heroSub}>
              AcadMate AI will read your document or photo and automatically extract assignments, projects, and deadlines.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>Choose how to upload</Text>
          <View style={styles.cards}>
            <UploadPickerCard
              icon={<FileText size={22} color="#6366F1" />}
              label="PDF or Word Document"
              subtitle="Attach a syllabus, rubric, or assignment file"
              accent="#6366F1"
              onPress={pickDocument}
            />
            <UploadPickerCard
              icon={<ImageIcon size={22} color="#10B981" />}
              label="Image from Gallery"
              subtitle="Pick a photo of an assignment or LMS screenshot"
              accent="#10B981"
              onPress={pickFromGallery}
            />
            <UploadPickerCard
              icon={<Camera size={22} color="#8B5CF6" />}
              label="Take a Photo"
              subtitle="Open your camera and snap physical handouts"
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
                    <FileText size={20} color="#6366F1" />
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
                <X size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          )}

          {!isOnline && (
            <View style={styles.offlineBanner}>
              <WifiOff size={16} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.offlineBannerTitle}>You are offline</Text>
                <Text style={styles.offlineBannerSub}>
                  AI task scanning requires an active internet connection. Please reconnect.
                </Text>
              </View>
            </View>
          )}

          {error && (
            <View style={styles.errorBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
              {isRetryable && (
                <Pressable
                  style={styles.retryBtn}
                  onPress={handleScanTasks}
                  disabled={isLoading || !isOnline}
                >
                  <RotateCw size={13} color="#EF4444" />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </Pressable>
              )}
            </View>
          )}

          <View style={styles.tipBanner}>
            <Text style={styles.tipText}>
              Works best with clear, text-based documents or screenshots. Blurry photos may reduce accuracy.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.ctaBtn, (!selectedFile || !isOnline) && styles.ctaBtnDisabled]}
            onPress={handleScanTasks}
            disabled={!selectedFile || isLoading || !isOnline}
          >
            <Sparkles size={18} color={(!selectedFile || !isOnline) ? colors.mutedForeground : "#ffffff"} style={{ marginRight: 8 }} />
            <Text style={[styles.ctaText, (!selectedFile || !isOnline) && styles.ctaTextDisabled]}>
              {!isOnline
                ? "Offline — connect to scan"
                : selectedFile
                ? "Scan Tasks with AI"
                : "Select a file to continue"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <AILoadingOverlay
        visible={isLoading}
        onCancel={cancelUpload}
        stages={TASK_STAGES}
        title="Scanning Tasks"
      />
    </>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 12,
      paddingBottom: 20,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.foreground,
      letterSpacing: -0.4,
      includeFontPadding: false,
    },
    hero: { alignItems: "center", paddingVertical: 20, marginBottom: 8 },
    heroIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: isDark ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.1)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(99, 102, 241, 0.3)" : "rgba(99, 102, 241, 0.2)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    heroTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.foreground,
      marginBottom: 8,
      textAlign: "center",
      letterSpacing: -0.4,
      includeFontPadding: false,
    },
    heroSub: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 20,
      maxWidth: 310,
      includeFontPadding: false,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 12,
      includeFontPadding: false,
    },
    cards: { gap: 10, marginBottom: 20 },
    previewCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.08)",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? "rgba(99, 102, 241, 0.3)" : "rgba(99, 102, 241, 0.2)",
      padding: 12,
      marginBottom: 12,
      gap: 12,
    },
    previewLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    previewThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: isDark ? colors.muted : "#E4E4E7" },
    previewFileIcon: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: isDark ? colors.muted : "#E4E4E7",
      alignItems: "center",
      justifyContent: "center",
    },
    previewText: { flex: 1 },
    previewName: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.foreground,
      marginBottom: 2,
      includeFontPadding: false,
    },
    previewType: {
      fontSize: 11,
      color: "#6366F1",
      fontWeight: "600",
      includeFontPadding: false,
    },
    previewRemove: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: isDark ? colors.muted : "#E4E4E7",
      alignItems: "center",
      justifyContent: "center",
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "rgba(239, 68, 68, 0.12)" : "#FEF2F2",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "#FCA5A5",
      padding: 14,
      marginBottom: 12,
      gap: 10,
    },
    errorText: {
      fontSize: 13,
      color: "#EF4444",
      lineHeight: 18,
      includeFontPadding: false,
    },
    retryBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    retryBtnText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#EF4444",
      includeFontPadding: false,
    },
    offlineBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "#FFFBEB",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? "rgba(245, 158, 11, 0.3)" : "#FDE68A",
      padding: 14,
      marginBottom: 12,
      gap: 12,
    },
    offlineBannerTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: "#F59E0B",
      marginBottom: 2,
      includeFontPadding: false,
    },
    offlineBannerSub: {
      fontSize: 12,
      color: colors.mutedForeground,
      lineHeight: 16,
      includeFontPadding: false,
    },
    tipBanner: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    tipText: {
      fontSize: 12,
      color: colors.mutedForeground,
      lineHeight: 18,
      includeFontPadding: false,
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === "android" ? 20 : 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    ctaBtn: {
      backgroundColor: "#6366F1",
      borderRadius: 14,
      height: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    ctaBtnDisabled: {
      backgroundColor: isDark ? colors.muted : "#E4E4E7",
    },
    ctaText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#ffffff",
      includeFontPadding: false,
    },
    ctaTextDisabled: {
      color: colors.mutedForeground,
      includeFontPadding: false,
    },
  });
}
