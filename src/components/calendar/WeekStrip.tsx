import React from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from '../ui/text';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react-native';
import { CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { Holiday } from './MonthGrid';
import { isScheduleActiveOnDate, parseDateLocal } from '@/src/utils/scheduleUtils';
import { isSameDayPHT } from '@/src/utils/philippineTime';
import { ExamWeekRow } from '@/src/hooks/useExamWeeks';

interface WeekStripProps {
  selectedDate: Date;
  events: CalendarEventRow[];
  schedules: ClassScheduleRow[];
  examWeeks: ExamWeekRow[];
  holidays: Holiday[];
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

/** Dot colors for a single day (max 3) */
function getDayDots(
  date: Date,
  events: CalendarEventRow[],
  schedules: ClassScheduleRow[],
  examWeeks: ExamWeekRow[],
  holidays: Holiday[],
): string[] {
  const colors: string[] = [];
  const isHoliday = holidays.some((h) => isSameDay(new Date(h.date), date));
  if (isHoliday) {
    colors.push('#EF4444');
  }

  // Exam week dot (Amber)
  const isExamWeek = examWeeks.some((ew) => {
    const ewStart = parseDateLocal(ew.startDate);
    const ewEnd = parseDateLocal(ew.endDate) ?? ewStart;
    if (!ewStart || !ewEnd) return false;
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return target >= ewStart && target <= ewEnd;
  });
  if (isExamWeek && colors.length < 3) {
    colors.push('#F59E0B');
  }

  // Class schedule dot (recurring — respects bounds and blockers)
  const cls = schedules.find((s) => isScheduleActiveOnDate(s, date, examWeeks, holidays));
  if (cls && colors.length < 3) colors.push(cls.subject_color ?? '#6C8EFF');
  for (const ev of events) {
    if (colors.length >= 3) break;
    if (isSameDayPHT(ev.start_date, date)) {
      colors.push(ev.subject_color ?? ev.color ?? '#6C8EFF');
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
  isMonthExpanded,
  onDayPress,
  onPrevWeek,
  onNextWeek,
  onToggleMonth,
}: WeekStripProps) {
  const today = new Date();
  const todayNoTime = new Date();
  todayNoTime.setHours(0, 0, 0, 0);
  const weekDays = getWeekDays(selectedDate);
  const rangeLabel = weekRangeLabel(weekDays);

  return (
    <View style={styles.container}>
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
          const dots = getDayDots(d, events, schedules, examWeeks, holidays);

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

