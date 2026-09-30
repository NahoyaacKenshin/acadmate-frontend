import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/src/components/ui/text';
import { Plus, CalendarDays, BookOpen, GraduationCap, ScanLine, X } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ApiService } from '@/src/services/api';
import { usePowerSync } from '@powersync/react';
import { NotificationService } from '@/src/services/notificationService';
import { parseToEpoch } from '@/src/utils/philippineTime';

import { MonthGrid, Holiday } from '@/src/components/calendar/MonthGrid';
import { WeekStrip } from '@/src/components/calendar/WeekStrip';
import { DayView } from '@/src/components/calendar/DayView';
import { AddEventSheet } from '@/src/components/calendar/AddEventSheet';
import { AddExamSheet } from '@/src/components/calendar/AddExamSheet';
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
  const menuAnim = useRef(new Animated.Value(0)).current;
  const btnRotate = useRef(new Animated.Value(0)).current;

  const toggleActionMenu = (forceClose = false) => {
    const toValue = (forceClose || actionMenuVisible) ? 0 : 1;
    setActionMenuVisible(!actionMenuVisible && !forceClose);
    Animated.parallel([
      Animated.spring(menuAnim, {
        toValue,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
      Animated.spring(btnRotate, {
        toValue,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
    ]).start();
  };

  const closeActionMenu = () => {
    setActionMenuVisible(false);
    Animated.parallel([
      Animated.spring(menuAnim, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }),
      Animated.spring(btnRotate, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }),
    ]).start();
  };

  const btnRotateDeg = btnRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const menuOpacity = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const menuTranslateY = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] });

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
  const powerSync = usePowerSync();

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

  const handleToggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newCompleted = task.completed === 0 ? 1 : 0;
    const now = new Date().toISOString();
    try {
      await powerSync.execute(
        `UPDATE Task SET completed = ?, updatedAt = ? WHERE id = ?`,
        [newCompleted, now, id]
      );
      if (newCompleted === 1) {
        await NotificationService.cancelTaskNotifications(id);
      } else if (task.due_date && (parseToEpoch(task.due_date) ?? 0) > Date.now()) {
        await NotificationService.scheduleTaskReminders(task);
      }
    } catch (err) {
      console.error('[Calendar] Toggle task failed:', err);
    }
  };

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
    closeActionMenu();
    setIsAddEventVisible(true);
  };

  const openAddExam = () => {
    closeActionMenu();
    setIsAddExamVisible(true);
  };

  const openAddClass = () => {
    closeActionMenu();
    setIsAddClassVisible(true);
  };

  const openAddExamWeek = () => {
    closeActionMenu();
    setIsAddExamWeekVisible(true);
  };

  const openScanSchedule = () => {
    closeActionMenu();
    router.push('/(app)/schedule-upload' as any);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.safeArea}>

        {/* Screen header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Calendar</Text>
          <Animated.View style={{ transform: [{ rotate: btnRotateDeg }] }}>
            <Pressable
              style={[styles.addBtn, actionMenuVisible && styles.addBtnActive]}
              onPress={() => toggleActionMenu()}
              hitSlop={8}
            >
              <Plus size={22} color={actionMenuVisible ? '#ffffff' : '#6C8EFF'} />
            </Pressable>
          </Animated.View>
        </View>

        {/* Action menu dropdown */}
        {actionMenuVisible && (
          <>
            {/* Backdrop to dismiss */}
            <Pressable
              style={[StyleSheet.absoluteFill, styles.menuBackdrop]}
              onPress={closeActionMenu}
            />
            <Animated.View
              style={[
                styles.actionMenu,
                { opacity: menuOpacity, transform: [{ translateY: menuTranslateY }] },
              ]}
            >
              {/* Menu header with close button */}
              <View style={styles.actionMenuHeader}>
                <Text style={styles.actionMenuTitle}>Add to Calendar</Text>
                <Pressable onPress={closeActionMenu} style={styles.actionMenuCloseBtn} hitSlop={8}>
                  <X size={16} color="#64748B" />
                </Pressable>
              </View>

              <View style={styles.actionMenuDivider} />

              <Pressable style={styles.actionMenuItem} onPress={openAddEvent}>
                <View style={[styles.actionMenuIcon, { backgroundColor: 'rgba(108,142,255,0.15)' }]}>
                  <CalendarDays size={18} color="#6C8EFF" />
                </View>
                <View style={styles.actionMenuText}>
                  <Text style={styles.actionMenuLabel}>Add Event</Text>
                  <Text style={styles.actionMenuSub}>One-off event or appointment</Text>
                </View>
              </Pressable>

              <View style={styles.actionMenuDivider} />

              <Pressable style={styles.actionMenuItem} onPress={openAddExam}>
                <View style={[styles.actionMenuIcon, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                  <GraduationCap size={18} color="#8B5CF6" />
                </View>
                <View style={styles.actionMenuText}>
                  <Text style={styles.actionMenuLabel}>Add Exam</Text>
                  <Text style={styles.actionMenuSub}>Subject exam session & room</Text>
                </View>
              </Pressable>

              <View style={styles.actionMenuDivider} />

              <Pressable style={styles.actionMenuItem} onPress={openAddClass}>
                <View style={[styles.actionMenuIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                  <BookOpen size={18} color="#10B981" />
                </View>
                <View style={styles.actionMenuText}>
                  <Text style={styles.actionMenuLabel}>Add Class</Text>
                  <Text style={styles.actionMenuSub}>Recurring weekly class schedule</Text>
                </View>
              </Pressable>

              <View style={styles.actionMenuDivider} />

              <Pressable style={styles.actionMenuItem} onPress={openAddExamWeek}>
                <View style={[styles.actionMenuIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                  <GraduationCap size={18} color="#F59E0B" />
                </View>
                <View style={styles.actionMenuText}>
                  <Text style={styles.actionMenuLabel}>Add Period / Holiday</Text>
                  <Text style={styles.actionMenuSub}>Exam week, holiday, or class suspension</Text>
                </View>
              </Pressable>

              <View style={styles.actionMenuDivider} />

              <Pressable style={styles.actionMenuItem} onPress={openScanSchedule}>
                <View style={[styles.actionMenuIcon, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                  <ScanLine size={18} color="#8B5CF6" />
                </View>
                <View style={styles.actionMenuText}>
                  <Text style={styles.actionMenuLabel}>Scan Schedule</Text>
                  <Text style={styles.actionMenuSub}>Upload PDF, photo or Word doc</Text>
                </View>
              </Pressable>
            </Animated.View>
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
            tasks={tasks}
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
          tasks={tasks}
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
          onToggleTask={handleToggleTask}
        />

        {/* Sheets */}
        <AddEventSheet
          visible={isAddEventVisible}
          initialDate={selectedDate}
          onClose={() => setIsAddEventVisible(false)}
        />
        <AddExamSheet
          visible={isAddExamVisible}
          initialDate={selectedDate}
          onClose={() => setIsAddExamVisible(false)}
          onOpenAddExamWeek={() => setIsAddExamWeekVisible(true)}
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
  menuBackdrop: {
    zIndex: 99,
  },
  actionMenu: {
    position: 'absolute',
    top: 64,
    right: 16,
    backgroundColor: '#161B2C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252D42',
    zIndex: 100,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
    minWidth: 240,
  },
  actionMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionMenuTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actionMenuCloseBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#1E2639',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A3448',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  actionMenuIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMenuText: {
    flex: 1,
  },
  actionMenuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E8EEFF',
  },
  actionMenuSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: '#1E2639',
    marginHorizontal: 14,
  },
});

