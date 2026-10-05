import React, { useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet, PanResponder, Text } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { isScheduleActiveOnDate, parseDateLocal, getPeriodCategory, getPeriodColor, CALENDAR_THEME } from '@/src/utils/scheduleUtils';
import { isSameDayPHT } from '@/src/utils/philippineTime';
import { ExamWeekRow } from '@/src/hooks/useExamWeeks';
import { TaskRow } from '@/src/hooks/useTasks';
import { parseToPHTDate } from '@/src/utils/philippineTime';
import { useUserStore, computeCurrentSet, StudentSet } from '@/src/store/userStore';
import { useTheme } from '@/src/theme/useTheme';

export interface Holiday {
  id: string;
  date: string; // ISO date string "YYYY-MM-DD" or datetime
  name: string;
  type: 'REGULAR' | 'SPECIAL';
}

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed (0 = January)
  selectedDate: Date;
  events: CalendarEventRow[];
  schedules: ClassScheduleRow[];
  examWeeks: ExamWeekRow[];
  holidays: Holiday[];
  tasks?: TaskRow[];
  onDayPress: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
// Week starting Monday
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Returns (day + 6) % 7 so Monday = 0, Sunday = 6 */
function mondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/** Build 42 cells (6 rows × 7 cols, week starts Mon) */
function buildMonthCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const leadingBlanks = mondayIndex(firstDay);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);
  return cells;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
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

/** Collect up to 3 dot colors for a given calendar date */
function getDotColors(
  date: Date,
  events: CalendarEventRow[],
  schedules: ClassScheduleRow[],
  examWeeks: ExamWeekRow[],
  holidays: Holiday[],
  tasks?: TaskRow[],
  studentSet?: StudentSet | null,
): string[] {
  const colors: string[] = [];

  // 1. Holiday / Suspension dot (Crimson Red #EF4444)
  const dayHoliday = holidays.find((h) => {
    const hd = parseDateLocal(h.date) ?? new Date(h.date);
    return isSameDay(hd, date);
  });
  if (dayHoliday) {
    colors.push(CALENDAR_THEME.HOLIDAY_SUSPENSION);
  }

  // 2. User-defined period dots (EXAM = Amber, HOLIDAY/SUSPENSION = Crimson Red)
  for (const ew of examWeeks) {
    if (colors.length >= 3) break;
    const ewStart = parseDateLocal(ew.startDate);
    const ewEnd = parseDateLocal(ew.endDate) ?? ewStart;
    if (!ewStart || !ewEnd) continue;
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    if (target >= ewStart && target <= ewEnd) {
      const periodColor = getPeriodColor(getPeriodCategory(ew));
      if (!colors.includes(periodColor)) {
        colors.push(periodColor);
      }
      break;
    }
  }

  // 3. Class schedule dot (Class Blue #6C8EFF or Emerald)
  const activeClass = schedules.find((s) => isScheduleActiveOnDate(s, date, examWeeks, holidays, studentSet));
  if (activeClass && colors.length < 3 && !colors.includes(CALENDAR_THEME.CLASS)) {
    colors.push(CALENDAR_THEME.CLASS);
  }

  // 4. CalendarEvent dot / subject exams (Amber for exams, Indigo for events)
  const dayEvents = events.filter((e) => isEventActiveOnDate(e, date));
  for (const ev of dayEvents) {
    if (colors.length >= 3) break;
    const isExam =
      Boolean(ev.description?.toLowerCase().includes('exam')) ||
      Boolean(ev.title?.toLowerCase().includes('exam')) ||
      Boolean(ev.description?.startsWith('🎓')) ||
      Boolean(ev.title?.startsWith('🎓'));
    const dotColor = isExam ? CALENDAR_THEME.EXAM : CALENDAR_THEME.EVENT;
    if (!colors.includes(dotColor)) {
      colors.push(dotColor);
    }
  }

  // 5. Task dots (Emerald Green #10B981)
  if (tasks && colors.length < 3) {
    const dayTasks = tasks.filter((t) => t.due_date && isSameDayPHT(t.due_date, date));
    if (dayTasks.length > 0 && !colors.includes(CALENDAR_THEME.TASK)) {
      colors.push(CALENDAR_THEME.TASK);
    }
  }

  return colors;
}

export function MonthGrid({
  year,
  month,
  selectedDate,
  events,
  schedules,
  examWeeks,
  holidays,
  tasks,
  onDayPress,
  onPrevMonth,
  onNextMonth,
}: MonthGridProps) {
  const { colors, isDark } = useTheme();
  const { studentSet, anchorMonday, anchorSet } = useUserStore();
  const today = new Date();
  const todayNoTime = new Date();
  todayNoTime.setHours(0, 0, 0, 0);
  const cells = buildMonthCells(year, month);

  const onPrevMonthRef = useRef(onPrevMonth);
  const onNextMonthRef = useRef(onNextMonth);
  useEffect(() => {
    onPrevMonthRef.current = onPrevMonth;
    onNextMonthRef.current = onNextMonth;
  }, [onPrevMonth, onNextMonth]);

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
          onNextMonthRef.current();
        } else if (gestureState.dx > 40 || (gestureState.dx > 20 && gestureState.vx > 0.3)) {
          onPrevMonthRef.current();
        }
      },
    })
  ).current;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Month navigation header */}
      <View style={styles.header}>
        <Pressable
          onPress={onPrevMonth}
          style={[
            styles.navBtn,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            },
          ]}
          hitSlop={12}
        >
          <ChevronLeft size={18} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.foreground }]}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable
          onPress={onNextMonth}
          style={[
            styles.navBtn,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            },
          ]}
          hitSlop={12}
        >
          <ChevronRight size={18} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Weekday labels */}
      <View style={styles.dayLabelsRow}>
        {DAY_LABELS.map((label) => (
          <Text key={label} style={[styles.dayLabel, { color: colors.mutedForeground }]}>{label}</Text>
        ))}
      </View>

      {/* Day cells grid (6 rows × 7 cols) */}
      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (day === null) {
            return <View key={`empty-${idx}`} style={styles.cell} />;
          }

          const cellDate = new Date(year, month, day);
          const isToday = isSameDay(cellDate, today);
          const isSelected = isSameDay(cellDate, selectedDate);
          const isPast = cellDate < todayNoTime;
          const currentSetForCell = computeCurrentSet(studentSet, anchorMonday, anchorSet, cellDate);
          const dots = getDotColors(cellDate, events, schedules, examWeeks, holidays, tasks, currentSetForCell);

          return (
            <Pressable
              key={`day-${day}`}
              style={[styles.cell, isPast && styles.pastCell]}
              onPress={() => onDayPress(cellDate)}
            >
              {/* Day number bubble */}
              <View
                style={[
                  styles.dayBubble,
                  isSelected && styles.dayBubbleSelected,
                  !isSelected && isToday && styles.dayBubbleToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    { color: colors.foreground },
                    isSelected && styles.dayNumberSelected,
                    !isSelected && isToday && styles.dayNumberToday,
                  ]}
                >
                  {day}
                </Text>
              </View>

              {/* Event dots */}
              <View style={styles.dotsRow}>
                {dots.map((color, di) => (
                  <View
                    key={di}
                    style={[styles.dot, { backgroundColor: color }]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const CELL_SIZE = 38;

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 2,
  },
  pastCell: {
    opacity: 0.38,
  },
  dayBubble: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBubbleSelected: {
    backgroundColor: '#6366F1',
  },
  dayBubbleToday: {
    borderWidth: 1.5,
    borderColor: '#6366F1',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    includeFontPadding: false,
  },
  dayNumberSelected: {
    fontWeight: '700',
    color: '#ffffff',
  },
  dayNumberToday: {
    fontWeight: '700',
    color: '#6366F1',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
    marginTop: 2,
    height: 5,
  },
  dot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
  },
});
