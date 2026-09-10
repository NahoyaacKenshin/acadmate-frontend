import React from 'react';
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  Vibration,
} from 'react-native';
import { Text } from '../ui/text';
import {
  CalendarDays,
  Clock,
  MapPin,
  BookOpen,
  Wifi,
  Users,
  Layers,
  GraduationCap,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react-native';
import { CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { ExamWeekRow } from '@/src/hooks/useExamWeeks';
import { TaskRow } from '@/src/hooks/useTasks';
import { SemesterRuleRow, useSemesterRules } from '@/src/hooks/useSemesterRules';
import { HolidayRow, useHolidays } from '@/src/hooks/useHolidays';
import { Holiday } from './MonthGrid';
import { resolveScheduleForDate } from '@/src/utils/scheduleResolver';
import { isScheduleActiveOnDate, parseDateLocal } from '@/src/utils/scheduleUtils';
import { isSameDayPHT, formatTimePHT } from '@/src/utils/philippineTime';
import { useUserStore } from '@/src/store/userStore';

interface DayViewProps {
  selectedDate: Date;
  events: CalendarEventRow[];
  schedules: ClassScheduleRow[];
  examWeeks: ExamWeekRow[];
  holidays: Holiday[];
  tasks: TaskRow[];
  onClassPress?: (schedule: ClassScheduleRow) => void;
  onEventPress?: (event: CalendarEventRow) => void;
  onExamWeekPress?: (examWeek: ExamWeekRow) => void;
  onToggleTask?: (id: string) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatEventTime(isoString: string): string {
  return formatTimePHT(isoString);
}

// ── Modality Badge ─────────────────────────────────────────────────────────────
function ModalityBadge({ text, color }: { text: string; color: string }) {
  const isF2F = text.includes('F2F');
  const isOnline = text.includes('ONLINE') || text.includes('Online');
  return (
    <View style={[
      styles.badge,
      { backgroundColor: `${color}1F` }
    ]}>
      {isF2F
        ? <Users size={10} color={color} />
        : isOnline
          ? <Wifi size={10} color={color} />
          : <Layers size={10} color={color} />
      }
      <Text style={[styles.badgeText, { color }]}>
        {text}
      </Text>
    </View>
  );
}

// ── Class Schedule Card ────────────────────────────────────────────────────────
function ClassCard({
  schedule,
  selectedDate,
  studentSet,
  semesterRules,
  holidays,
  examWeeks,
  onPress,
}: {
  schedule: ClassScheduleRow;
  selectedDate: Date;
  studentSet: import('@/src/store/userStore').StudentSet | null;
  semesterRules: SemesterRuleRow[];
  holidays: HolidayRow[];
  examWeeks: ExamWeekRow[];
  onPress?: () => void;
}) {
  const subjectColor = schedule.subject_color ?? '#6C8EFF';
  const resolution = resolveScheduleForDate(
    schedule,
    selectedDate,
    studentSet,
    semesterRules,
    holidays,
    examWeeks
  );

  return (
    <Pressable
      style={({ pressed }) => [styles.eventCard, pressed && styles.eventCardPressed]}
      onPress={onPress}
    >
      <View style={[styles.eventColorBar, { backgroundColor: subjectColor }]} />
      <View style={styles.eventBody}>
        <View style={styles.eventTopRow}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {schedule.subject_name ?? 'Class'}
          </Text>
          <View style={styles.eventTopRight}>
            <ModalityBadge text={resolution.badgeText} color={resolution.badgeColor} />
            <ChevronRight size={14} color="#3A4455" />
          </View>
        </View>
        <View style={styles.eventMeta}>
          {resolution.effectiveRoom ? (
            <View style={styles.metaItem}>
              <MapPin size={11} color="#94A3B8" />
              <Text style={styles.metaText}>{resolution.effectiveRoom}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Clock size={11} color="#94A3B8" />
            <Text style={styles.metaText}>
              {formatTime12(schedule.start_time)} – {formatTime12(schedule.end_time)}
            </Text>
          </View>
          {resolution.reason ? (
            <View style={styles.metaItem}>
              <Text style={styles.setTypeTag}>{resolution.reason}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}


// ── Calendar Event Card ────────────────────────────────────────────────────────
function EventCard({
  event,
  onPress,
  isExam = false,
}: {
  event: CalendarEventRow;
  onPress?: () => void;
  isExam?: boolean;
}) {
  const accentColor = isExam ? '#8B5CF6' : (event.subject_color ?? event.color ?? '#6C8EFF');
  return (
    <Pressable
      style={({ pressed }) => [styles.eventCard, pressed && styles.eventCardPressed]}
      onPress={onPress}
    >
      <View style={[styles.eventColorBar, { backgroundColor: accentColor }]} />
      <View style={styles.eventBody}>
        <View style={styles.eventTopRow}>
          <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
          <View style={styles.eventTopRight}>
            {isExam ? (
              <View style={[styles.badge, { backgroundColor: 'rgba(139, 92, 246, 0.18)' }]}>
                <GraduationCap size={10} color="#A78BFA" />
                <Text style={[styles.badgeText, { color: '#A78BFA' }]}>EXAM</Text>
              </View>
            ) : null}
            <ChevronRight size={14} color="#3A4455" />
          </View>
        </View>
        <View style={styles.eventMeta}>
          {event.all_day === 1 ? (
            <View style={styles.metaItem}>
              <CalendarDays size={11} color="#94A3B8" />
              <Text style={styles.metaText}>All day</Text>
            </View>
          ) : (
            <View style={styles.metaItem}>
              <Clock size={11} color="#94A3B8" />
              <Text style={styles.metaText}>
                {formatEventTime(event.start_date)}
                {event.end_date ? ` – ${formatEventTime(event.end_date)}` : ''}
              </Text>
            </View>
          )}
          {event.location ? (
            <View style={styles.metaItem}>
              <MapPin size={11} color="#94A3B8" />
              <Text style={styles.metaText}>{event.location}</Text>
            </View>
          ) : null}
          {event.subject_name ? (
            <View style={styles.metaItem}>
              <BookOpen size={11} color="#94A3B8" />
              <Text style={styles.metaText}>{event.subject_name}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// ── Task Due Card ──────────────────────────────────────────────────────────────
function TaskDueCard({
  task,
  onToggleComplete,
}: {
  task: TaskRow;
  onToggleComplete?: () => void;
}) {
  const isCompleted = task.completed === 1;
  const subjectColor = task.subject_color ?? '#94A3B8';
  const dueTime = task.due_date ? formatTimePHT(task.due_date) : null;

  const handleCheckboxPress = () => {
    try { Vibration.vibrate(15); } catch { /* ignored */ }
    onToggleComplete?.();
  };

  return (
    <View style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}>
      {/* Color bar */}
      <View style={[styles.eventColorBar, { backgroundColor: subjectColor }]} />

      {/* Checkbox */}
      <Pressable
        style={({ pressed }) => [
          styles.taskCheckbox,
          isCompleted && styles.taskCheckboxDone,
          pressed && { transform: [{ scale: 0.88 }] },
        ]}
        onPress={handleCheckboxPress}
        hitSlop={10}
      >
        {isCompleted && <Check size={12} color="#ffffff" strokeWidth={3} />}
      </Pressable>

      {/* Body */}
      <View style={styles.taskBody}>
        <View style={styles.taskTopRow}>
          <Text
            style={[styles.taskTitle, isCompleted && styles.taskTitleDone]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          {/* Subject pill */}
          {task.subject_name ? (
            <View style={[styles.subjectPill, { backgroundColor: `${subjectColor}22` }]}>
              <View style={[styles.subjectDot, { backgroundColor: subjectColor }]} />
              <Text style={[styles.subjectPillText, { color: subjectColor }]} numberOfLines={1}>
                {task.subject_name}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.taskMeta}>
          {/* Due label */}
          {isCompleted ? (
            <View style={styles.badgeCompleted}>
              <Check size={10} color="#10B981" strokeWidth={3} />
              <Text style={styles.badgeCompletedText}>Done</Text>
            </View>
          ) : (
            <View style={styles.taskDueBadge}>
              <Clock size={10} color="#F59E0B" />
              <Text style={styles.taskDueLabel}>
                Task due{dueTime ? ` · ${dueTime}` : ''}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Main DayView ───────────────────────────────────────────────────────────────
export function DayView({ selectedDate, events, schedules, examWeeks, holidays, tasks, onClassPress, onEventPress, onExamWeekPress, onToggleTask }: DayViewProps) {
  const today = new Date();
  const isToday = isSameDay(selectedDate, today);
  const isPast = selectedDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayOfWeek = selectedDate.getDay();

  const { semesterRules } = useSemesterRules();
  const { holidays: dbHolidays } = useHolidays();
  const { studentSet } = useUserStore();

  // Combine prop holidays with DB holidays
  const combinedHolidays: HolidayRow[] = [
    ...holidays.map((h) => ({
      id: h.id || h.date,
      date: h.date,
      name: h.name,
      type: h.type as 'REGULAR' | 'SPECIAL',
    })),
    ...dbHolidays,
  ];

  // Filter class schedules for this day — respects start/end date bounds and blockers
  const daySchedules = schedules.filter((s) => isScheduleActiveOnDate(s, selectedDate, examWeeks, combinedHolidays));

  // Filter one-off events for this date
  const dayEvents = events.filter((e) => isSameDayPHT(e.start_date, selectedDate));

  // Categorize subject exams vs general events
  const isExamEvent = (e: CalendarEventRow) =>
    e.color === '#8B5CF6' ||
    (e.description != null && e.description.toLowerCase().includes('exam')) ||
    e.title.toLowerCase().includes('exam') ||
    e.title.toLowerCase().includes('quiz');

  const dayExams = dayEvents.filter(isExamEvent);
  const dayGeneralEvents = dayEvents.filter((e) => !isExamEvent(e));

  // Filter tasks due on this date
  const dayTasks = tasks.filter((t) => t.due_date && isSameDayPHT(t.due_date, selectedDate));

  // Holiday / Suspension for this date
  const dayHoliday = combinedHolidays.find((h) => {
    const hd = parseDateLocal(h.date);
    return hd ? isSameDay(hd, selectedDate) : false;
  });

  // Exam weeks active on this date
  const activeExamWeeks = examWeeks.filter((ew) => {
    const ewStart = parseDateLocal(ew.startDate);
    const ewEnd = parseDateLocal(ew.endDate) ?? ewStart;
    if (!ewStart || !ewEnd) return false;
    const target = new Date(selectedDate);
    target.setHours(0, 0, 0, 0);
    return target >= ewStart && target <= ewEnd;
  });

  const hasAnything = daySchedules.length > 0 || dayEvents.length > 0 || dayTasks.length > 0 || dayHoliday || activeExamWeeks.length > 0;

  // Day header label
  const dateLabel = isToday
    ? `Today — ${DAYS_FULL[dayOfWeek]}, ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}`
    : `${DAYS_FULL[dayOfWeek]}, ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}`;

  // Empty state message
  const emptySubtitle = isToday
    ? 'Enjoy your free day — tap + to add something'
    : isPast
    ? 'Nothing was scheduled for this day'
    : 'Nothing planned yet — tap + to add an event';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Day label */}
      <Text style={styles.dayHeader}>{dateLabel}</Text>

      {/* Exam Week banners */}
      {activeExamWeeks.map((ew) => (
        <Pressable
          key={ew.id}
          style={[styles.holidayBanner, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}
          onPress={() => onExamWeekPress?.(ew)}
        >
          <GraduationCap size={14} color="#F59E0B" />
          <Text style={[styles.holidayText, { color: '#F59E0B' }]}>
            Exam Week Block — {ew.title}
          </Text>
          <Text style={{ fontSize: 11, color: '#F59E0B', fontStyle: 'italic', marginLeft: 'auto' }}>Edit</Text>
        </Pressable>
      ))}

      {/* Holiday / Suspension banner */}
      {dayHoliday ? (
        <View style={[
          styles.holidayBanner,
          dayHoliday.type === 'SUSPENSION' || dayHoliday.name.toLowerCase().includes('suspension')
            ? { backgroundColor: 'rgba(236, 72, 153, 0.12)', borderColor: 'rgba(236, 72, 153, 0.3)' }
            : styles.holidayBannerRegular,
        ]}>
          <CalendarDays
            size={14}
            color={
              dayHoliday.type === 'SUSPENSION' || dayHoliday.name.toLowerCase().includes('suspension')
                ? '#EC4899'
                : '#EF4444'
            }
          />
          <Text style={[
            styles.holidayText,
            dayHoliday.type === 'SUSPENSION' || dayHoliday.name.toLowerCase().includes('suspension')
              ? { color: '#EC4899' }
              : styles.holidayTextRegular,
          ]}>
            {dayHoliday.type === 'SUSPENSION' || dayHoliday.name.toLowerCase().includes('suspension')
              ? 'Class Suspension'
              : dayHoliday.type === 'REGULAR'
                ? 'Regular Holiday'
                : 'Special Holiday'} — {dayHoliday.name}
          </Text>
        </View>
      ) : null}

      {/* Subject Exams */}
      {dayExams.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Exams & Quizzes" />
          {dayExams.map((e) => (
            <EventCard key={e.id} event={e} isExam={true} onPress={() => onEventPress?.(e)} />
          ))}
        </View>
      ) : null}

      {/* Classes */}
      {daySchedules.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Classes" />
          {daySchedules.map((s) => (
            <ClassCard
              key={s.id}
              schedule={s}
              selectedDate={selectedDate}
              studentSet={studentSet}
              semesterRules={semesterRules}
              holidays={combinedHolidays}
              examWeeks={examWeeks}
              onPress={() => onClassPress?.(s)}
            />
          ))}
        </View>
      ) : null}

      {/* One-off events */}
      {dayGeneralEvents.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Events & Activities" />
          {dayGeneralEvents.map((e) => <EventCard key={e.id} event={e} onPress={() => onEventPress?.(e)} />)}
        </View>
      ) : null}

      {/* Tasks due */}
      {dayTasks.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Tasks Due" />
          {dayTasks.map((t) => (
            <TaskDueCard
              key={t.id}
              task={t}
              onToggleComplete={() => onToggleTask?.(t.id)}
            />
          ))}
        </View>
      ) : null}

      {/* Empty state */}
      {!hasAnything ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Sparkles size={28} color="#3A4455" />
          </View>
          <Text style={styles.emptyTitle}>Nothing scheduled</Text>
          <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10131C',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  dayHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  // Holiday banner
  holidayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  holidayBannerRegular: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  holidayBannerSpecial: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  holidayText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  holidayTextRegular: { color: '#EF4444' },
  holidayTextSpecial: { color: '#F59E0B' },
  // Sections
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  // Event card (class & events)
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#161A26',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  eventCardPressed: {
    opacity: 0.75,
    borderColor: '#6C8EFF',
  },
  eventCardDimmed: {
    opacity: 0.5,
  },
  eventColorBar: {
    width: 4,
  },
  eventBody: {
    flex: 1,
    padding: 12,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eventTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  titleStrikethrough: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  eventMeta: {
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  setTypeTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6C8EFF',
    backgroundColor: 'rgba(108,142,255,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Task Due Card
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A26',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  taskCardCompleted: {
    opacity: 0.55,
  },
  taskCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#3A4455',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    flexShrink: 0,
  },
  taskCheckboxDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  taskBody: {
    flex: 1,
    padding: 12,
    paddingLeft: 10,
    gap: 6,
  },
  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskDueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  taskDueLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  badgeCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeCompletedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  // Subject pill on task cards
  subjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 110,
    flexShrink: 0,
  },
  subjectDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  subjectPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Badge (modality, exam)
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#2A3143',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#94A3B8',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#3A4455',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
