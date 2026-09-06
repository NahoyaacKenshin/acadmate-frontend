import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/src/components/ui/text';
import { Plus, CalendarDays, BookOpen, GraduationCap, ScanLine } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ApiService } from '@/src/services/api';

import { MonthGrid, Holiday } from '@/src/components/calendar/MonthGrid';
import { WeekStrip } from '@/src/components/calendar/WeekStrip';
import { DayView } from '@/src/components/calendar/DayView';
import { AddEventSheet } from '@/src/components/calendar/AddEventSheet';
import { AddClassSheet } from '@/src/components/calendar/AddClassSheet';
import { EditEventSheet } from '@/src/components/calendar/EditEventSheet';
import { EditClassSheet } from '@/src/components/calendar/EditClassSheet';
import { AddExamWeekModal } from '@/src/components/calendar/AddExamWeekModal';

import { useCalendarEvents, CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { useClassSchedules, ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { useTasks } from '@/src/hooks/useTasks';
import { useExamWeeks } from '@/src/hooks/useExamWeeks';

import { useAuthStore } from '@/src/features/auth/auth.store';

// Holidays will be fetched from the API

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
  const { user } = useAuthStore();

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  const [isMonthExpanded, setIsMonthExpanded] = useState(true);

  // Action menu (shown when + is tapped)
  const [actionMenuVisible, setActionMenuVisible] = useState(false);

  // Sheet visibility
  const [isAddEventVisible, setIsAddEventVisible] = useState(false);
  const [isAddExamVisible, setIsAddExamVisible] = useState(false);
  const [isAddClassVisible, setIsAddClassVisible] = useState(false);
  const [isAddExamWeekVisible, setIsAddExamWeekVisible] = useState(false);

  // Edit sheet state
  const [editingEvent, setEditingEvent] = useState<CalendarEventRow | null>(null);
  const [editingClass, setEditingClass] = useState<ClassScheduleRow | null>(null);
  const [editingExamWeek, setEditingExamWeek] = useState<import('@/src/hooks/useExamWeeks').ExamWeekRow | null>(null);

  // Data
  const { events } = useCalendarEvents();
  const { schedules } = useClassSchedules();
  const { tasks } = useTasks();
  const { examWeeks } = useExamWeeks();
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await ApiService.holidays.get(displayYear);
        const fetchedHolidays = res?.data || res || [];
        setHolidays(fetchedHolidays);
      } catch (err) {
        console.error('Failed to fetch holidays:', err);
      }
    };
    fetchHolidays();
  }, [displayYear]);

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

  const openAddExam = () => {
    setActionMenuVisible(false);
    setIsAddExamVisible(true);
  };

  const openAddClass = () => {
    setActionMenuVisible(false);
    setIsAddClassVisible(true);
  };

  const openAddExamWeek = () => {
    setActionMenuVisible(false);
    setIsAddExamWeekVisible(true);
  };

  const openScanSchedule = () => {
    setActionMenuVisible(false);
    router.push('/(app)/schedule-upload' as any);
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

              <Pressable style={styles.actionMenuItem} onPress={openAddExam}>
                <View style={styles.actionMenuIcon}>
                  <GraduationCap size={18} color="#8B5CF6" />
                </View>
                <View>
                  <Text style={styles.actionMenuLabel}>Add Exam / Quiz</Text>
                  <Text style={styles.actionMenuSub}>Subject test session & room</Text>
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

              <View style={styles.actionMenuDivider} />

              <Pressable style={styles.actionMenuItem} onPress={openAddExamWeek}>
                <View style={styles.actionMenuIcon}>
                  <GraduationCap size={18} color="#F59E0B" />
                </View>
                <View>
                  <Text style={styles.actionMenuLabel}>Add Exam Week</Text>
                  <Text style={styles.actionMenuSub}>Block out exam blackout period</Text>
                </View>
              </Pressable>

              <View style={styles.actionMenuDivider} />

              <Pressable style={styles.actionMenuItem} onPress={openScanSchedule}>
                <View style={styles.actionMenuIcon}>
                  <ScanLine size={18} color="#8B5CF6" />
                </View>
                <View>
                  <Text style={styles.actionMenuLabel}>Scan Schedule</Text>
                  <Text style={styles.actionMenuSub}>Upload PDF, photo or Word doc</Text>
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
            examWeeks={examWeeks}
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
          examWeeks={examWeeks}
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
          examWeeks={examWeeks}
          holidays={holidays}
          tasks={tasks}
          onClassPress={(s) => setEditingClass(s)}
          onEventPress={(e) => setEditingEvent(e)}
          onExamWeekPress={(ew) => setEditingExamWeek(ew)}
        />

        {/* Sheets */}
        <AddEventSheet
          visible={isAddEventVisible || isAddExamVisible}
          initialDate={selectedDate}
          isExamMode={isAddExamVisible}
          onClose={() => {
            setIsAddEventVisible(false);
            setIsAddExamVisible(false);
          }}
        />
        <AddClassSheet
          visible={isAddClassVisible}
          onClose={() => setIsAddClassVisible(false)}
        />
        <EditEventSheet
          visible={editingEvent !== null}
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
        />
        <EditClassSheet
          visible={editingClass !== null}
          schedule={editingClass}
          onClose={() => setEditingClass(null)}
        />
        <AddExamWeekModal
          visible={isAddExamWeekVisible || editingExamWeek !== null}
          initialData={editingExamWeek}
          onClose={() => {
            setIsAddExamWeekVisible(false);
            setEditingExamWeek(null);
          }}
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
    lineHeight: 36,
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

