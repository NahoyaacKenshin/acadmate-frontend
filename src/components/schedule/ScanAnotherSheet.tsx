/**
 * ScanAnotherSheet
 *
 * A bottom-sheet modal that lets the user pick another file to scan from the
 * review screen. Passes the current parsed schedule to the backend so Gemini
 * can intelligently merge the new document with the existing items.
 */

import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
  Text,
} from "react-native";
import { FileText, Image as ImageIcon, Camera, X, ScanLine } from "lucide-react-native";
import type { SelectedFile } from "@/src/hooks/useScheduleScanner";
import { useTheme } from "@/src/theme/useTheme";
import type { ThemeColors } from "@/src/theme/tokens";

interface ScanAnotherSheetProps {
  visible: boolean;
  selectedFile: SelectedFile | null;
  isLoading: boolean;
  error: string | null;
  onPickDocument: () => void;
  onPickGallery: () => void;
  onPickCamera: () => void;
  onClearFile: () => void;
  onClose: () => void;
  onScan: () => void;
}

export function ScanAnotherSheet({
  visible,
  selectedFile,
  isLoading,
  error,
  onPickDocument,
  onPickGallery,
  onPickCamera,
  onClearFile,
  onClose,
  onScan,
}: ScanAnotherSheetProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ScanLine size={18} color="#6366F1" />
            <Text style={styles.title}>Scan Another File</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <X size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          AcadMate AI will read the new file and intelligently update your schedule with any changes or additions found.
        </Text>

        {/* Picker Options */}
        <View style={styles.options}>
          <Pressable style={styles.option} onPress={onPickDocument}>
            <View style={[styles.optionIcon, { backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)" }]}>
              <FileText size={20} color="#6366F1" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>PDF or Word Document</Text>
              <Text style={styles.optionSub}>Attach a .pdf or .docx file</Text>
            </View>
          </Pressable>

          <Pressable style={styles.option} onPress={onPickGallery}>
            <View style={[styles.optionIcon, { backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)" }]}>
              <ImageIcon size={20} color="#10B981" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Image from Gallery</Text>
              <Text style={styles.optionSub}>Pick a photo from your library</Text>
            </View>
          </Pressable>

          <Pressable style={styles.option} onPress={onPickCamera}>
            <View style={[styles.optionIcon, { backgroundColor: isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)" }]}>
              <Camera size={20} color="#8B5CF6" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Take a Photo</Text>
              <Text style={styles.optionSub}>Snap another page of your schedule</Text>
            </View>
          </Pressable>
        </View>

        {/* Selected File Preview */}
        {selectedFile && (
          <View style={styles.previewCard}>
            <View style={styles.previewLeft}>
              {selectedFile.type === "image" ? (
                <Image source={{ uri: selectedFile.thumbnail }} style={styles.previewThumb} />
              ) : (
                <View style={styles.previewFileIcon}>
                  <FileText size={18} color="#6366F1" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.previewName} numberOfLines={1}>{selectedFile.name}</Text>
                <Text style={styles.previewType}>
                  {selectedFile.mimeType.includes("pdf") ? "PDF Document" :
                    selectedFile.mimeType.includes("word") ? "Word Document" : "Image"}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClearFile} hitSlop={8} style={styles.previewRemove}>
              <X size={14} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Scan CTA */}
        <Pressable
          style={[styles.scanBtn, (!selectedFile || isLoading) && styles.scanBtnDisabled]}
          onPress={onScan}
          disabled={!selectedFile || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={[styles.scanBtnText, (!selectedFile || isLoading) && styles.scanBtnTextDisabled]}>
              {selectedFile ? "Scan & Merge  →" : "Select a file above"}
            </Text>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 36,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.foreground,
      includeFontPadding: false,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? colors.muted : "#E4E4E7",
      alignItems: "center",
      justifyContent: "center",
    },
    subtitle: {
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 18,
      marginBottom: 20,
      includeFontPadding: false,
    },
    options: { gap: 10, marginBottom: 16 },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: isDark ? colors.background : colors.muted,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    optionText: { flex: 1 },
    optionLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.foreground,
      marginBottom: 2,
      includeFontPadding: false,
    },
    optionSub: {
      fontSize: 12,
      color: colors.mutedForeground,
      includeFontPadding: false,
    },
    previewCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)",
      padding: 12,
      marginBottom: 12,
      gap: 12,
    },
    previewLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    previewThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: isDark ? colors.muted : "#E4E4E7" },
    previewFileIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: isDark ? colors.muted : "#E4E4E7",
      alignItems: "center",
      justifyContent: "center",
    },
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
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: isDark ? colors.muted : "#E4E4E7",
      alignItems: "center",
      justifyContent: "center",
    },
    errorBanner: {
      backgroundColor: isDark ? "rgba(239,68,68,0.12)" : "#FEF2F2",
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? "rgba(239,68,68,0.3)" : "#FCA5A5",
    },
    errorText: {
      fontSize: 13,
      color: "#EF4444",
      includeFontPadding: false,
    },
    scanBtn: {
      backgroundColor: "#6366F1",
      borderRadius: 14,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    scanBtnDisabled: {
      backgroundColor: isDark ? colors.muted : "#E4E4E7",
    },
    scanBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#ffffff",
      includeFontPadding: false,
    },
    scanBtnTextDisabled: {
      color: colors.mutedForeground,
      includeFontPadding: false,
    },
  });
}

