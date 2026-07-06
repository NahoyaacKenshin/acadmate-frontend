import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { Text } from '@/src/components/ui/text';
import { Plus, CalendarDays, BookOpen } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { MonthGrid, Holiday } from '@/src/components/calendar/MonthGrid';
import { WeekStrip } from '@/src/components/calendar/WeekStrip';
import { DayView } from '@/src/components/calendar/DayView';
import { AddEventSheet } from '@/src/components/calendar/AddEventSheet';
import { AddClassSheet } from '@/src/components/calendar/AddClassSheet';

import { useCalendarEvents } from '@/src/hooks/useCalendarEvents';
import { useClassSchedules } from '@/src/hooks/useClassSchedules';
import { useTasks } from '@/src/hooks/useTasks';

// ── Placeholder holidays — FE2 will populate via GET /api/holidays ────────────
const PLACEHOLDER_HOLIDAYS: Holiday[] = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const today = startOfDay(new Date());

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  const [isMonthExpanded, setIsMonthExpanded] = useState(true);

  // Action menu (shown when + is tapped)
  const [actionMenuVisible, setActionMenuVisible] = useState(false);

  // Sheet visibility
  const [isAddEventVisible, setIsAddEventVisible] = useState(false);
  const [isAddClassVisible, setIsAddClassVisible] = useState(false);

  // Data
  const { events } = useCalendarEvents();
  const { schedules } = useClassSchedules();
  const { tasks } = useTasks();
  const holidays = PLACEHOLDER_HOLIDAYS;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDayPress = (date: Date) => {
    setSelectedDate(startOfDay(date));
    setDisplayYear(date.getFullYear());
    setDisplayMonth(date.getMonth());
    setActionMenuVisible(false);
  };

  const handlePrevMonth = () => {
    const d = new Date(displayYear, displayMonth - 1, 1);
    setDisplayYear(d.getFullYear());
    setDisplayMonth(d.getMonth());
  };

  const handleNextMonth = () => {
    const d = new Date(displayYear, displayMonth + 1, 1);
    setDisplayYear(d.getFullYear());
    setDisplayMonth(d.getMonth());
  };

  const handlePrevWeek = () => {
    setSelectedDate((prev) => {
      const next = addDays(prev, -7);
      setDisplayYear(next.getFullYear());
      setDisplayMonth(next.getMonth());
      return next;
    });
  };

  const handleNextWeek = () => {
    setSelectedDate((prev) => {
      const next = addDays(prev, 7);
      setDisplayYear(next.getFullYear());
      setDisplayMonth(next.getMonth());
      return next;
    });
  };

  const handleToggleMonth = () => setIsMonthExpanded((prev) => !prev);

  const openAddEvent = () => {
    setActionMenuVisible(false);
    setIsAddEventVisible(true);
  };

  const openAddClass = () => {
    setActionMenuVisible(false);
    setIsAddClassVisible(true);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.safeArea}>

        {/* Screen header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Calendar</Text>
          <Pressable
            style={[styles.addBtn, actionMenuVisible && styles.addBtnActive]}
            onPress={() => setActionMenuVisible((v) => !v)}
            hitSlop={8}
          >
            <Plus size={22} color={actionMenuVisible ? '#ffffff' : '#6C8EFF'} />
          </Pressable>
        </View>

        {/* Action menu dropdown */}
        {actionMenuVisible && (
          <>
            {/* Backdrop to dismiss */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setActionMenuVisible(false)}
            />
            <View style={styles.actionMenu}>
              <Pressable style={styles.actionMenuItem} onPress={openAddEvent}>
                <View style={styles.actionMenuIcon}>
                  <CalendarDays size={18} color="#6C8EFF" />
                </View>
                <View>
                  <Text style={styles.actionMenuLabel}>Add Event</Text>
                  <Text style={styles.actionMenuSub}>One-off event or appointment</Text>
                </View>
              </Pressable>

              <View style={styles.actionMenuDivider} />

              <Pressable style={styles.actionMenuItem} onPress={openAddClass}>
                <View style={styles.actionMenuIcon}>
                  <BookOpen size={18} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.actionMenuLabel}>Add Class</Text>
                  <Text style={styles.actionMenuSub}>Recurring weekly class schedule</Text>
                </View>
              </Pressable>
            </View>
          </>
        )}

        {/* Month grid (collapsible) */}
        {isMonthExpanded && (
          <MonthGrid
            year={displayYear}
            month={displayMonth}
            selectedDate={selectedDate}
            events={events}
            schedules={schedules}
            holidays={holidays}
            onDayPress={handleDayPress}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
        )}

        {/* Week strip (always visible) */}
        <WeekStrip
          selectedDate={selectedDate}
          events={events}
          schedules={schedules}
          holidays={holidays}
          isMonthExpanded={isMonthExpanded}
          onDayPress={handleDayPress}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onToggleMonth={handleToggleMonth}
        />

        {/* Day event list */}
        <DayView
          selectedDate={selectedDate}
          events={events}
          schedules={schedules}
          holidays={holidays}
          tasks={tasks}
        />

        {/* Sheets */}
        <AddEventSheet
          visible={isAddEventVisible}
          initialDate={selectedDate}
          onClose={() => setIsAddEventVisible(false)}
        />
        <AddClassSheet
          visible={isAddClassVisible}
          onClose={() => setIsAddClassVisible(false)}
        />

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#10131C' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3143',
    backgroundColor: '#161A26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnActive: {
    backgroundColor: '#6C8EFF',
    borderColor: '#6C8EFF',
  },

  // Action menu
  actionMenu: {
    position: 'absolute',
    top: 64,
    right: 20,
    backgroundColor: '#161A26',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3143',
    zIndex: 100,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    minWidth: 220,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  actionMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1A1F2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMenuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionMenuSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: '#2A3143',
    marginHorizontal: 16,
  },
});

