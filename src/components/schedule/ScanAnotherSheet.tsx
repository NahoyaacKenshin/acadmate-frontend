/**
 * ScanAnotherSheet
 *
 * A bottom-sheet modal that lets the user pick another file to scan from the
 * review screen. Passes the current parsed schedule to the backend so Gemini
 * can intelligently merge the new document with the existing items.
 */

import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/src/components/ui/text";
import { FileText, Image as ImageIcon, Camera, X, ScanLine } from "lucide-react-native";
import type { ParsedScheduleResult, SelectedFile } from "@/src/hooks/useScheduleScanner";

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
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ScanLine size={18} color="#8B5CF6" />
            <Text style={styles.title}>Scan Another File</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <X size={18} color="#64748B" />
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          AcadMate AI will read the new file and intelligently update your schedule with any changes or additions found.
        </Text>

        {/* Picker Options */}
        <View style={styles.options}>
          <Pressable style={styles.option} onPress={onPickDocument}>
            <View style={[styles.optionIcon, { backgroundColor: "rgba(108,142,255,0.12)" }]}>
              <FileText size={20} color="#6C8EFF" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>PDF or Word Document</Text>
              <Text style={styles.optionSub}>Attach a .pdf or .docx file</Text>
            </View>
          </Pressable>

          <Pressable style={styles.option} onPress={onPickGallery}>
            <View style={[styles.optionIcon, { backgroundColor: "rgba(16,185,129,0.12)" }]}>
              <ImageIcon size={20} color="#10B981" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Image from Gallery</Text>
              <Text style={styles.optionSub}>Pick a photo from your library</Text>
            </View>
          </Pressable>

          <Pressable style={styles.option} onPress={onPickCamera}>
            <View style={[styles.optionIcon, { backgroundColor: "rgba(139,92,246,0.12)" }]}>
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
                  <FileText size={18} color="#6C8EFF" />
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
              <X size={14} color="#64748B" />
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

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: "#161A26",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: "#2A3143",
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#2A3143", alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  closeBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#1A1F2E", alignItems: "center", justifyContent: "center" },
  subtitle: { fontSize: 13, color: "#64748B", lineHeight: 18, marginBottom: 20 },
  options: { gap: 10, marginBottom: 16 },
  option: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#1A1F2E", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#2A3143" },
  optionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 14, fontWeight: "600", color: "#ffffff", marginBottom: 2 },
  optionSub: { fontSize: 12, color: "#64748B" },
  previewCard: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(139,92,246,0.08)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(139,92,246,0.25)", padding: 12, marginBottom: 12, gap: 12 },
  previewLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  previewThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: "#1A1F2E" },
  previewFileIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#1A1F2E", alignItems: "center", justifyContent: "center" },
  previewName: { fontSize: 13, fontWeight: "600", color: "#ffffff", marginBottom: 2 },
  previewType: { fontSize: 11, color: "#8B5CF6" },
  previewRemove: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#1A1F2E", alignItems: "center", justifyContent: "center" },
  errorBanner: { backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "rgba(239,68,68,0.3)" },
  errorText: { fontSize: 13, color: "#EF4444" },
  scanBtn: { backgroundColor: "#8B5CF6", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 4 },
  scanBtnDisabled: { backgroundColor: "#1A1F2E", borderWidth: 1, borderColor: "#2A3143" },
  scanBtnText: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  scanBtnTextDisabled: { color: "#64748B" },
});
