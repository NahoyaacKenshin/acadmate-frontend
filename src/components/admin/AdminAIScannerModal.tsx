import React, { useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Text } from "../ui/text";
import { Button } from "../ui/button";
import {
  Sparkles,
  FileText,
  Image as ImageIcon,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  Save,
  UploadCloud,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { usePowerSync } from "@powersync/react";
import { AdminApiService } from "@/src/services/admin.api";
import { useAuthStore } from "@/src/features/auth/auth.store";

export type AdminFeatureType =
  | "set-ab"
  | "program-mapping"
  | "exam-week"
  | "special-holidays"
  | "suspension";

interface AdminAIScannerModalProps {
  visible: boolean;
  feature: AdminFeatureType;
  onClose: () => void;
  onSuccess: () => void;
}

const FEATURE_CONFIG: Record<
  AdminFeatureType,
  { title: string; subtitle: string; scopeText: string; accentColor: string }
> = {
  "set-ab": {
    title: "Scan Set A/B Rules",
    subtitle: "Extract Saturday & recurring Set A/Set B F2F schedule rules",
    scopeText: "Tailored strictly to Set A/B schedule rules (ignores classes, holidays & exams)",
    accentColor: "#10B981",
  },
  "program-mapping": {
    title: "Scan Program Mappings",
    subtitle: "Extract degree program to Set A/B assignments",
    scopeText: "Tailored strictly to degree program assignments (ignores timetables & holidays)",
    accentColor: "#3B82F6",
  },
  "exam-week": {
    title: "Scan Exam Weeks",
    subtitle: "Extract global multi-day exam periods & schedule blocks",
    scopeText: "Tailored strictly to global exam weeks (ignores daily subject schedules)",
    accentColor: "#F59E0B",
  },
  "special-holidays": {
    title: "Scan Special Holidays",
    subtitle: "Extract official regular and special non-working holidays",
    scopeText: "Tailored strictly to official holidays (ignores class schedules & exam permit info)",
    accentColor: "#EF4444",
  },
  suspension: {
    title: "Scan Class Suspensions",
    subtitle: "Extract weather, emergency, or institutional class suspensions",
    scopeText: "Tailored strictly to class suspensions (ignores recurring timetables)",
    accentColor: "#EC4899",
  },
};

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function AdminAIScannerModal({
  visible,
  feature,
  onClose,
  onSuccess,
}: AdminAIScannerModalProps) {
  const config = FEATURE_CONFIG[feature] || FEATURE_CONFIG["set-ab"];
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);

  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);

  const resetState = () => {
    setSelectedFile(null);
    setIsScanning(false);
    setIsSaving(false);
    setError(null);
    setParsedData(null);
    setImportCount(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePickDocument = async () => {
    try {
      setError(null);
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "*/*"],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/pdf",
        });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to open document picker.");
    }
  };

  const handlePickGallery = async () => {
    try {
      setError(null);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Photo library access is required to pick an image.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.fileName || "scanned_image.jpg",
          type: asset.mimeType || "image/jpeg",
        });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to open photo gallery.");
    }
  };

  const handlePickCamera = async () => {
    try {
      setError(null);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Camera permission is required to snap a document photo.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: "camera_scan.jpg",
          type: asset.mimeType || "image/jpeg",
        });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to open camera.");
    }
  };

  const handleStartScan = async () => {
    if (!selectedFile) return;
    setIsScanning(true);
    setError(null);
    try {
      const res = await AdminApiService.parseAdminFeature(selectedFile, feature);
      if (res?.data) {
        setParsedData(res.data);
      } else {
        setError("No items detected for this feature scope.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to scan document with AI.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;
    setIsSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      let count = 0;

      if (feature === "set-ab" && parsedData.rules?.length) {
        for (const r of parsedData.rules) {
          const rule = {
            startDate: r.startDate,
            endDate: r.endDate ?? null,
            dayOfWeek: r.dayOfWeek,
            setType: r.setType as "A" | "B",
            label: r.label ?? null,
          };
          const apiRes = await AdminApiService.createSemesterRule(rule);
          const id = apiRes?.data?.id || generateId();
          await powerSync.execute(
            `INSERT OR REPLACE INTO SemesterRule (id, startDate, endDate, dayOfWeek, setType, label, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, rule.startDate, rule.endDate, rule.dayOfWeek, rule.setType, rule.label, now, now]
          );
          count++;
        }
      } else if (feature === "program-mapping" && parsedData.mappings?.length) {
        for (const m of parsedData.mappings) {
          const mapping = {
            programName: m.programName,
            studentSet: m.studentSet as "A" | "B",
          };
          const apiRes = await AdminApiService.createProgramMapping(mapping);
          const id = apiRes?.data?.id || generateId();
          await powerSync.execute(
            `INSERT OR REPLACE INTO ProgramMapping (id, programName, studentSet, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
            [id, mapping.programName, mapping.studentSet, now, now]
          );
          count++;
        }
      } else if (feature === "exam-week" && parsedData.examWeeks?.length) {
        for (const ex of parsedData.examWeeks) {
          const id = generateId();
          const startDate = ex.startDate ? ex.startDate.split("T")[0] : ex.startDate;
          const endDate = ex.endDate ? ex.endDate.split("T")[0] : ex.endDate;
          await powerSync.execute(
            `INSERT INTO ExamWeek (id, title, startDate, endDate, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, ex.title, startDate, endDate, now, now, userId ?? ""]
          );
          count++;
        }
      } else if (
        (feature === "special-holidays" || feature === "suspension") &&
        parsedData.holidays?.length
      ) {
        for (const h of parsedData.holidays) {
          const id = generateId();
          const date = h.date ? h.date.split("T")[0] : h.date;
          await powerSync.execute(
            `INSERT OR REPLACE INTO PhilippineHoliday (id, date, name, type) VALUES (?, ?, ?, ?)`,
            [id, date, h.name, h.type]
          );
          count++;
        }
      }

      setImportCount(count);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to save scanned data. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const resultItems = (): { title: string; sub: string }[] => {
    if (!parsedData) return [];
    if (feature === "set-ab" && parsedData.rules) {
      return parsedData.rules.map((r: any) => ({
        title: `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][r.dayOfWeek] ?? `Day ${r.dayOfWeek}`} — Set ${r.setType} F2F`,
        sub: `${r.startDate}${r.endDate ? ` to ${r.endDate}` : ""}${r.label ? ` (${r.label})` : ""}`,
      }));
    }
    if (feature === "program-mapping" && parsedData.mappings) {
      return parsedData.mappings.map((m: any) => ({
        title: m.programName,
        sub: `Assigned to Set ${m.studentSet}`,
      }));
    }
    if (feature === "exam-week" && parsedData.examWeeks) {
      return parsedData.examWeeks.map((ex: any) => ({
        title: ex.title,
        sub: `${ex.startDate?.split("T")[0] ?? ""} to ${ex.endDate?.split("T")[0] ?? ""}`,
      }));
    }
    if ((feature === "special-holidays" || feature === "suspension") && parsedData.holidays) {
      return parsedData.holidays.map((h: any) => ({
        title: h.name,
        sub: `${h.date?.split("T")[0] ?? ""} — ${h.type}`,
      }));
    }
    return [];
  };

  const items = resultItems();

  // ── UPLOAD PHASE ─────────────────────────────────────────────────────────────
  const renderUpload = () => (
    <View style={styles.uploadBody}>
      {/* Big interactive upload zone */}
      <Pressable
        style={[styles.dropzone, selectedFile ? { borderColor: config.accentColor, backgroundColor: `${config.accentColor}0D` } : null]}
        onPress={handlePickDocument}
      >
        <View style={[styles.dropzoneIconWrap, { backgroundColor: `${config.accentColor}20` }]}>
          <UploadCloud size={30} color={config.accentColor} />
        </View>
        <Text style={styles.dropzoneTitle}>
          {selectedFile ? "File selected — tap to change" : "Tap to upload a file"}
        </Text>
        <Text style={styles.dropzoneSub}>PDF, Word (.docx) or an image</Text>
      </Pressable>

      {/* Quick source pills */}
      <View style={styles.pickRow}>
        <Pressable style={styles.pickBtn} onPress={handlePickDocument}>
          <FileText size={16} color="#6C8EFF" />
          <Text style={styles.pickBtnText}>PDF / Word</Text>
        </Pressable>
        <Pressable style={styles.pickBtn} onPress={handlePickGallery}>
          <ImageIcon size={16} color="#10B981" />
          <Text style={styles.pickBtnText}>Gallery</Text>
        </Pressable>
        <Pressable style={styles.pickBtn} onPress={handlePickCamera}>
          <Camera size={16} color="#8B5CF6" />
          <Text style={styles.pickBtnText}>Camera</Text>
        </Pressable>
      </View>

      {/* Selected file card */}
      {selectedFile ? (
        <View style={[styles.fileCard, { borderColor: `${config.accentColor}50` }]}>
          <View style={[styles.fileIconWrap, { backgroundColor: `${config.accentColor}20` }]}>
            <FileText size={18} color={config.accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
            <Text style={styles.fileType}>{selectedFile.type || "Ready to scan"}</Text>
          </View>
          <Pressable style={styles.removeBtn} onPress={() => setSelectedFile(null)}>
            <X size={16} color="#94A3B8" />
          </Pressable>
        </View>
      ) : null}

      {/* Error */}
      {error ? (
        <View style={styles.errorBanner}>
          <AlertCircle size={15} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Scan button */}
      <Pressable
        style={[
          styles.scanBtn,
          { backgroundColor: config.accentColor },
          (!selectedFile || isScanning) && styles.scanBtnDisabled,
        ]}
        onPress={handleStartScan}
        disabled={!selectedFile || isScanning}
      >
        {isScanning ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <Sparkles size={16} color="#ffffff" />
            <Text style={styles.scanBtnText}>
              {selectedFile ? "Start AI Extraction" : "Select a File First"}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );

  // ── SUCCESS PHASE ─────────────────────────────────────────────────────────────
  const renderSuccess = () => (
    <View style={styles.successBody}>
      <CheckCircle2 size={52} color="#10B981" />
      <Text style={styles.successTitle}>Imported!</Text>
      <Text style={styles.successSub}>
        {importCount} item{importCount !== 1 ? "s" : ""} saved successfully.
      </Text>
      <Pressable
        style={[styles.scanBtn, { backgroundColor: config.accentColor, marginTop: 8 }]}
        onPress={handleClose}
      >
        <Text style={styles.scanBtnText}>Done</Text>
      </Pressable>
    </View>
  );

  // ── RESULTS PHASE ─────────────────────────────────────────────────────────────
  const renderResults = () => (
    <View style={styles.resultsWrapper}>
      <View style={styles.resultHeader}>
        <CheckCircle2 size={20} color="#10B981" />
        <Text style={styles.resultHeaderText}>AI Scan Complete</Text>
      </View>

      {items.length === 0 ? (
        <View style={[styles.errorBanner, { borderColor: "rgba(245,158,11,0.3)", backgroundColor: "rgba(245,158,11,0.1)" }]}>
          <AlertCircle size={15} color="#F59E0B" />
          <Text style={[styles.errorText, { color: "#F59E0B" }]}>
            No items found in this document for the selected feature scope.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.resultCount}>
            {items.length} item{items.length !== 1 ? "s" : ""} found — review before importing:
          </Text>
          <ScrollView style={styles.resultScroll} showsVerticalScrollIndicator={false}>
            {items.map((item, i) => (
              <View key={i} style={[styles.resultItem, { borderLeftColor: config.accentColor }]}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemSub}>{item.sub}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {error ? (
        <View style={styles.errorBanner}>
          <AlertCircle size={15} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.resultActions}>
        <Pressable style={styles.scanAgainBtn} onPress={resetState} disabled={isSaving}>
          <Text style={styles.scanAgainText}>Scan Again</Text>
        </Pressable>
        {items.length > 0 && (
          <Pressable
            style={[styles.importBtn, { backgroundColor: config.accentColor }, isSaving && styles.scanBtnDisabled]}
            onPress={handleImport}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Save size={15} color="#ffffff" />
                <Text style={styles.importBtnText}>Import All</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      {/* Dim overlay — tap to close */}
      <Pressable style={styles.overlay} onPress={handleClose} />

      {/* Bottom Sheet */}
      <View style={styles.sheet}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: `${config.accentColor}22` }]}>
            <Sparkles size={20} color={config.accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>{config.title}</Text>
            <Text style={styles.sheetSubtitle}>{config.subtitle}</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={12}>
            <X size={18} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Scope banner */}
        <View style={[styles.scopeBanner, { borderColor: `${config.accentColor}40` }]}>
          <Text style={[styles.scopeText, { color: config.accentColor }]}>
            🎯 {config.scopeText}
          </Text>
        </View>

        {/* Content area */}
        {!parsedData
          ? renderUpload()
          : importCount !== null
          ? renderSuccess()
          : renderResults()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Layout
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(10,12,20,0.75)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#161A26",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#2A3143",
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2A3143",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2A3143",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  sheetSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#1A1F2E",
    alignItems: "center",
    justifyContent: "center",
  },

  // Scope banner
  scopeBanner: {
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#10131C",
    borderWidth: 1,
  },
  scopeText: { fontSize: 12, fontWeight: "600", lineHeight: 17 },

  // ── Upload phase ───────────────────────────────────────
  uploadBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  dropzone: {
    backgroundColor: "#10131C",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#2A3143",
    borderStyle: "dashed",
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 6,
  },
  dropzoneIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  dropzoneTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  dropzoneSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  pickRow: { flexDirection: "row", gap: 10 },
  pickBtn: {
    flex: 1,
    backgroundColor: "#10131C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A3143",
    paddingVertical: 12,
    alignItems: "center",
    gap: 5,
  },
  pickBtnText: { fontSize: 11, fontWeight: "600", color: "#ffffff" },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#10131C",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A3143",
    padding: 12,
  },
  fileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
  fileType: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  removeBtn: { padding: 8 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    padding: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: "#EF4444", lineHeight: 18 },
  scanBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  scanBtnDisabled: { opacity: 0.4 },
  scanBtnText: { fontSize: 15, fontWeight: "700", color: "#ffffff" },

  // ── Success phase ───────────────────────────────────────
  successBody: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 8,
    gap: 10,
  },
  successTitle: { fontSize: 22, fontWeight: "800", color: "#ffffff" },
  successSub: { fontSize: 14, color: "#94A3B8", textAlign: "center" },

  // ── Results phase ───────────────────────────────────────
  resultsWrapper: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    maxHeight: 440,
  },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultHeaderText: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  resultCount: { fontSize: 13, color: "#94A3B8", fontWeight: "600" },
  resultScroll: { maxHeight: 200 },
  resultItem: {
    backgroundColor: "#10131C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A3143",
    borderLeftWidth: 3,
    padding: 12,
    gap: 3,
    marginBottom: 8,
  },
  itemTitle: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
  itemSub: { fontSize: 12, color: "#94A3B8" },
  resultActions: { flexDirection: "row", gap: 10 },
  scanAgainBtn: {
    flex: 1,
    height: 48,
    backgroundColor: "#10131C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A3143",
    alignItems: "center",
    justifyContent: "center",
  },
  scanAgainText: { fontSize: 13, fontWeight: "600", color: "#94A3B8" },
  importBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  importBtnText: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
});
