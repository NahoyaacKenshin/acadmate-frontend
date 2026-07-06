import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '../ui/text';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { ClassScheduleRow } from '@/src/hooks/useClassSchedules';

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
  holidays: Holiday[];
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

/** Collect up to 3 dot colors for a given calendar date */
function getDotColors(
  date: Date,
  events: CalendarEventRow[],
  schedules: ClassScheduleRow[],
  holidays: Holiday[],
): string[] {
  const colors: string[] = [];

  // Holiday dot
  const isHoliday = holidays.some((h) => {
    const hd = new Date(h.date);
    return isSameDay(hd, date);
  });
  const holidayType = holidays.find((h) => isSameDay(new Date(h.date), date))?.type;
  if (isHoliday) {
    colors.push(holidayType === 'REGULAR' ? '#EF4444' : '#F59E0B');
  }

  // Class schedule dot (recurring — check dayOfWeek)
  const hasClass = schedules.some((s) => s.day_of_week === date.getDay());
  if (hasClass && colors.length < 3) {
    const sched = schedules.find((s) => s.day_of_week === date.getDay());
    colors.push(sched?.subject_color ?? '#6C8EFF');
  }

  // CalendarEvent dot (one-off — check startDate)
  const dayEvents = events.filter((e) => isSameDay(new Date(e.start_date), date));
  for (const ev of dayEvents) {
    if (colors.length >= 3) break;
    colors.push(ev.subject_color ?? ev.color ?? '#6C8EFF');
  }

  return colors;
}

export function MonthGrid({
  year,
  month,
  selectedDate,
  events,
  schedules,
  holidays,
  onDayPress,
  onPrevMonth,
  onNextMonth,
}: MonthGridProps) {
  const today = new Date();
  const cells = buildMonthCells(year, month);

  return (
    <View style={styles.container}>
      {/* Month navigation header */}
      <View style={styles.header}>
        <Pressable onPress={onPrevMonth} style={styles.navBtn} hitSlop={12}>
          <ChevronLeft size={20} color="#94A3B8" />
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable onPress={onNextMonth} style={styles.navBtn} hitSlop={12}>
          <ChevronRight size={20} color="#94A3B8" />
        </Pressable>
      </View>

      {/* Weekday labels */}
      <View style={styles.dayLabelsRow}>
        {DAY_LABELS.map((label) => (
          <Text key={label} style={styles.dayLabel}>{label}</Text>
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
          const dots = getDotColors(cellDate, events, schedules, holidays);

          return (
            <Pressable
              key={`day-${day}`}
              style={styles.cell}
              onPress={() => onDayPress(cellDate)}
            >
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

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161A26',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3143',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1A1F2E',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
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
    color: '#94A3B8',
    letterSpacing: 0.5,
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
  dayBubble: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
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
    fontSize: 14,
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
    marginTop: 2,
    height: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
