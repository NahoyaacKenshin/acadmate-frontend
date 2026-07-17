import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/src/components/ui/text';
import { Button } from '@/src/components/ui/button';
import {
  ChevronLeft,
  BookOpen,
  CalendarDays,
  GraduationCap,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import {
  ClassScheduleRow,
  CalendarEventRow,
  ExamWeekRow,
  ParsedClassSchedule,
  ParsedCalendarEvent,
  ParsedExamWeek,
} from '@/src/components/schedule/ParsedItemRow';
import { useSubjects } from '@/src/hooks/useSubjects';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import ColorPicker, { HueSlider, Preview } from 'reanimated-color-picker';

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const TOTAL_COUNT = (
  classes: ParsedClassSchedule[],
  events: ParsedCalendarEvent[],
  exams: ParsedExamWeek[]
) => classes.length + events.length + exams.length;

// ── Collapsible section wrapper ───────────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  accentColor: string;
  children: React.ReactNode;
}

function Section({ icon, title, count, accentColor, children }: SectionProps) {
  const [open, setOpen] = useState(true);
  return (
    <View style={sectionStyles.wrap}>
      <Pressable style={sectionStyles.header} onPress={() => setOpen((v) => !v)}>
        <View style={[sectionStyles.iconWrap, { backgroundColor: `${accentColor}1A` }]}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={sectionStyles.title}>{title}</Text>
        </View>
        <View style={[sectionStyles.countBadge, { backgroundColor: `${accentColor}22` }]}>
          <Text style={[sectionStyles.countText, { color: accentColor }]}>{count}</Text>
        </View>
        {open
          ? <ChevronUp size={16} color="#64748B" />
          : <ChevronDown size={16} color="#64748B" />}
      </Pressable>
      {open && count > 0 && <View style={sectionStyles.body}>{children}</View>}
      {open && count === 0 && (
        <View style={sectionStyles.emptyState}>
          <Text style={sectionStyles.emptyText}>Nothing detected in this category.</Text>
        </View>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#161A26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A3143',
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  countBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
  },
});

// ── Inline new-subject creation modal ─────────────────────────────────────────

interface NewSubjectModalProps {
  visible: boolean;
  prefillName: string;
  onClose: () => void;
  onCreated: (id: string, name: string, color: string) => void;
}

function NewSubjectModal({ visible, prefillName, onClose, onCreated }: NewSubjectModalProps) {
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);
  const [name, setName] = useState(prefillName);
  const [color, setColor] = useState('#6C8EFF');
  const [isLoading, setIsLoading] = useState(false);

  // Keep name in sync when prefill changes (different subject tapped)
  React.useEffect(() => { setName(prefillName); }, [prefillName]);

  const handleCreate = async () => {
    if (!name.trim() || !userId) return;
    setIsLoading(true);
    try {
      const id = generateId();
      const now = new Date().toISOString();
      await powerSync.execute(
        `INSERT INTO Subject (id, name, color, userId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, name.trim(), color, userId, now, now]
      );
      onCreated(id, name.trim(), color);
      onClose();
    } catch (err) {
      console.error('[NewSubjectModal] Failed to create subject:', err);
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
            onComplete={({ hex }) => setColor(hex)}
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
              <Text style={nsStyles.createText}>{isLoading ? 'Creating…' : 'Create Subject'}</Text>
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
    backgroundColor: 'rgba(16,19,28,0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#161A26',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 6 },
  sub: { fontSize: 13, color: '#94A3B8', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  input: {
    backgroundColor: '#10131C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
    color: '#ffffff',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  picker: { marginBottom: 20 },
  colorPreview: { height: 36, borderRadius: 10, marginBottom: 12 },
  hueSlider: { borderRadius: 8 },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1A1F2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  createBtn: {
    flex: 2,
    backgroundColor: '#6C8EFF',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ScheduleConfirmScreen() {
  const params = useLocalSearchParams<{ payload?: string }>();
  const { subjects } = useSubjects();
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);
  const [isSaving, setIsSaving] = useState(false);

  // Decode the payload passed from the upload screen
  const initialData = useMemo(() => {
    if (!params.payload) return { classSchedules: [], calendarEvents: [], examWeeks: [] };
    try {
      return JSON.parse(params.payload) as {
        classSchedules: ParsedClassSchedule[];
        calendarEvents: ParsedCalendarEvent[];
        examWeeks: ParsedExamWeek[];
      };
    } catch {
      return { classSchedules: [], calendarEvents: [], examWeeks: [] };
    }
  }, [params.payload]);

  // Editable copies of each list (so user can remove items)
  const [classes, setClasses] = useState<ParsedClassSchedule[]>(initialData.classSchedules);
  const [events, setEvents] = useState<ParsedCalendarEvent[]>(initialData.calendarEvents);
  const [exams, setExams] = useState<ParsedExamWeek[]>(initialData.examWeeks);

  // Map of subjectName → local subject id (built as user creates subjects)
  const [resolvedSubjects, setResolvedSubjects] = useState<Record<string, { id: string; color: string }>>({});

  // New-subject modal state
  const [newSubjectFor, setNewSubjectFor] = useState<string | null>(null);

  // Which subject names don't yet have a local match
  const existingSubjectNames = useMemo(
    () => new Set(subjects.map((s) => s.name.toLowerCase())),
    [subjects]
  );
  const isNewSubject = (name: string) =>
    !existingSubjectNames.has(name.toLowerCase()) && !resolvedSubjects[name];

  const total = TOTAL_COUNT(classes, events, exams);
  const isEmpty = total === 0;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSubjectCreated = (id: string, name: string, color: string) => {
    setResolvedSubjects((prev) => ({ ...prev, [name]: { id, color } }));
  };

  const handleConfirm = async () => {
    if (!userId) return;
    setIsSaving(true);

    try {
      const resolvedClasses = classes.map((c) => ({
        ...c,
        resolvedSubjectId: resolvedSubjects[c.subjectName]?.id ??
          subjects.find((s) => s.name.toLowerCase() === c.subjectName.toLowerCase())?.id ?? null,
      }));

      const now = new Date().toISOString();
      const queries = [];

      for (const c of resolvedClasses) {
        if (!c.resolvedSubjectId) continue;
        const id = generateId();
        queries.push(
          powerSync.execute(
            `INSERT INTO ClassSchedule (id, dayOfWeek, startTime, endTime, startDate, endDate, room, modality, setType, userId, subjectId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              c.dayOfWeek,
              c.startTime,
              c.endTime,
              c.startDate ?? null,
              c.endDate ?? null,
              c.room ?? null,
              c.modality ?? null,
              c.setType ?? null,
              userId,
              c.resolvedSubjectId,
              now,
              now
            ]
          )
        );
      }

      for (const e of events) {
        const id = generateId();
        queries.push(
          powerSync.execute(
            `INSERT INTO CalendarEvent (id, title, description, startDate, endDate, allDay, location, color, userId, subjectId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              e.title,
              null,
              e.startDate,
              e.endDate ?? null,
              e.allDay ? 1 : 0,
              e.location ?? null,
              '#6C8EFF',
              userId,
              null,
              now,
              now
            ]
          )
        );
      }

      for (const ex of exams) {
        const id = generateId();
        queries.push(
          powerSync.execute(
            `INSERT INTO ExamWeek (id, title, startDate, endDate, userId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              ex.title,
              ex.startDate,
              ex.endDate,
              userId,
              now,
              now
            ]
          )
        );
      }

      await Promise.all(queries);
      console.log('[ScheduleConfirm] Saved data locally via PowerSync');
      router.back();
    } catch (err) {
      console.error('[ScheduleConfirm] Failed to save schedule:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color="#94A3B8" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Review Your Schedule</Text>
            <Text style={styles.headerSub}>
              {isEmpty ? 'Nothing was detected.' : `${total} item${total !== 1 ? 's' : ''} detected — remove anything that looks wrong`}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Classes section */}
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
              />
            ))}
          </Section>

          {/* Events section */}
          <Section
            icon={<CalendarDays size={18} color="#6C8EFF" />}
            title="Events & Holidays"
            count={events.length}
            accentColor="#6C8EFF"
          >
            {events.map((item, i) => (
              <CalendarEventRow
                key={`event-${i}`}
                item={item}
                onRemove={() => setEvents((prev) => prev.filter((_, idx) => idx !== i))}
              />
            ))}
          </Section>

          {/* Exam weeks section */}
          <Section
            icon={<GraduationCap size={18} color="#F59E0B" />}
            title="Exam Periods"
            count={exams.length}
            accentColor="#F59E0B"
          >
            {exams.map((item, i) => (
              <ExamWeekRow
                key={`exam-${i}`}
                item={item}
                onRemove={() => setExams((prev) => prev.filter((_, idx) => idx !== i))}
              />
            ))}
          </Section>

          {/* Unresolved subjects notice */}
          {classes.some((c) => isNewSubject(c.subjectName)) && (
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeText}>
                ⚠️  Some classes have subjects not yet in your list. Tap the yellow <Text style={styles.noticeHighlight}>+ New Subject</Text> badge to create them before adding.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom actions */}
        <View style={styles.footer}>
          <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Button
            style={[styles.confirmBtn, (isEmpty || isSaving) && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={isEmpty || isSaving}
          >
            <CheckCircle2 size={16} color={isEmpty || isSaving ? '#64748B' : '#ffffff'} style={{ marginRight: 6 }} />
            <Text style={[styles.confirmText, (isEmpty || isSaving) && styles.confirmTextDisabled]}>
              {isSaving ? 'Saving...' : 'Add to My Calendar'}
            </Text>
          </Button>
        </View>
      </SafeAreaView>

      {/* Inline new-subject creation modal */}
      <NewSubjectModal
        visible={newSubjectFor !== null}
        prefillName={newSubjectFor ?? ''}
        onClose={() => setNewSubjectFor(null)}
        onCreated={handleSubjectCreated}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#10131C' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1F2E',
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
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },

  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },

  noticeBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    padding: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
  },
  noticeHighlight: {
    color: '#F59E0B',
    fontWeight: '700',
  },

  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'android' ? 20 : 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A1F2E',
    backgroundColor: '#10131C',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#161A26',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3143',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#6C8EFF',
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#1A1F2E',
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  confirmTextDisabled: {
    color: '#64748B',
  },
});
