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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  BookOpen,
  CalendarDays,
  GraduationCap,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ScanLine,
  Sparkles,
  AlertCircle,
} from "lucide-react-native";
import {
  ClassScheduleRow,
  CalendarEventRow,
  ExamBlockerRow,
  ExamEventRow,
  ParsedSemesterInfo,
  ParsedClassSchedule,
  ParsedCalendarEvent,
  ParsedExamWeekBlocker,
  ParsedExamEvent,
} from "@/src/components/schedule/ParsedItemRow";
import {
  EditParsedClassSheet,
  EditParsedEventSheet,
  EditParsedExamSheet,
  EditParsedBlockerSheet,
} from "@/src/components/schedule/EditParsedSheets";
import { ScanAnotherSheet } from "@/src/components/schedule/ScanAnotherSheet";
import { AILoadingOverlay } from "@/src/components/schedule/AILoadingOverlay";
import { useSubjects } from "@/src/hooks/useSubjects";
import { useScheduleScanner } from "@/src/hooks/useScheduleScanner";
import { useExamWeeks, type ExamWeekRow as DbExamWeekRow } from "@/src/hooks/useExamWeeks";
import { toIsoDateString, toDateOnlyString } from "@/src/utils/scheduleUtils";
import { toPhilippineISO, toPhilippineDateOnly } from "@/src/utils/philippineTime";
import { usePowerSync } from "@powersync/react";
import { useAuthStore } from "@/src/features/auth/auth.store";
import { useTheme } from "@/src/theme/useTheme";
import type { ThemeColors } from "@/src/theme/tokens";

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveExamDate(
  dayOfWeek: number,
  examWeekId: string | null | undefined,
  examWeeks: DbExamWeekRow[]
): string | null {
  const candidates = examWeekId
    ? examWeeks.filter((ew) => ew.id === examWeekId)
    : examWeeks;

  for (const ew of candidates) {
    const start = new Date(ew.startDate);
    const end = new Date(ew.endDate);
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getDay() === dayOfWeek) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const d = String(cur.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
      cur.setDate(cur.getDate() + 1);
    }
  }
  return null;
}

function buildISODateTime(dateStr: string, timeStr?: string | null): string {
  return toPhilippineISO(dateStr, timeStr || "08:00");
}

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Accordion Section ─────────────────────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  accentColor: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function Section({
  icon,
  title,
  count,
  accentColor,
  children,
  defaultExpanded = true,
}: SectionProps) {
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View
      style={[
        secStyles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Pressable
        style={secStyles.header}
        onPress={() => setExpanded((v) => !v)}
        hitSlop={4}
      >
        <View style={secStyles.headerLeft}>
          <View
            style={[
              secStyles.iconWrap,
              { backgroundColor: isDark ? `${accentColor}20` : `${accentColor}14` },
            ]}
          >
            {icon}
          </View>
          <Text style={[secStyles.title, { color: colors.foreground }]}>{title}</Text>
          <View
            style={[
              secStyles.badge,
              { backgroundColor: isDark ? `${accentColor}26` : `${accentColor}18` },
            ]}
          >
            <Text style={[secStyles.badgeText, { color: accentColor }]}>{count}</Text>
          </View>
        </View>
        {expanded ? (
          <ChevronUp size={18} color={colors.mutedForeground} />
        ) : (
          <ChevronDown size={18} color={colors.mutedForeground} />
        )}
      </Pressable>

      {expanded && (
        <View style={[secStyles.body, { borderTopColor: colors.border }]}>
          {count === 0 ? (
            <Text style={[secStyles.emptyText, { color: colors.mutedForeground }]}>
              None detected in this document.
            </Text>
          ) : (
            children
          )}
        </View>
      )}
    </View>
  );
}

const secStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    includeFontPadding: false,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 12,
    textAlign: "center",
    includeFontPadding: false,
  },
});

// ── New Subject Modal ─────────────────────────────────────────────────────────

interface NewSubjectModalProps {
  visible: boolean;
  prefillName: string;
  onClose: () => void;
  onCreated: (id: string, name: string) => void;
}

function NewSubjectModal({
  visible,
  prefillName,
  onClose,
  onCreated,
}: NewSubjectModalProps) {
  const { colors, isDark } = useTheme();
  const [name, setName] = useState(prefillName);
  const [isLoading, setIsLoading] = useState(false);
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);

  React.useEffect(() => {
    setName(prefillName);
  }, [prefillName]);

  const handleCreate = async () => {
    if (!name.trim() || !userId) return;
    setIsLoading(true);
    try {
      const id = generateId();
      const now = new Date().toISOString();
      await powerSync.execute(
        `INSERT INTO Subject (id, name, color, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, name.trim(), null, userId, now, now]
      );
      onCreated(id, name.trim());
      onClose();
    } catch (err) {
      console.error("[NewSubjectModal] Failed to create subject:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={[
          nsStyles.backdrop,
          { backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.45)" },
        ]}
      >
        <View
          style={[
            nsStyles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[nsStyles.title, { color: colors.foreground }]}>Create New Subject</Text>
          <Text style={[nsStyles.sub, { color: colors.mutedForeground }]}>
            This subject was detected in your schedule but doesn't exist yet.
          </Text>
          <Text style={[nsStyles.label, { color: colors.mutedForeground }]}>Subject Name</Text>
          <TextInput
            style={[
              nsStyles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Mathematics 101"
            placeholderTextColor={colors.mutedForeground}
            autoFocus
          />
          <View style={nsStyles.btnRow}>
            <Pressable
              style={[
                nsStyles.cancelBtn,
                {
                  backgroundColor: isDark ? colors.background : "#F4F4F5",
                  borderColor: colors.border,
                },
              ]}
              onPress={onClose}
            >
              <Text style={[nsStyles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                nsStyles.createBtn,
                (!name.trim() || isLoading) && { opacity: 0.5 },
              ]}
              onPress={handleCreate}
              disabled={!name.trim() || isLoading}
            >
              <Text style={nsStyles.createText}>
                {isLoading ? "Creating..." : "Create Subject"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const nsStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginBottom: 6,
    includeFontPadding: false,
  },
  sub: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
    includeFontPadding: false,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    includeFontPadding: false,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    includeFontPadding: false,
  },
  createBtn: {
    flex: 2,
    backgroundColor: "#6366F1",
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  createText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    includeFontPadding: false,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ScheduleConfirmScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const params = useLocalSearchParams<{ payload?: string }>();
  const { subjects } = useSubjects();
  const powerSync = usePowerSync();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const [isSaving, setIsSaving] = useState(false);

  const { examWeeks: dbExamWeeks } = useExamWeeks();

  const initialData = useMemo(() => {
    if (!params.payload) {
      return {
        semesterInfo: null as ParsedSemesterInfo | null,
        classSchedules: [] as ParsedClassSchedule[],
        calendarEvents: [] as ParsedCalendarEvent[],
        examWeekBlockers: [] as ParsedExamWeekBlocker[],
        examEvents: [] as ParsedExamEvent[],
      };
    }
    try {
      const raw = JSON.parse(params.payload);
      const semesterInfo: ParsedSemesterInfo | null = raw.semesterInfo ?? null;
      const classSchedules: ParsedClassSchedule[] = raw.classSchedules ?? [];
      const calendarEvents: ParsedCalendarEvent[] = raw.calendarEvents ?? [];
      const examWeekBlockers: ParsedExamWeekBlocker[] = raw.examWeekBlockers ?? [];

      let examEvents: ParsedExamEvent[] = raw.examEvents ?? [];
      if (
        examEvents.length === 0 &&
        raw.examWeeks &&
        raw.examWeeks.length > 0 &&
        examWeekBlockers.length === 0
      ) {
        examEvents = raw.examWeeks.map((ew: any) => ({
          subjectName: null,
          title: ew.title,
          startDate: ew.startDate,
          endDate: ew.endDate,
          dayOfWeek: ew.dayOfWeek,
          startTime: ew.startTime,
          endTime: ew.endTime,
        }));
      }

      return {
        semesterInfo,
        classSchedules,
        calendarEvents,
        examWeekBlockers,
        examEvents,
      };
    } catch {
      return {
        semesterInfo: null,
        classSchedules: [],
        calendarEvents: [],
        examWeekBlockers: [],
        examEvents: [],
      };
    }
  }, [params.payload]);

  const [classes, setClasses] = useState<ParsedClassSchedule[]>(initialData.classSchedules);
  const [events, setEvents] = useState<ParsedCalendarEvent[]>(initialData.calendarEvents);
  const [examBlockers, setExamBlockers] = useState<ParsedExamWeekBlocker[]>(
    initialData.examWeekBlockers
  );
  const [examEvents, setExamEvents] = useState<ParsedExamEvent[]>(initialData.examEvents);

  const [universalStartDate, setUniversalStartDate] = useState<string>(
    initialData.semesterInfo?.startDate
      ? toDateOnlyString(initialData.semesterInfo.startDate) ?? ""
      : ""
  );
  const [universalEndDate, setUniversalEndDate] = useState<string>(
    initialData.semesterInfo?.endDate
      ? toDateOnlyString(initialData.semesterInfo.endDate) ?? ""
      : ""
  );

  React.useEffect(() => {
    if (!dbExamWeeks || dbExamWeeks.length === 0) return;
    setExamEvents((prev) =>
      prev.map((ex) => {
        if (ex.startDate) return ex;
        if (ex.dayOfWeek == null) return ex;
        const datePart = resolveExamDate(ex.dayOfWeek, null, dbExamWeeks);
        if (!datePart) return ex;
        const resolvedStart = buildISODateTime(datePart, ex.startTime);
        const resolvedEnd = buildISODateTime(datePart, ex.endTime ?? ex.startTime);
        return {
          ...ex,
          startDate: resolvedStart,
          endDate: resolvedEnd,
        };
      })
    );
  }, [dbExamWeeks]);

  const [resolvedSubjects, setResolvedSubjects] = useState<
    Record<string, { id: string }>
  >({});
  const [editingClassIndex, setEditingClassIndex] = useState<number | null>(null);
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);
  const [editingBlockerIndex, setEditingBlockerIndex] = useState<number | null>(null);
  const [editingExamIndex, setEditingExamIndex] = useState<number | null>(null);
  const [newSubjectFor, setNewSubjectFor] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showScanSheet, setShowScanSheet] = useState(false);

  const scanner = useScheduleScanner();

  const existingSubjectNames = useMemo(
    () => new Set(subjects.map((s) => s.name.toLowerCase())),
    [subjects]
  );
  const isNewSubject = (name: string) =>
    !existingSubjectNames.has(name.toLowerCase()) && !resolvedSubjects[name];

  const total = classes.length + events.length + examBlockers.length + examEvents.length;
  const isEmpty = total === 0;

  const handleSubjectCreated = (id: string, name: string) => {
    setResolvedSubjects((prev) => ({ ...prev, [name]: { id } }));
  };

  const handleScanAnother = async () => {
    const currentSchedule = JSON.stringify({
      semesterInfo: initialData.semesterInfo,
      classSchedules: classes,
      calendarEvents: events,
      examWeekBlockers: examBlockers,
      examEvents: examEvents,
    });
    const merged = await scanner.uploadAndParse(currentSchedule);
    if (!merged) return;
    setClasses(merged.classSchedules ?? []);
    setEvents(merged.calendarEvents ?? []);
    setExamBlockers(merged.examWeekBlockers ?? []);
    setExamEvents(merged.examEvents ?? []);
    if (merged.semesterInfo?.startDate && !universalStartDate) {
      setUniversalStartDate(toDateOnlyString(merged.semesterInfo.startDate) ?? "");
    }
    if (merged.semesterInfo?.endDate && !universalEndDate) {
      setUniversalEndDate(toDateOnlyString(merged.semesterInfo.endDate) ?? "");
    }
    scanner.clearFile();
    setShowScanSheet(false);
  };

  const handleConfirm = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      const resolvedClasses = classes.map((c) => ({
        ...c,
        resolvedSubjectId:
          resolvedSubjects[c.subjectName]?.id ??
          subjects.find((s) => s.name.toLowerCase() === c.subjectName.toLowerCase())?.id ??
          null,
      }));

      const now = new Date().toISOString();
      const queries = [];

      for (const c of resolvedClasses) {
        if (!c.resolvedSubjectId) continue;
        const id = generateId();
        const effectiveStartDate = toIsoDateString(universalStartDate.trim() || c.startDate, now);
        const effectiveEndDate =
          universalEndDate.trim() || c.endDate
            ? toIsoDateString(universalEndDate.trim() || c.endDate)
            : null;

        const normalizedSetType = c.setType === "BOTH" || !c.setType ? null : c.setType;
        const normalizedModality = c.modality === "HYBRID" ? "F2F" : c.modality ?? "F2F";
        const effectiveDays =
          c.daysOfWeek && c.daysOfWeek.length > 0 ? c.daysOfWeek : [c.dayOfWeek];
        queries.push(
          powerSync.execute(
            `INSERT INTO ClassSchedule (id, dayOfWeek, daysOfWeek, startTime, endTime, startDate, endDate, room, modality, setType, userId, subjectId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              effectiveDays[0] ?? c.dayOfWeek,
              JSON.stringify(effectiveDays),
              c.startTime,
              c.endTime,
              effectiveStartDate,
              effectiveEndDate,
              c.room ?? null,
              normalizedModality,
              normalizedSetType,
              userId,
              c.resolvedSubjectId,
              now,
              now,
            ]
          )
        );
      }

      for (const e of events) {
        const id = generateId();
        const validStartDate = toIsoDateString(e.startDate, now);
        const validEndDate = toIsoDateString(e.endDate, validStartDate);
        queries.push(
          powerSync.execute(
            `INSERT INTO CalendarEvent (id, title, description, startDate, endDate, allDay, location, color, userId, subjectId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              e.title,
              null,
              validStartDate,
              validEndDate,
              e.allDay ? 1 : 0,
              e.location ?? null,
              "#6366F1",
              userId,
              null,
              now,
              now,
            ]
          )
        );
      }

      for (const eb of examBlockers) {
        const id = generateId();
        const validStartDate = toPhilippineDateOnly(eb.startDate) || toPhilippineDateOnly(now);
        const validEndDate = toPhilippineDateOnly(eb.endDate) || validStartDate;
        queries.push(
          powerSync.execute(
            `INSERT INTO ExamWeek (id, title, startDate, endDate, userId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, eb.title, validStartDate, validEndDate, userId, now, now]
          )
        );
      }

      for (const ex of examEvents) {
        const id = generateId();
        const validStartDate = toIsoDateString(ex.startDate, now);
        const validEndDate = toIsoDateString(ex.endDate, validStartDate);
        const subjectMatch = ex.subjectName
          ? resolvedSubjects[ex.subjectName]?.id ??
            subjects.find((s) => s.name.toLowerCase() === ex.subjectName!.toLowerCase())?.id ??
            null
          : null;

        queries.push(
          powerSync.execute(
            `INSERT INTO CalendarEvent (id, title, description, startDate, endDate, allDay, location, color, userId, subjectId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              ex.title,
              "Subject Exam",
              validStartDate,
              validEndDate,
              0,
              ex.room ?? null,
              "#F59E0B",
              userId,
              subjectMatch,
              now,
              now,
            ]
          )
        );
      }

      await Promise.all(queries);
      setShowSuccess(true);
    } catch (err) {
      console.error("[ScheduleConfirm] Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.replace("/(app)/calendar")}
            hitSlop={8}
          >
            <ChevronLeft size={20} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Review Your Schedule</Text>
            <Text style={styles.headerSub}>
              {isEmpty
                ? "Nothing was detected."
                : `${total} item${total !== 1 ? "s" : ""} detected.`}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.universalCard}>
            <View style={styles.universalHeader}>
              <View style={styles.universalTitleRow}>
                <CalendarDays size={16} color="#6366F1" />
                <Text style={styles.universalTitle}>Universal Semester Dates</Text>
              </View>
            </View>
            {initialData.semesterInfo?.label ? (
              <View style={styles.detectedBadgeRow}>
                <View style={styles.detectedBadge}>
                  <Sparkles size={12} color="#6366F1" style={{ marginRight: 4 }} />
                  <Text style={styles.detectedBadgeText}>
                    {initialData.semesterInfo.label}
                  </Text>
                </View>
              </View>
            ) : null}
            <Text style={styles.universalSub}>
              These semester dates are applied automatically to all recurring classes. You can edit
              them here if needed.
            </Text>
            <View style={styles.universalInputsRow}>
              <View style={styles.universalInputGroup}>
                <Text style={styles.universalInputLabel}>Semester Start</Text>
                <TextInput
                  style={styles.universalInput}
                  value={universalStartDate}
                  onChangeText={setUniversalStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={styles.universalInputGroup}>
                <Text style={styles.universalInputLabel}>Semester End</Text>
                <TextInput
                  style={styles.universalInput}
                  value={universalEndDate}
                  onChangeText={setUniversalEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>
          </View>

          <Section
            icon={<BookOpen size={18} color="#10B981" />}
            title="Classes"
            count={classes.length}
            accentColor="#10B981"
          >
            {classes.map((item, i) => (
              <ClassScheduleRow
                key={`class-${i}`}
                item={item}
                isNewSubject={isNewSubject(item.subjectName)}
                onRemove={() => setClasses((prev) => prev.filter((_, idx) => idx !== i))}
                onCreateSubject={() => setNewSubjectFor(item.subjectName)}
                onEdit={() => setEditingClassIndex(i)}
              />
            ))}
          </Section>

          <Section
            icon={<CalendarDays size={18} color="#6366F1" />}
            title="Events & Holidays"
            count={events.length}
            accentColor="#6366F1"
          >
            {events.map((item, i) => (
              <CalendarEventRow
                key={`event-${i}`}
                item={item}
                onRemove={() => setEvents((prev) => prev.filter((_, idx) => idx !== i))}
                onEdit={() => setEditingEventIndex(i)}
              />
            ))}
          </Section>

          {examBlockers.length > 0 && (
            <Section
              icon={<GraduationCap size={18} color="#F59E0B" />}
              title="Exam Week Blockers"
              count={examBlockers.length}
              accentColor="#F59E0B"
            >
              {examBlockers.map((item, i) => (
                <ExamBlockerRow
                  key={`examblock-${i}`}
                  item={item}
                  onRemove={() => setExamBlockers((prev) => prev.filter((_, idx) => idx !== i))}
                  onEdit={() => setEditingBlockerIndex(i)}
                />
              ))}
            </Section>
          )}

          <Section
            icon={<GraduationCap size={18} color="#8B5CF6" />}
            title="Subject Exam Schedules"
            count={examEvents.length}
            accentColor="#8B5CF6"
          >
            {examEvents.map((item, i) => (
              <ExamEventRow
                key={`examevent-${i}`}
                item={item}
                onRemove={() => setExamEvents((prev) => prev.filter((_, idx) => idx !== i))}
                onEdit={() => setEditingExamIndex(i)}
              />
            ))}
          </Section>

          {classes.some((c) => isNewSubject(c.subjectName)) && (
            <View style={styles.noticeBanner}>
              <View style={styles.noticeHeader}>
                <AlertCircle size={15} color="#F59E0B" />
                <Text style={styles.noticeHighlight}>Subject Assignment Needed</Text>
              </View>
              <Text style={styles.noticeText}>
                Some classes have subjects not yet in your list. Tap the{" "}
                <Text style={{ fontWeight: "700", color: "#F59E0B" }}>+ New Subject</Text> badge to
                create and match them.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.confirmBtn, (isEmpty || isSaving) && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={isEmpty || isSaving}
          >
            <CheckCircle2
              size={18}
              color={isEmpty || isSaving ? colors.mutedForeground : "#ffffff"}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[styles.confirmText, (isEmpty || isSaving) && styles.confirmTextDisabled]}
            >
              {isSaving ? "Saving..." : "Add to My Calendar"}
            </Text>
          </Pressable>
          <Pressable style={styles.scanAnotherBtn} onPress={() => setShowScanSheet(true)}>
            <ScanLine size={16} color="#6366F1" />
            <Text style={styles.scanAnotherText}>Scan Another File</Text>
          </Pressable>
          <Pressable
            style={styles.cancelBtn}
            onPress={() => router.replace("/(app)/calendar")}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Edit sheets */}
      {editingClassIndex !== null && classes[editingClassIndex] && (
        <EditParsedClassSheet
          visible={true}
          item={classes[editingClassIndex]}
          onClose={() => setEditingClassIndex(null)}
          onSave={(updated) => {
            setClasses((prev) =>
              prev.map((c, i) => (i === editingClassIndex ? updated : c))
            );
            setEditingClassIndex(null);
          }}
        />
      )}

      {editingEventIndex !== null && events[editingEventIndex] && (
        <EditParsedEventSheet
          visible={true}
          item={events[editingEventIndex]}
          onClose={() => setEditingEventIndex(null)}
          onSave={(updated) => {
            setEvents((prev) =>
              prev.map((e, i) => (i === editingEventIndex ? updated : e))
            );
            setEditingEventIndex(null);
          }}
        />
      )}

      {editingBlockerIndex !== null && examBlockers[editingBlockerIndex] && (
        <EditParsedBlockerSheet
          visible={true}
          item={examBlockers[editingBlockerIndex]}
          onClose={() => setEditingBlockerIndex(null)}
          onSave={(updated) => {
            setExamBlockers((prev) =>
              prev.map((b, i) => (i === editingBlockerIndex ? updated : b))
            );
            setEditingBlockerIndex(null);
          }}
        />
      )}

      {editingExamIndex !== null && examEvents[editingExamIndex] && (
        <EditParsedExamSheet
          visible={true}
          item={examEvents[editingExamIndex]}
          examWeeks={dbExamWeeks}
          onClose={() => setEditingExamIndex(null)}
          onSave={(updated) => {
            setExamEvents((prev) =>
              prev.map((ex, i) => (i === editingExamIndex ? updated : ex))
            );
            setEditingExamIndex(null);
          }}
        />
      )}

      {/* Create new subject modal */}
      {newSubjectFor && (
        <NewSubjectModal
          visible={true}
          prefillName={newSubjectFor}
          onClose={() => setNewSubjectFor(null)}
          onCreated={(id, name) => {
            handleSubjectCreated(id, name);
            setNewSubjectFor(null);
          }}
        />
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
          setShowScanSheet(false);
        }}
      />

      {/* AI loading overlay for scan-another */}
      <AILoadingOverlay visible={scanner.isLoading} />

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
            <Text style={styles.successTitle}>Schedule Added</Text>
            <Text style={styles.successSub}>
              {classes.length} class{classes.length !== 1 ? "es" : ""}, {events.length} event
              {events.length !== 1 ? "s" : ""}, and{" "}
              {examBlockers.length + examEvents.length} exam item
              {examBlockers.length + examEvents.length !== 1 ? "s" : ""} have been added to your
              calendar.
            </Text>
            <Pressable
              style={styles.successBtn}
              onPress={() => {
                setShowSuccess(false);
                router.replace("/(app)/calendar");
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

// ── Styles ────────────────────────────────────────────────────────────────────

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
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    backBtn: {
      width: 38,
      height: 38,
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
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 24,
    },
    noticeBanner: {
      backgroundColor: isDark ? "rgba(245, 158, 11, 0.08)" : "rgba(245, 158, 11, 0.12)",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? "rgba(245, 158, 11, 0.25)" : "rgba(245, 158, 11, 0.3)",
      padding: 14,
      marginTop: 4,
      marginBottom: 12,
    },
    noticeHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
    },
    noticeHighlight: {
      fontSize: 13,
      fontWeight: "700",
      color: "#F59E0B",
      includeFontPadding: false,
    },
    noticeText: {
      fontSize: 12,
      color: colors.mutedForeground,
      lineHeight: 18,
      includeFontPadding: false,
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
    },
    confirmTextDisabled: {
      color: colors.mutedForeground,
    },
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
    universalCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
    },
    universalHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
    },
    universalTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    detectedBadgeRow: {
      flexDirection: "row",
      marginBottom: 8,
    },
    universalTitle: {
      fontSize: 14,
      fontWeight: "700",
      letterSpacing: -0.2,
      color: colors.foreground,
      includeFontPadding: false,
    },
    universalSub: {
      fontSize: 12,
      color: colors.mutedForeground,
      lineHeight: 18,
      marginBottom: 12,
      includeFontPadding: false,
    },
    universalInputsRow: {
      flexDirection: "row",
      gap: 12,
    },
    universalInputGroup: {
      flex: 1,
    },
    universalInputLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 6,
      includeFontPadding: false,
    },
    universalInput: {
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.foreground,
      fontSize: 13,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    detectedBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.08)",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: isDark ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.2)",
      alignSelf: "flex-start",
    },
    detectedBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      color: "#6366F1",
      includeFontPadding: false,
    },
  });
}
