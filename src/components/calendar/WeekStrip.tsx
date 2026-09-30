import React, { useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet, PanResponder } from 'react-native';
import { Text } from '../ui/text';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react-native';
import { CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { Holiday } from './MonthGrid';
import { isScheduleActiveOnDate, parseDateLocal, getPeriodCategory, getPeriodColor } from '@/src/utils/scheduleUtils';
import { isSameDayPHT } from '@/src/utils/philippineTime';
import { ExamWeekRow } from '@/src/hooks/useExamWeeks';
import { TaskRow } from '@/src/hooks/useTasks';
import { parseToPHTDate } from '@/src/utils/philippineTime';
import { useUserStore, computeCurrentSet, StudentSet } from '@/src/store/userStore';

interface WeekStripProps {
  selectedDate: Date;
  events: CalendarEventRow[];
  schedules: ClassScheduleRow[];
  examWeeks: ExamWeekRow[];
  holidays: Holiday[];
  tasks?: TaskRow[];
  isMonthExpanded: boolean;
  onDayPress: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToggleMonth: () => void;
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Returns the Monday of the week containing `date` */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Build the 7-day array [Mon … Sun] for the week containing `date` */
function getWeekDays(date: Date): Date[] {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

/** Week date range label, e.g. "Jun 30 – Jul 6" */
function weekRangeLabel(days: Date[]): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const first = days[0];
  const last = days[6];
  const start = `${MONTHS[first.getMonth()]} ${first.getDate()}`;
  const end = `${MONTHS[last.getMonth()]} ${last.getDate()}`;
  return `${start} – ${end}`;
}

/** Check if an event falls on a given date (supports multi-day ranges) */
function isEventActiveOnDate(e: CalendarEventRow, targetDate: Date): boolean {
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
}

/** Dot colors for a single day (max 3) */
function getDayDots(
  date: Date,
  events: CalendarEventRow[],
  schedules: ClassScheduleRow[],
  examWeeks: ExamWeekRow[],
  holidays: Holiday[],
  tasks?: TaskRow[],
  studentSet?: StudentSet | null,
): string[] {
  const colors: string[] = [];
  // Holiday dot (Regular/Suspension = Red #EF4444, Special = Green #10B981)
  const dayHoliday = holidays.find((h) => {
    const hd = parseDateLocal(h.date) ?? new Date(h.date);
    return isSameDay(hd, date);
  });
  if (dayHoliday) {
    const isSpecial =
      dayHoliday.type === 'SPECIAL' ||
      (dayHoliday.type !== 'REGULAR' &&
        dayHoliday.type !== 'SUSPENSION' &&
        !dayHoliday.name?.toLowerCase().includes('suspension'));
    colors.push(isSpecial ? '#10B981' : '#EF4444');
  }

  // User-defined period dots — color depends on category (EXAM=amber, HOLIDAY=green, SUSPENSION=red)
  for (const ew of examWeeks) {
    if (colors.length >= 3) break;
    const ewStart = parseDateLocal(ew.startDate);
    const ewEnd = parseDateLocal(ew.endDate) ?? ewStart;
    if (!ewStart || !ewEnd) continue;
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    if (target >= ewStart && target <= ewEnd) {
      colors.push(getPeriodColor(getPeriodCategory(ew)));
      break; // one period dot per date is enough
    }
  }

  // Class schedule dot (recurring — respects bounds, blockers, and active Set)
  const cls = schedules.find((s) => isScheduleActiveOnDate(s, date, examWeeks, holidays, studentSet));
  if (cls && colors.length < 3) colors.push(cls.subject_color ?? '#6C8EFF');

  // Calendar events
  const dayEvents = events.filter((e) => isEventActiveOnDate(e, date));
  for (const ev of dayEvents) {
    if (colors.length >= 3) break;
    colors.push(ev.subject_color ?? ev.color ?? '#6C8EFF');
  }

  // Tasks (show task color on calendar)
  if (tasks && colors.length < 3) {
    const dayTasks = tasks.filter((t) => t.due_date && isSameDayPHT(t.due_date, date));
    for (const t of dayTasks) {
      if (colors.length >= 3) break;
      colors.push(t.color ?? t.subject_color ?? '#6C8EFF');
    }
  }

  return colors;
}

export function WeekStrip({
  selectedDate,
  events,
  schedules,
  examWeeks,
  holidays,
  tasks,
  isMonthExpanded,
  onDayPress,
  onPrevWeek,
  onNextWeek,
  onToggleMonth,
}: WeekStripProps) {
  const { studentSet, anchorMonday, anchorSet } = useUserStore();
  const today = new Date();
  const todayNoTime = new Date();
  todayNoTime.setHours(0, 0, 0, 0);
  const weekDays = getWeekDays(selectedDate);
  const rangeLabel = weekRangeLabel(weekDays);

  const onPrevWeekRef = useRef(onPrevWeek);
  const onNextWeekRef = useRef(onNextWeek);
  useEffect(() => {
    onPrevWeekRef.current = onPrevWeek;
    onNextWeekRef.current = onNextWeek;
  }, [onPrevWeek, onNextWeek]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2;
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2;
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx < -40 || (gestureState.dx < -20 && gestureState.vx < -0.3)) {
          onNextWeekRef.current();
        } else if (gestureState.dx > 40 || (gestureState.dx > 20 && gestureState.vx > 0.3)) {
          onPrevWeekRef.current();
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Week navigation row */}
      <View style={styles.navRow}>
        <Pressable onPress={onPrevWeek} style={styles.navBtn} hitSlop={12}>
          <ChevronLeft size={16} color="#94A3B8" />
        </Pressable>

        <Text style={styles.rangeLabel}>{rangeLabel}</Text>

        <Pressable onPress={onNextWeek} style={styles.navBtn} hitSlop={12}>
          <ChevronRight size={16} color="#94A3B8" />
        </Pressable>

        {/* Month expand/collapse toggle */}
        <Pressable onPress={onToggleMonth} style={styles.toggleBtn} hitSlop={12}>
          {isMonthExpanded
            ? <ChevronUp size={16} color="#6C8EFF" />
            : <ChevronDown size={16} color="#6C8EFF" />
          }
        </Pressable>
      </View>

      {/* Day cells */}
      <View style={styles.daysRow}>
        {weekDays.map((d, idx) => {
          const isSelected = isSameDay(d, selectedDate);
          const isToday = isSameDay(d, today);
          const isPast = d < todayNoTime;
          const currentSetForDay = computeCurrentSet(studentSet, anchorMonday, anchorSet, d);
          const dots = getDayDots(d, events, schedules, examWeeks, holidays, tasks, currentSetForDay);

          return (
            <Pressable
              key={idx}
              style={[styles.dayCell, isPast && styles.pastCell]}
              onPress={() => onDayPress(d)}
            >
              {/* Short day name */}
              <Text style={[
                styles.dayName,
                isSelected && styles.dayNameSelected,
              ]}>
                {DAY_SHORT[d.getDay()]}
              </Text>

              {/* Day number bubble */}
              <View style={[
                styles.dayBubble,
                isSelected && styles.dayBubbleSelected,
                !isSelected && isToday && styles.dayBubbleToday,
              ]}>
                <Text style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                  !isSelected && isToday && styles.dayNumberToday,
                ]}>
                  {d.getDate()}
                </Text>
              </View>

              {/* Dot indicators */}
              <View style={styles.dotsRow}>
                {dots.map((color, di) => (
                  <View key={di} style={[styles.dot, { backgroundColor: color }]} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const BUBBLE = 32;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#10131C',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3143',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  navBtn: {
    padding: 4,
    borderRadius: 6,
  },
  rangeLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  toggleBtn: {
    padding: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayCell: {
    alignItems: 'center',
    flex: 1,
  },
  pastCell: {
    opacity: 0.4,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  dayNameSelected: {
    color: '#6C8EFF',
    fontWeight: '700',
  },
  dayBubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBubbleSelected: {
    backgroundColor: '#6C8EFF',
  },
  dayBubbleToday: {
    borderWidth: 1.5,
    borderColor: '#6C8EFF',
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
  },
  dayNumberSelected: {
    fontWeight: '700',
    color: '#ffffff',
  },
  dayNumberToday: {
    fontWeight: '700',
    color: '#6C8EFF',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
    marginTop: 3,
    height: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

