import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "@/src/components/ui/text";
import { Button } from "@/src/components/ui/button";
import {
  ChevronLeft,
  BookOpen,
  CalendarDays,
  GraduationCap,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ScanLine,
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
import { usePowerSync } from "@powersync/react";
import { useAuthStore } from "@/src/features/auth/auth.store";
import ColorPicker, { HueSlider, Preview } from "reanimated-color-picker";
import { runOnJS } from "react-native-reanimated";

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
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      cur.setDate(cur.getDate() + 1);
    }
  }
  return null;
}

function buildISODateTime(dateStr: string, timeStr?: string | null): string {
  if (!timeStr) return toIsoDateString(`${dateStr}T08:00:00.000Z`);
  const [h, m] = timeStr.split(':').map(Number);
  const padH = String(isNaN(h) ? 8 : h).padStart(2, '0');
  const padM = String(isNaN(m) ? 0 : m).padStart(2, '0');
  return toIsoDateString(`${dateStr}T${padH}:${padM}:00.000Z`);
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
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={secStyles.card}>
      <Pressable
        style={secStyles.header}
        onPress={() => setExpanded((v) => !v)}
        hitSlop={4}
      >
        <View style={secStyles.headerLeft}>
          <View style={[secStyles.iconWrap, { backgroundColor: `${accentColor}1A` }]}>
            {icon}
          </View>
          <Text style={secStyles.title}>{title}</Text>
          <View style={[secStyles.badge, { backgroundColor: `${accentColor}26` }]}>
            <Text style={[secStyles.badgeText, { color: accentColor }]}>{count}</Text>
          </View>
        </View>
        {expanded ? (
          <ChevronUp size={18} color="#64748B" />
        ) : (
          <ChevronDown size={18} color="#64748B" />
        )}
      </Pressable>

      {expanded && (
        <View style={secStyles.body}>
          {count === 0 ? (
            <Text style={secStyles.emptyText}>None detected in this document.</Text>
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
    backgroundColor: "#161A26",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2A3143",
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
    color: "#ffffff",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#1E2433",
  },
  emptyText: {
    fontSize: 13,
    color: "#64748B",
    fontStyle: "italic",
    paddingVertical: 12,
    textAlign: "center",
  },
});

// ── New Subject Modal ─────────────────────────────────────────────────────────

interface NewSubjectModalProps {
  visible: boolean;
  prefillName: string;
  onClose: () => void;
  onCreated: (id: string, name: string, color: string) => void;
}

const PRESET_COLORS = [
  "#6C8EFF",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
  "#F97316",
  "#84CC16",
];

function NewSubjectModal({
  visible,
  prefillName,
  onClose,
  onCreated,
}: NewSubjectModalProps) {
  const [name, setName] = useState(prefillName);
  const [color, setColor] = useState(
    PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
  );
  const [isLoading, setIsLoading] = useState(false);
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);

  React.useEffect(() => { setName(prefillName); }, [prefillName]);

  const handleCreate = async () => {
    if (!name.trim() || !userId) return;
    setIsLoading(true);
    try {
      const id = generateId();
      const now = new Date().toISOString();
      await powerSync.execute(
        `INSERT INTO Subject (id, name, color, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, name.trim(), color, userId, now, now]
      );
      onCreated(id, name.trim(), color);
      onClose();
    } catch (err) {
      console.error("[NewSubjectModal] Failed to create subject:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={nsStyles.backdrop}>
        <View style={nsStyles.sheet}>
          <Text style={nsStyles.title}>Create New Subject</Text>
          <Text style={nsStyles.sub}>This subject was detected in your schedule but doesn't exist yet.</Text>
          <Text style={nsStyles.label}>Subject Name</Text>
          <TextInput
            style={nsStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Mathematics 101"
            placeholderTextColor="#64748B"
            autoFocus
          />
          <Text style={nsStyles.label}>Colour</Text>
          <ColorPicker
            value={color}
            onComplete={(colors) => {
              "worklet";
              runOnJS(setColor)(colors.hex);
            }}
            style={nsStyles.picker}
          >
            <Preview style={nsStyles.colorPreview} />
            <HueSlider style={nsStyles.hueSlider} />
          </ColorPicker>
          <View style={nsStyles.btnRow}>
            <Pressable style={nsStyles.cancelBtn} onPress={onClose}>
              <Text style={nsStyles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[nsStyles.createBtn, (!name.trim() || isLoading) && { opacity: 0.5 }]}
              onPress={handleCreate}
              disabled={!name.trim() || isLoading}
            >
              <Text style={nsStyles.createText}>{isLoading ? "Creating…" : "Create Subject"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const nsStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(16,19,28,0.85)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#161A26", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: "#2A3143", padding: 24, paddingBottom: Platform.OS === "ios" ? 40 : 28 },
  title: { fontSize: 18, fontWeight: "700", color: "#ffffff", marginBottom: 6 },
  sub: { fontSize: 13, color: "#94A3B8", marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  input: { backgroundColor: "#10131C", borderRadius: 12, borderWidth: 1, borderColor: "#2A3143", color: "#ffffff", fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20 },
  picker: { marginBottom: 20 },
  colorPreview: { height: 36, borderRadius: 10, marginBottom: 12 },
  hueSlider: { borderRadius: 8 },
  btnRow: { flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: "#1A1F2E", borderRadius: 12, borderWidth: 1, borderColor: "#2A3143", height: 52, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 14, fontWeight: "600", color: "#94A3B8" },
  createBtn: { flex: 2, backgroundColor: "#6C8EFF", borderRadius: 12, height: 52, alignItems: "center", justifyContent: "center" },
  createText: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ScheduleConfirmScreen() {
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
      if (examEvents.length === 0 && raw.examWeeks && raw.examWeeks.length > 0 && examWeekBlockers.length === 0) {
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
  const [examBlockers, setExamBlockers] = useState<ParsedExamWeekBlocker[]>(initialData.examWeekBlockers);
  const [examEvents, setExamEvents] = useState<ParsedExamEvent[]>(initialData.examEvents);

  const [universalStartDate, setUniversalStartDate] = useState<string>(
    initialData.semesterInfo?.startDate ? (toDateOnlyString(initialData.semesterInfo.startDate) ?? "") : ""
  );
  const [universalEndDate, setUniversalEndDate] = useState<string>(
    initialData.semesterInfo?.endDate ? (toDateOnlyString(initialData.semesterInfo.endDate) ?? "") : ""
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

  const [resolvedSubjects, setResolvedSubjects] = useState<Record<string, { id: string; color: string }>>({});
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

  const handleSubjectCreated = (id: string, name: string, color: string) => {
    setResolvedSubjects((prev) => ({ ...prev, [name]: { id, color } }));
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
        const effectiveEndDate = universalEndDate.trim() || c.endDate
          ? toIsoDateString(universalEndDate.trim() || c.endDate)
          : null;

        queries.push(
          powerSync.execute(
            `INSERT INTO ClassSchedule (id, dayOfWeek, startTime, endTime, startDate, endDate, room, modality, setType, userId, subjectId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, c.dayOfWeek, c.startTime, c.endTime, effectiveStartDate, effectiveEndDate, c.room ?? null, c.modality ?? null, c.setType ?? null, userId, c.resolvedSubjectId, now, now]
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
            [id, e.title, null, validStartDate, validEndDate, e.allDay ? 1 : 0, e.location ?? null, "#6C8EFF", userId, null, now, now]
          )
        );
      }

      for (const eb of examBlockers) {
        const id = generateId();
        const validStartDate = toIsoDateString(eb.startDate, now);
        const validEndDate = toIsoDateString(eb.endDate, validStartDate);
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
          ? resolvedSubjects[ex.subjectName]?.id ?? subjects.find((s) => s.name.toLowerCase() === ex.subjectName!.toLowerCase())?.id ?? null
          : null;

        queries.push(
          powerSync.execute(
            `INSERT INTO CalendarEvent (id, title, description, startDate, endDate, allDay, location, color, userId, subjectId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, ex.title, '🎓 Subject Exam', validStartDate, validEndDate, 0, ex.room ?? null, '#8B5CF6', userId, subjectMatch, now, now]
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
          <Pressable style={styles.backBtn} onPress={() => router.replace('/(app)/calendar')} hitSlop={8}>
            <ChevronLeft size={22} color="#94A3B8" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Review Your Schedule</Text>
            <Text style={styles.headerSub}>
              {isEmpty ? "Nothing was detected." : `${total} item${total !== 1 ? "s" : ""} detected.`}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.universalCard}>
            <View style={styles.universalHeader}>
              <View style={styles.universalTitleRow}>
                <CalendarDays size={16} color="#6C8EFF" />
                <Text style={styles.universalTitle}>Universal Semester Dates</Text>
              </View>
            </View>
            {initialData.semesterInfo?.label ? (
              <View style={styles.detectedBadgeRow}>
                <View style={styles.detectedBadge}>
                  <Text style={styles.detectedBadgeText}>
                    ✨ {initialData.semesterInfo.label}
                  </Text>
                </View>
              </View>
            ) : null}
            <Text style={styles.universalSub}>
              These semester dates are applied automatically to all recurring classes. You can edit them here if needed.
            </Text>
            <View style={styles.universalInputsRow}>
              <View style={styles.universalInputGroup}>
                <Text style={styles.universalInputLabel}>Semester Start</Text>
                <TextInput
                  style={styles.universalInput}
                  value={universalStartDate}
                  onChangeText={setUniversalStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={styles.universalInputGroup}>
                <Text style={styles.universalInputLabel}>Semester End</Text>
                <TextInput
                  style={styles.universalInput}
                  value={universalEndDate}
                  onChangeText={setUniversalEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>
          </View>

          <Section icon={<BookOpen size={18} color="#10B981" />} title="Classes" count={classes.length} accentColor="#10B981">
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

          <Section icon={<CalendarDays size={18} color="#6C8EFF" />} title="Events & Holidays" count={events.length} accentColor="#6C8EFF">
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
              <Text style={styles.noticeText}>
                ⚠️  Some classes have subjects not yet in your list. Tap the <Text style={styles.noticeHighlight}>+ New Subject</Text> badge to create them.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            style={[styles.confirmBtn, (isEmpty || isSaving) && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={isEmpty || isSaving}
          >
            <CheckCircle2 size={16} color={isEmpty || isSaving ? "#64748B" : "#ffffff"} style={{ marginRight: 6 }} />
            <Text style={[styles.confirmText, (isEmpty || isSaving) && styles.confirmTextDisabled]}>
              {isSaving ? "Saving..." : "Add to My Calendar"}
            </Text>
          </Button>
          <Pressable style={styles.scanAnotherBtn} onPress={() => setShowScanSheet(true)}>
            <ScanLine size={15} color="#8B5CF6" />
            <Text style={styles.scanAnotherText}>Scan Another File</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={() => router.replace('/(app)/calendar')}>
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
          onCreated={(id, name, color) => {
            handleSubjectCreated(id, name, color);
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
        <View style={styles.successBackdrop}>
          <View style={styles.successCard}>
            <CheckCircle2 size={48} color="#10B981" />
            <Text style={styles.successTitle}>Schedule Added!</Text>
            <Text style={styles.successSub}>
              {classes.length} class{classes.length !== 1 ? "es" : ""}, {events.length} event{events.length !== 1 ? "s" : ""}, and {examBlockers.length + examEvents.length} exam item{examBlockers.length + examEvents.length !== 1 ? "s" : ""} have been added to your calendar.
            </Text>
            <Button style={styles.successBtn} onPress={() => { setShowSuccess(false); router.replace("/(app)/calendar"); }}>
              <Text style={styles.successBtnText}>Done</Text>
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#10131C" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#1A1F2E" },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#161A26", borderWidth: 1, borderColor: "#2A3143", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#ffffff" },
  headerSub: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  noticeBanner: { backgroundColor: "rgba(245, 158, 11, 0.08)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(245, 158, 11, 0.25)", padding: 14, marginTop: 4, marginBottom: 8 },
  noticeText: { fontSize: 13, color: "#94A3B8", lineHeight: 19 },
  noticeHighlight: { color: "#F59E0B", fontWeight: "700" },
  footer: { flexDirection: "column", gap: 10, paddingHorizontal: 16, paddingBottom: Platform.OS === "android" ? 20 : 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#1A1F2E", backgroundColor: "#10131C" },
  cancelBtn: { backgroundColor: "#161A26", borderRadius: 14, borderWidth: 1, borderColor: "#2A3143", height: 50, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 13, fontWeight: "600", color: "#94A3B8" },
  scanAnotherBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(139,92,246,0.12)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(139,92,246,0.3)", height: 50 },
  scanAnotherText: { fontSize: 13, fontWeight: "600", color: "#8B5CF6" },
  confirmBtn: { backgroundColor: "#6C8EFF", borderRadius: 14, height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  confirmBtnDisabled: { backgroundColor: "#1A1F2E", borderWidth: 1, borderColor: "#2A3143" },
  confirmText: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
  confirmTextDisabled: { color: "#64748B" },
  successBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  successCard: { backgroundColor: "#1A1F2E", padding: 24, borderRadius: 16, width: "100%", alignItems: "center", borderWidth: 1, borderColor: "#2A3143" },
  successTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff", marginTop: 16, marginBottom: 8 },
  successSub: { fontSize: 14, color: "#94A3B8", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  successBtn: { width: "100%", backgroundColor: "#6C8EFF" },
  successBtnText: { color: "#ffffff", fontWeight: "600" },
  universalCard: {
    backgroundColor: "#161A26",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2A3143",
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
    color: "#ffffff",
  },
  universalSub: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 18,
    marginBottom: 12,
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
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  universalInput: {
    backgroundColor: "#10131C",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2A3143",
    color: "#ffffff",
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detectedBadge: {
    backgroundColor: "rgba(108, 142, 255, 0.12)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(108, 142, 255, 0.25)",
    alignSelf: "flex-start",
  },
  detectedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6C8EFF",
  },
});
