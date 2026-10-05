import React from 'react';
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  Vibration,
  Text,
} from 'react-native';
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
  AlertTriangle,
  Pencil,
} from 'lucide-react-native';
import { CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { ExamWeekRow } from '@/src/hooks/useExamWeeks';
import { TaskRow } from '@/src/hooks/useTasks';
import { SemesterRuleRow, useSemesterRules } from '@/src/hooks/useSemesterRules';
import { HolidayRow, useHolidays } from '@/src/hooks/useHolidays';
import { Holiday } from './MonthGrid';
import { resolveScheduleForDate } from '@/src/utils/scheduleResolver';
import { isScheduleActiveOnDate, parseDateLocal, getPeriodCategory, getPeriodColor, getCleanPeriodTitle, CALENDAR_THEME } from '@/src/utils/scheduleUtils';
import { isSameDayPHT, formatTimePHT, parseToPHTDate } from '@/src/utils/philippineTime';
import { useUserStore, computeCurrentSet } from '@/src/store/userStore';
import { useTheme } from '@/src/theme/useTheme';

interface DayViewProps {
  selectedDate: Date;
  events: CalendarEventRow[];
  schedules: ClassScheduleRow[];
  examWeeks: ExamWeekRow[];
  holidays: Holiday[];
  tasks: TaskRow[];
  onClassPress?: (schedule: ClassScheduleRow) => void;
  onEditClassPress?: (schedule: ClassScheduleRow) => void;
  onEventPress?: (event: CalendarEventRow) => void;
  onEditEventPress?: (event: CalendarEventRow) => void;
  onExamWeekPress?: (examWeek: ExamWeekRow) => void;
  onTaskPress?: (task: TaskRow) => void;
  onEditTaskPress?: (task: TaskRow) => void;
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
  onEditPress,
}: {
  schedule: ClassScheduleRow;
  selectedDate: Date;
  studentSet: import('@/src/store/userStore').StudentSet | null;
  semesterRules: SemesterRuleRow[];
  holidays: HolidayRow[];
  examWeeks: ExamWeekRow[];
  onPress?: () => void;
  onEditPress?: () => void;
}) {
  const { colors, isDark } = useTheme();
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
      style={({ pressed }) => [
        styles.eventCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        pressed && styles.eventCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.eventColorBar, { backgroundColor: '#10B981' }]} />
      <View style={styles.eventBody}>
        <View style={styles.eventTopRow}>
          <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">
            {schedule.subject_name ?? 'Class'}
          </Text>
          <View style={styles.eventTopRight}>
            <ModalityBadge text={resolution.badgeText} color={resolution.badgeColor} />
            {onEditPress ? (
              <Pressable
                style={({ pressed }) => [
                  styles.cardActionBtn,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' },
                  pressed && { opacity: 0.6 },
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  onEditPress();
                }}
                hitSlop={8}
                accessibilityLabel="Edit class schedule"
              >
                <Pencil size={12} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
            <ChevronRight size={14} color={colors.mutedForeground} />
          </View>
        </View>
        <View style={styles.eventMeta}>
          {resolution.effectiveRoom ? (
            <View style={[styles.metaItem, { flexShrink: 1, maxWidth: 140 }]}>
              <MapPin size={11} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1} ellipsizeMode="tail">
                {resolution.effectiveRoom}
              </Text>
            </View>
          ) : null}
          <View style={[styles.metaItem, { flexShrink: 0 }]}>
            <Clock size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {formatTime12(schedule.start_time)} – {formatTime12(schedule.end_time)}
            </Text>
          </View>
          {resolution.reason ? (
            <View style={[styles.metaItem, { flexShrink: 0 }]}>
              <Text
                style={[
                  styles.setTypeTag,
                  resolution.reason.includes('Set B') && styles.setTypeTagB,
                  resolution.reason === 'Every Week' && [styles.setTypeTagEveryWeek, { color: colors.mutedForeground, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }],
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {resolution.reason}
              </Text>
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
  onEditPress,
  isExam = false,
}: {
  event: CalendarEventRow;
  onPress?: () => void;
  onEditPress?: () => void;
  isExam?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const accentColor = isExam ? '#F59E0B' : '#6366F1';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.eventCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        pressed && styles.eventCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.eventColorBar, { backgroundColor: accentColor }]} />
      <View style={styles.eventBody}>
        <View style={styles.eventTopRow}>
          <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">
            {event.title}
          </Text>
          <View style={styles.eventTopRight}>
            {isExam ? (
              <View style={[styles.badge, { backgroundColor: 'rgba(245, 158, 11, 0.18)' }]}>
                <GraduationCap size={10} color="#F59E0B" />
                <Text style={[styles.badgeText, { color: '#F59E0B' }]}>EXAM</Text>
              </View>
            ) : null}
            {onEditPress ? (
              <Pressable
                style={({ pressed }) => [
                  styles.cardActionBtn,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' },
                  pressed && { opacity: 0.6 },
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  onEditPress();
                }}
                hitSlop={8}
                accessibilityLabel="Edit event"
              >
                <Pencil size={12} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
            <ChevronRight size={14} color={colors.mutedForeground} />
          </View>
        </View>
        <View style={styles.eventMeta}>
          {event.all_day === 1 ? (
            <View style={styles.metaItem}>
              <CalendarDays size={11} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>All day</Text>
            </View>
          ) : (
            <View style={styles.metaItem}>
              <Clock size={11} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {formatEventTime(event.start_date)}
                {event.end_date ? ` – ${formatEventTime(event.end_date)}` : ''}
              </Text>
            </View>
          )}
          {event.location ? (
            <View style={[styles.metaItem, { flexShrink: 1, maxWidth: 140 }]}>
              <MapPin size={11} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1} ellipsizeMode="tail">
                {event.location}
              </Text>
            </View>
          ) : null}
          {event.subject_name ? (
            <View style={[styles.metaItem, { flexShrink: 1, maxWidth: 120 }]}>
              <BookOpen size={11} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1} ellipsizeMode="tail">
                {event.subject_name}
              </Text>
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
  onPress,
  onEditPress,
  onToggleComplete,
}: {
  task: TaskRow;
  onPress?: () => void;
  onEditPress?: () => void;
  onToggleComplete?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const isCompleted = task.completed === 1;
  const taskDisplayColor = '#10B981';
  const dueTime = task.due_date ? formatTimePHT(task.due_date) : null;

  const handleCheckboxPress = (e: any) => {
    e.stopPropagation();
    try { Vibration.vibrate(15); } catch { /* ignored */ }
    onToggleComplete?.();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.taskCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        isCompleted && styles.taskCardCompleted,
        pressed && styles.eventCardPressed,
      ]}
      onPress={onPress}
    >
      {/* Color bar */}
      <View style={[styles.eventColorBar, { backgroundColor: taskDisplayColor }]} />

      {/* Checkbox */}
      <Pressable
        style={({ pressed }) => [
          styles.taskCheckbox,
          { borderColor: colors.border },
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
            style={[
              styles.taskTitle,
              { color: colors.foreground },
              isCompleted && [styles.taskTitleDone, { color: colors.mutedForeground }],
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {task.title}
          </Text>

          <View style={styles.eventTopRight}>
            {task.subject_name ? (
              <View style={[styles.subjectPill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)', borderColor: colors.border, maxWidth: 110 }]}>
                <Text style={[styles.subjectPillText, { color: colors.mutedForeground }]} numberOfLines={1} ellipsizeMode="tail">
                  {task.subject_name}
                </Text>
              </View>
            ) : null}
            {onEditPress ? (
              <Pressable
                style={({ pressed }) => [
                  styles.cardActionBtn,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' },
                  pressed && { opacity: 0.6 },
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  onEditPress();
                }}
                hitSlop={8}
                accessibilityLabel="Edit task"
              >
                <Pencil size={12} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
            <ChevronRight size={14} color={colors.mutedForeground} />
          </View>
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
    </Pressable>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
    </View>
  );
}

// ── Main DayView ───────────────────────────────────────────────────────────────
export function DayView({
  selectedDate,
  events,
  schedules,
  examWeeks,
  holidays,
  tasks,
  onClassPress,
  onEditClassPress,
  onEventPress,
  onEditEventPress,
  onExamWeekPress,
  onTaskPress,
  onEditTaskPress,
  onToggleTask,
}: DayViewProps) {
  const { colors, isDark } = useTheme();
  const today = new Date();
  const isToday = isSameDay(selectedDate, today);
  const isPast = selectedDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayOfWeek = selectedDate.getDay();

  const { semesterRules } = useSemesterRules();
  const { holidays: dbHolidays } = useHolidays();
  const { studentSet, anchorMonday, anchorSet } = useUserStore();
  const currentSet = computeCurrentSet(studentSet, anchorMonday, anchorSet, selectedDate);

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

  // Filter class schedules for this day
  const daySchedules = schedules.filter((s) => isScheduleActiveOnDate(s, selectedDate, examWeeks, combinedHolidays, currentSet));

  // Check if an event falls on this date
  const isEventActiveOnDate = (e: CalendarEventRow, targetDate: Date): boolean => {
    if (isSameDayPHT(e.start_date, targetDate)) return true;
    if (e.end_date) {
      const start = parseToPHTDate(e.start_date) ?? new Date(e.start_date);
      const end = parseToPHTDate(e.end_date) ?? new Date(e.end_date);
      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);
      const startDay = new Date(start);
      startDay.setHours(0, 0, 0, 0);
      const endDay = new Date(end);
      endDay.setHours(23, 59, 59, 999);
      return target >= startDay && target <= endDay;
    }
    return false;
  };

  // Filter events for this date
  const dayEvents = events.filter((e) => isEventActiveOnDate(e, selectedDate));

  // Categorize subject exams vs general events
  const isExamEvent = (e: CalendarEventRow) =>
    Boolean(e.description?.toLowerCase().includes('exam')) ||
    Boolean(e.title?.toLowerCase().includes('exam')) ||
    Boolean(e.description?.startsWith('🎓')) ||
    Boolean(e.title?.startsWith('🎓'));

  // Split active ExamWeek rows by category
  const activePeriods = examWeeks.filter((ew) => {
    const ewStart = parseDateLocal(ew.startDate);
    const ewEnd = parseDateLocal(ew.endDate) ?? ewStart;
    if (!ewStart || !ewEnd) return false;
    const target = new Date(selectedDate);
    target.setHours(0, 0, 0, 0);
    return target >= ewStart && target <= ewEnd;
  });

  const activeExamPeriods    = activePeriods.filter((ew) => getPeriodCategory(ew) === 'EXAM');
  const activeHolidayPeriods = activePeriods.filter((ew) => getPeriodCategory(ew) === 'HOLIDAY');
  const activeSuspensions    = activePeriods.filter((ew) => getPeriodCategory(ew) === 'SUSPENSION');

  const isExamBlocked = activeHolidayPeriods.length > 0 || activeSuspensions.length > 0;
  const dayExams = isExamBlocked ? [] : dayEvents.filter(isExamEvent);
  const dayGeneralEvents = dayEvents.filter((e) => !isExamEvent(e));

  // Filter tasks due on this date
  const dayTasks = tasks.filter((t) => t.due_date && isSameDayPHT(t.due_date, selectedDate));

  // Philippine holiday for this date
  const dayHoliday = combinedHolidays.find((h) => {
    const hd = parseDateLocal(h.date);
    return hd ? isSameDay(hd, selectedDate) : false;
  });

  const hasAnything = daySchedules.length > 0 || dayEvents.length > 0 || dayTasks.length > 0 || dayHoliday || activePeriods.length > 0;

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
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Day label */}
      <Text style={[styles.dayHeader, { color: colors.foreground }]}>{dateLabel}</Text>

      {/* Exam Period banners (amber) */}
      {activeExamPeriods.map((ew) => (
        <Pressable
          key={ew.id}
          style={[styles.holidayBanner, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}
          onPress={() => onExamWeekPress?.(ew)}
        >
          <GraduationCap size={15} color="#F59E0B" />
          <Text style={[styles.holidayText, { color: '#F59E0B' }]} numberOfLines={1} ellipsizeMode="tail">
            Exam Period — {getCleanPeriodTitle(ew.title)}
          </Text>
          <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '600', marginLeft: 'auto', flexShrink: 0 }}>Edit</Text>
        </Pressable>
      ))}

      {/* User Holiday banners (unified crimson red) - ZERO EMOTES */}
      {activeHolidayPeriods.map((ew) => (
        <Pressable
          key={ew.id}
          style={[styles.holidayBanner, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
          onPress={() => onExamWeekPress?.(ew)}
        >
          <CalendarDays size={15} color="#EF4444" />
          <Text style={[styles.holidayText, { color: '#EF4444' }]} numberOfLines={1} ellipsizeMode="tail">
            Holiday — {getCleanPeriodTitle(ew.title)}
          </Text>
          <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '600', marginLeft: 'auto', flexShrink: 0 }}>Edit</Text>
        </Pressable>
      ))}

      {/* Suspension banners (unified crimson red) - ZERO EMOTES */}
      {activeSuspensions.map((ew) => (
        <Pressable
          key={ew.id}
          style={[styles.holidayBanner, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
          onPress={() => onExamWeekPress?.(ew)}
        >
          <AlertTriangle size={15} color="#EF4444" />
          <Text style={[styles.holidayText, { color: '#EF4444' }]} numberOfLines={1} ellipsizeMode="tail">
            Class Suspension — {getCleanPeriodTitle(ew.title)}
          </Text>
          <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '600', marginLeft: 'auto', flexShrink: 0 }}>Edit</Text>
        </Pressable>
      ))}

      {/* Philippine Holiday / Suspension banner */}
      {dayHoliday ? (
        <View style={[
          styles.holidayBanner,
          { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' },
        ]}>
          <CalendarDays size={15} color="#EF4444" />
          <Text style={[styles.holidayText, { color: '#EF4444' }]} numberOfLines={1} ellipsizeMode="tail">
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
          <SectionHeader title="Exams" />
          {dayExams.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              isExam={true}
              onPress={() => onEventPress?.(e)}
              onEditPress={() => onEditEventPress?.(e)}
            />
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
              studentSet={currentSet}
              semesterRules={semesterRules}
              holidays={combinedHolidays}
              examWeeks={examWeeks}
              onPress={() => onClassPress?.(s)}
              onEditPress={() => onEditClassPress?.(s)}
            />
          ))}
        </View>
      ) : null}

      {/* One-off events */}
      {dayGeneralEvents.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Events & Activities" />
          {dayGeneralEvents.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              onPress={() => onEventPress?.(e)}
              onEditPress={() => onEditEventPress?.(e)}
            />
          ))}
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
              onPress={() => onTaskPress?.(t)}
              onEditPress={() => onEditTaskPress?.(t)}
              onToggleComplete={() => onToggleTask?.(t.id)}
            />
          ))}
        </View>
      ) : null}

      {/* Empty state */}
      {!hasAnything ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing scheduled</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>{emptySubtitle}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  dayHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  holidayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  holidayText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    includeFontPadding: false,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    includeFontPadding: false,
  },
  eventCard: {
    flexDirection: 'row',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
  },
  eventCardPressed: {
    opacity: 0.8,
    borderColor: '#6366F1',
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
    flexShrink: 0,
  },
  cardActionBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  eventMeta: {
    gap: 5,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    includeFontPadding: false,
  },
  setTypeTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    includeFontPadding: false,
  },
  setTypeTagB: {
    color: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  setTypeTagEveryWeek: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
  },
  taskCardCompleted: {
    opacity: 0.55,
  },
  taskCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
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
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
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
    flexShrink: 0,
  },
  taskDueLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
    includeFontPadding: false,
  },
  badgeCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  badgeCompletedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
    includeFontPadding: false,
  },
  subjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 120,
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
    includeFontPadding: false,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    gap: 8,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 18,
  },
});
