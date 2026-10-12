import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  Modal,
  Text,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  ChevronLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Square,
  Trash2,
  ScanLine,
  Sparkles,
  X,
  Check,
  Plus,
} from "lucide-react-native";
import { ScanAnotherSheet } from "@/src/components/schedule/ScanAnotherSheet";
import { AILoadingOverlay, TASK_STAGES } from "@/src/components/schedule/AILoadingOverlay";
import { useSubjects, SubjectRow } from "@/src/hooks/useSubjects";
import { useTaskScanner, ParsedScannedTask } from "@/src/hooks/useTaskScanner";
import {
  formatDateTimePHT,
  toPhilippineISO,
} from "@/src/utils/philippineTime";
import { usePowerSync } from "@powersync/react";
import { useAuthStore } from "@/src/features/auth/auth.store";
import { NotificationService } from "@/src/services/notificationService";
import { useTheme } from "@/src/theme/useTheme";
import type { ThemeColors } from "@/src/theme/tokens";

export default function TaskConfirmScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const { payload } = useLocalSearchParams<{ payload?: string }>();
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);
  const { subjects } = useSubjects();
  const scanner = useTaskScanner();

  // Parse initial tasks from navigation payload
  const initialTasks: ParsedScannedTask[] = useMemo(() => {
    try {
      if (!payload) return [];
      const parsed = JSON.parse(payload);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [payload]);

  const [tasks, setTasks] = useState<ParsedScannedTask[]>(initialTasks);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [showScanSheet, setShowScanSheet] = useState(false);

  // Subject selector modal state
  const [activeSubjectTaskId, setActiveSubjectTaskId] = useState<string | null>(null);

  // Date picker state
  const [activeDateTaskId, setActiveDateTaskId] = useState<string | null>(null);
  const [pendingDate, setPendingDate] = useState<Date>(new Date());
  const [datePickerStep, setDatePickerStep] = useState<"date" | "time" | null>(null);

  // ── Derived selection state ──────────────────────────────────────────────────
  const totalCount = tasks.length;
  const selectedCount = useMemo(() => tasks.filter((t) => t.selected).length, [tasks]);
  const isAllSelected = totalCount > 0 && selectedCount === totalCount;

  const handleToggleSelectAll = () => {
    const nextVal = !isAllSelected;
    setTasks((prev) => prev.map((t) => ({ ...t, selected: nextVal })));
  };

  const handleToggleSelect = (tempId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.tempId === tempId ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleUpdateTitle = (tempId: string, title: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.tempId === tempId ? { ...t, title } : t))
    );
  };

  const handleUpdateDescription = (tempId: string, description: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.tempId === tempId ? { ...t, description } : t))
    );
  };

  const handleDeleteTask = (tempId: string) => {
    setTasks((prev) => prev.filter((t) => t.tempId !== tempId));
  };

  // ── Subject assignment ───────────────────────────────────────────────────────
  const handleAssignSubject = (subjectId: string | null) => {
    if (!activeSubjectTaskId) return;
    const matched = subjects.find((s) => s.id === subjectId);
    setTasks((prev) =>
      prev.map((t) =>
        t.tempId === activeSubjectTaskId
          ? {
              ...t,
              subjectId: subjectId,
              subjectName: matched ? matched.name : null,
            }
          : t
      )
    );
    setActiveSubjectTaskId(null);
  };

  // ── Date selection handlers ──────────────────────────────────────────────────
  const handleOpenDatePicker = (task: ParsedScannedTask) => {
    setActiveDateTaskId(task.tempId);
    const initial = task.dueDate ? new Date(task.dueDate) : new Date();
    setPendingDate(initial);

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: initial,
        mode: "date",
        minimumDate: new Date(),
        is24Hour: false,
        onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type === "dismissed" || !selectedDate) {
            setActiveDateTaskId(null);
            return;
          }
          const merged = new Date(selectedDate);
          merged.setHours(initial.getHours(), initial.getMinutes(), 0, 0);

          DateTimePickerAndroid.open({
            value: merged,
            mode: "time",
            is24Hour: false,
            onChange: (timeEvent: DateTimePickerEvent, selectedTime?: Date) => {
              if (timeEvent.type === "dismissed" || !selectedTime) {
                const iso = toPhilippineISO(merged);
                setTasks((prev) =>
                  prev.map((t) =>
                    t.tempId === task.tempId ? { ...t, dueDate: iso } : t
                  )
                );
                setActiveDateTaskId(null);
                return;
              }
              const finalDate = new Date(merged);
              finalDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
              const iso = toPhilippineISO(finalDate);
              setTasks((prev) =>
                prev.map((t) =>
                  t.tempId === task.tempId ? { ...t, dueDate: iso } : t
                )
              );
              setActiveDateTaskId(null);
            },
          });
        },
      });
    } else {
      setDatePickerStep("date");
    }
  };

  const handleClearDueDate = (tempId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.tempId === tempId ? { ...t, dueDate: null } : t))
    );
  };

  const handleIOSDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) {
      setPendingDate(selected);
    }
  };

  const handleIOSDateDone = () => {
    if (activeDateTaskId) {
      const iso = toPhilippineISO(pendingDate);
      setTasks((prev) =>
        prev.map((t) =>
          t.tempId === activeDateTaskId ? { ...t, dueDate: iso } : t
        )
      );
    }
    setActiveDateTaskId(null);
    setDatePickerStep(null);
  };

  // ── Scan another file ────────────────────────────────────────────────────────
  const handleScanAnother = async () => {
    const newTasks = await scanner.uploadAndScan(subjects);
    if (!newTasks) return;
    setTasks((prev) => [...prev, ...newTasks]);
    scanner.clearFile();
    setShowScanSheet(false);
  };

  // ── Confirm & save to database ───────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!userId) return;
    const tasksToImport = tasks.filter((t) => t.selected);
    if (tasksToImport.length === 0) return;

    setIsSaving(true);
    try {
      const now = toPhilippineISO(new Date());

      for (const t of tasksToImport) {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const dueDateIso = t.dueDate || null;
        const matchedSub = subjects.find((s) => s.id === t.subjectId);
        const color = matchedSub?.color ?? colors.primary;

        await powerSync.execute(
          `INSERT INTO Task (id, title, description, dueDate, completed, color, subtasks, subjectId, userId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, 0, ?, '[]', ?, ?, ?, ?)`,
          [
            id,
            t.title.trim() || "Untitled Task",
            t.description ? t.description.trim() : null,
            dueDateIso,
            color,
            t.subjectId || null,
            userId,
            now,
            now,
          ]
        );

        if (dueDateIso) {
          NotificationService.scheduleTaskReminders({
            id,
            title: t.title.trim() || "Untitled Task",
            description: t.description ? t.description.trim() : null,
            due_date: dueDateIso,
            completed: 0,
            color,
            subtasks: "[]",
            subject_id: t.subjectId || null,
            user_id: userId,
            created_at: now,
            updated_at: now,
            subject_name: matchedSub?.name ?? null,
            subject_color: matchedSub?.color ?? null,
          }).catch((err) =>
            console.warn("[TaskConfirm] scheduleTaskReminders error:", err)
          );
        }
      }

      setSavedCount(tasksToImport.length);
      setShowSuccess(true);
    } catch (err) {
      console.error("[TaskConfirm] Batch import failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeTaskForSubject = useMemo(
    () => tasks.find((t) => t.tempId === activeSubjectTaskId),
    [tasks, activeSubjectTaskId]
  );

  return (
    <>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.replace("/(app)/tasks")}
            hitSlop={8}
          >
            <ChevronLeft size={20} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>Review Scanned Tasks</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {totalCount === 0
                ? "No tasks detected."
                : totalCount === 1
                ? "1 task detected — review and add to list"
                : `${totalCount} tasks detected — review and add to list`}
            </Text>
          </View>
        </View>

        {/* Selection Bar */}
        {totalCount > 0 && (
          <View style={styles.bulkActionBar}>
            <Pressable
              style={styles.selectAllBtn}
              onPress={handleToggleSelectAll}
              hitSlop={8}
            >
              {isAllSelected ? (
                <CheckSquare size={18} color="#6366F1" />
              ) : (
                <Square size={18} color={colors.mutedForeground} />
              )}
              <Text style={styles.selectAllText}>
                {isAllSelected ? "Deselect All" : "Select All"}
              </Text>
            </Pressable>

            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {selectedCount} of {totalCount} selected
              </Text>
            </View>
          </View>
        )}

        {/* Content list */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {totalCount === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Sparkles size={28} color="#6366F1" />
              </View>
              <Text style={styles.emptyTitle}>No Tasks In Review</Text>
              <Text style={styles.emptySub}>
                All parsed tasks were removed or none were detected in the uploaded file.
              </Text>
              <Pressable
                style={styles.emptyScanBtn}
                onPress={() => setShowScanSheet(true)}
              >
                <ScanLine size={16} color="#6366F1" />
                <Text style={styles.emptyScanBtnText}>Scan Another File</Text>
              </Pressable>
            </View>
          ) : (
            tasks.map((task) => {
              const matchedSubject = subjects.find((s) => s.id === task.subjectId);
              const subjectColor = matchedSubject?.color ?? colors.primary;

              return (
                <View
                  key={task.tempId}
                  style={[
                    styles.taskCard,
                    task.selected && styles.taskCardSelected,
                  ]}
                >
                  <View style={styles.taskCardHeader}>
                    {/* Checkbox */}
                    <Pressable
                      style={styles.checkboxTouch}
                      onPress={() => handleToggleSelect(task.tempId)}
                      hitSlop={8}
                    >
                      {task.selected ? (
                        <CheckSquare size={20} color="#6366F1" />
                      ) : (
                        <Square size={20} color={isDark ? "#3F3F46" : "#D4D4D8"} />
                      )}
                    </Pressable>

                    {/* Task Title Input */}
                    <View style={styles.titleWrap}>
                      <TextInput
                        style={styles.titleInput}
                        value={task.title}
                        onChangeText={(txt) => handleUpdateTitle(task.tempId, txt)}
                        placeholder="Task title"
                        placeholderTextColor={colors.mutedForeground}
                        multiline
                        scrollEnabled={false}
                        textAlignVertical="top"
                        selectionColor="#6366F1"
                      />
                    </View>

                    {/* Delete Task Button */}
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteTask(task.tempId)}
                      hitSlop={8}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </Pressable>
                  </View>

                  {/* Task Description Input */}
                  <View style={styles.descWrap}>
                    <TextInput
                      style={styles.descInput}
                      value={task.description ?? ""}
                      onChangeText={(txt) => handleUpdateDescription(task.tempId, txt)}
                      placeholder="Add details or instructions (optional)..."
                      placeholderTextColor={colors.mutedForeground}
                      multiline
                      scrollEnabled={false}
                      textAlignVertical="top"
                      selectionColor="#6366F1"
                    />
                  </View>

                  {/* Meta Pills: Due Date & Subject */}
                  <View style={styles.metaRow}>
                    {/* Due Date Pill */}
                    <View style={styles.metaPillGroup}>
                      <Pressable
                        style={[
                          styles.metaPill,
                          task.dueDate ? styles.metaPillActive : null,
                        ]}
                        onPress={() => handleOpenDatePicker(task)}
                      >
                        <Calendar
                          size={13}
                          color={task.dueDate ? "#6366F1" : colors.mutedForeground}
                          style={{ flexShrink: 0 }}
                        />
                        <Text
                          style={[
                            styles.metaPillText,
                            task.dueDate ? styles.metaPillTextActive : null,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {task.dueDate
                            ? formatDateTimePHT(task.dueDate)
                            : "+ Set Due Date"}
                        </Text>
                      </Pressable>

                      {task.dueDate && (
                        <Pressable
                          style={styles.clearDateBtn}
                          onPress={() => handleClearDueDate(task.tempId)}
                          hitSlop={6}
                        >
                          <X size={12} color="#EF4444" />
                        </Pressable>
                      )}
                    </View>

                    {/* Subject Pill */}
                    <Pressable
                      style={[
                        styles.metaPill,
                        matchedSubject && {
                          backgroundColor: isDark
                            ? `${subjectColor}20`
                            : `${subjectColor}14`,
                          borderColor: isDark
                            ? `${subjectColor}40`
                            : `${subjectColor}30`,
                        },
                      ]}
                      onPress={() => setActiveSubjectTaskId(task.tempId)}
                    >
                      <BookOpen size={13} color={subjectColor} style={{ flexShrink: 0 }} />
                      <Text
                        style={[
                          styles.metaPillText,
                          { color: matchedSubject ? subjectColor : colors.foreground },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {matchedSubject?.name ?? task.subjectName ?? "Assign Subject"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Pressable
            style={[
              styles.confirmBtn,
              (selectedCount === 0 || isSaving) && styles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={selectedCount === 0 || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
            ) : (
              <CheckCircle2
                size={18}
                color={selectedCount === 0 ? colors.mutedForeground : "#ffffff"}
                style={{ marginRight: 8 }}
              />
            )}
            <Text
              style={[
                styles.confirmText,
                (selectedCount === 0 || isSaving) && styles.confirmTextDisabled,
              ]}
            >
              {isSaving
                ? "Adding Tasks..."
                : selectedCount > 0
                ? `Add ${selectedCount} Task${selectedCount !== 1 ? "s" : ""} to List`
                : "Select Tasks to Add"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.scanAnotherBtn}
            onPress={() => setShowScanSheet(true)}
          >
            <ScanLine size={16} color="#6366F1" />
            <Text style={styles.scanAnotherText}>Scan Another File</Text>
          </Pressable>

          <Pressable
            style={styles.cancelBtn}
            onPress={() => router.replace("/(app)/tasks")}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Subject Picker Modal */}
      <Modal
        visible={activeSubjectTaskId !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSubjectTaskId(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setActiveSubjectTaskId(null)}
        />
        <View style={styles.subjectSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.sheetTitle} numberOfLines={1}>Assign Subject</Text>
              <Text style={styles.sheetSub} numberOfLines={1}>Link this task to an enrolled subject</Text>
            </View>
            <Pressable
              style={styles.sheetCloseBtn}
              onPress={() => setActiveSubjectTaskId(null)}
              hitSlop={8}
            >
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {activeTaskForSubject?.subjectName && (
            <View style={styles.detectedSubjectCard}>
              <View style={styles.detectedSubjectIcon}>
                <Sparkles size={14} color="#6366F1" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.detectedSubjectLabel}>Detected from document</Text>
                <Text style={styles.detectedSubjectName} numberOfLines={1} ellipsizeMode="tail">
                  {activeTaskForSubject.subjectName}
                </Text>
              </View>
            </View>
          )}

          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {/* Option: No Subject */}
            <Pressable
              style={[
                styles.subjectOption,
                activeTaskForSubject && !activeTaskForSubject.subjectId && styles.subjectOptionActive,
              ]}
              onPress={() => handleAssignSubject(null)}
            >
              <View style={styles.subjectOptionLeft}>
                <View style={[styles.subjectDot, { backgroundColor: colors.mutedForeground }]} />
                <Text style={styles.subjectOptionName} numberOfLines={1} ellipsizeMode="tail">
                  No Subject
                </Text>
              </View>
              {activeTaskForSubject && !activeTaskForSubject.subjectId && (
                <Check size={16} color="#6366F1" style={{ flexShrink: 0 }} />
              )}
            </Pressable>

            {/* List of user subjects */}
            {subjects.map((sub) => {
              const isSelected = activeTaskForSubject?.subjectId === sub.id;
              return (
                <Pressable
                  key={sub.id}
                  style={[
                    styles.subjectOption,
                    isSelected && styles.subjectOptionActive,
                  ]}
                  onPress={() => handleAssignSubject(sub.id)}
                >
                  <View style={styles.subjectOptionLeft}>
                    <View
                      style={[
                        styles.subjectDot,
                        { backgroundColor: sub.color || colors.primary },
                      ]}
                    />
                    <Text style={styles.subjectOptionName} numberOfLines={1} ellipsizeMode="tail">
                      {sub.name}
                    </Text>
                  </View>
                  {isSelected && <Check size={16} color="#6366F1" style={{ flexShrink: 0 }} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* iOS Date Picker Modal */}
      {Platform.OS === "ios" && datePickerStep !== null && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.iosPickerOverlay}>
            <View style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
                <Text style={styles.iosPickerHeaderTitle}>Select Due Date & Time</Text>
                <Pressable onPress={handleIOSDateDone} hitSlop={8}>
                  <Text style={styles.iosPickerDoneText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={pendingDate}
                mode="datetime"
                minimumDate={new Date()}
                display="spinner"
                onChange={handleIOSDateChange}
                textColor={colors.foreground}
                themeVariant={isDark ? "dark" : "light"}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Scan another sheet */}
      <ScanAnotherSheet
        visible={showScanSheet}
        isLoading={scanner.isLoading}
        error={scanner.error}
        selectedFile={scanner.selectedFile}
        onPickDocument={scanner.pickDocument}
        onPickGallery={scanner.pickFromGallery}
        onPickCamera={scanner.pickFromCamera}
        onClearFile={scanner.clearFile}
        onScan={handleScanAnother}
        onClose={() => {
          scanner.clearFile();
          scanner.clearError();
          setShowScanSheet(false);
        }}
      />

      {/* AI loading overlay for scan-another */}
      <AILoadingOverlay
        visible={scanner.isLoading}
        onCancel={scanner.cancelUpload}
        stages={TASK_STAGES}
        title="Scanning Tasks"
      />

      {/* Success Modal */}
      <Modal visible={showSuccess} animationType="fade" transparent>
        <View
          style={[
            styles.successBackdrop,
            { backgroundColor: isDark ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.5)" },
          ]}
        >
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <CheckCircle2 size={40} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Tasks Added</Text>
            <Text style={styles.successSub}>
              {savedCount} task{savedCount !== 1 ? "s have" : " has"} been added to your task list.
            </Text>
            <Pressable
              style={styles.successBtn}
              onPress={() => {
                setShowSuccess(false);
                router.replace("/(app)/tasks");
              }}
            >
              <Text style={styles.successBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 14,
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
      flexShrink: 0,
    },
    headerTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      letterSpacing: -0.4,
      color: colors.foreground,
      includeFontPadding: false,
    },
    headerSub: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
      includeFontPadding: false,
    },
    bulkActionBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)",
    },
    selectAllBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    selectAllText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.foreground,
      includeFontPadding: false,
      flexShrink: 0,
    },
    countBadge: {
      backgroundColor: isDark ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.1)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      flexShrink: 0,
    },
    countBadgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#6366F1",
      includeFontPadding: false,
      flexShrink: 0,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 24,
      gap: 12,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: "center",
      marginTop: 24,
    },
    emptyIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: isDark ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.1)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.foreground,
      marginBottom: 6,
      includeFontPadding: false,
    },
    emptySub: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: 16,
      includeFontPadding: false,
    },
    emptyScanBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: isDark ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.1)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(99, 102, 241, 0.3)" : "rgba(99, 102, 241, 0.2)",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
    },
    emptyScanBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#6366F1",
      includeFontPadding: false,
      flexShrink: 0,
    },
    taskCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    taskCardSelected: {
      borderColor: isDark ? "rgba(99, 102, 241, 0.45)" : "rgba(99, 102, 241, 0.35)",
      backgroundColor: isDark ? "rgba(99, 102, 241, 0.04)" : "rgba(99, 102, 241, 0.02)",
    },
    taskCardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    checkboxTouch: {
      flexShrink: 0,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 4,
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
    },
    titleInput: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.foreground,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
      includeFontPadding: false,
      lineHeight: 20,
    },
    deleteBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.08)",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginTop: 2,
    },
    descWrap: {
      marginTop: 8,
      marginLeft: 30,
      minWidth: 0,
    },
    descInput: {
      fontSize: 13,
      color: colors.foreground,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.015)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)",
      minHeight: 36,
      includeFontPadding: false,
      lineHeight: 18,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
      marginLeft: 30,
    },
    metaPillGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      maxWidth: "100%",
      flexShrink: 1,
    },
    metaPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: "100%",
      flexShrink: 1,
    },
    metaPillActive: {
      backgroundColor: isDark ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.1)",
      borderColor: isDark ? "rgba(99, 102, 241, 0.35)" : "rgba(99, 102, 241, 0.25)",
    },
    metaPillText: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.mutedForeground,
      includeFontPadding: false,
      flexShrink: 1,
    },
    metaPillTextActive: {
      color: "#6366F1",
      fontWeight: "600",
    },
    clearDateBtn: {
      padding: 4,
      borderRadius: 6,
      backgroundColor: isDark ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.08)",
      flexShrink: 0,
    },
    footer: {
      flexDirection: "column",
      gap: 10,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === "android" ? 20 : 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    confirmBtn: {
      backgroundColor: "#6366F1",
      borderRadius: 14,
      height: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    confirmBtnDisabled: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    confirmText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#ffffff",
      includeFontPadding: false,
      flexShrink: 0,
    },
    confirmTextDisabled: {
      color: colors.mutedForeground,
    },
    scanAnotherBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.08)",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? "rgba(99, 102, 241, 0.3)" : "rgba(99, 102, 241, 0.2)",
      height: 48,
    },
    scanAnotherText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#6366F1",
      includeFontPadding: false,
      flexShrink: 0,
    },
    cancelBtn: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.mutedForeground,
      includeFontPadding: false,
      flexShrink: 0,
    },
    // Subject Sheet
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    subjectSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === "android" ? 24 : 36,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginTop: 10,
      marginBottom: 16,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.foreground,
      includeFontPadding: false,
    },
    sheetSub: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
      includeFontPadding: false,
    },
    detectedSubjectCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 10,
      borderRadius: 10,
      backgroundColor: isDark ? "rgba(99, 102, 241, 0.1)" : "rgba(99, 102, 241, 0.06)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.15)",
      marginBottom: 12,
    },
    detectedSubjectIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: isDark ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.12)",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    detectedSubjectLabel: {
      fontSize: 11,
      color: "#6366F1",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      includeFontPadding: false,
    },
    detectedSubjectName: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.foreground,
      includeFontPadding: false,
      marginTop: 1,
    },
    sheetCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
      flexShrink: 0,
    },
    subjectOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 6,
    },
    subjectOptionActive: {
      backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.08)",
    },
    subjectOptionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
      minWidth: 0,
      marginRight: 8,
    },
    subjectDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      flexShrink: 0,
    },
    subjectOptionName: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.foreground,
      includeFontPadding: false,
      flex: 1,
    },
    // iOS Picker Modal
    iosPickerOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    iosPickerContainer: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 24,
    },
    iosPickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iosPickerHeaderTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.foreground,
      includeFontPadding: false,
    },
    iosPickerDoneText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#6366F1",
      includeFontPadding: false,
    },
    // Success Modal
    successBackdrop: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    successCard: {
      backgroundColor: colors.card,
      padding: 24,
      borderRadius: 20,
      width: "100%",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    successIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    successTitle: {
      fontSize: 19,
      fontWeight: "700",
      letterSpacing: -0.4,
      color: colors.foreground,
      marginBottom: 8,
      includeFontPadding: false,
    },
    successSub: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 19,
      includeFontPadding: false,
    },
    successBtn: {
      width: "100%",
      backgroundColor: "#6366F1",
      height: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    successBtnText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 14,
      includeFontPadding: false,
    },
  });
}
