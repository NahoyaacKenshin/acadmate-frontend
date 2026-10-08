import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, BookOpen, GraduationCap, CalendarRange, ScanLine } from 'lucide-react-native';
import {
  ActionMenuButton,
  ActionMenuDropdown,
  useActionMenu,
  ActionMenuItem,
} from '@/src/components/common/ActionMenuDropdown';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ApiService } from '@/src/services/api';
import { usePowerSync } from '@powersync/react';
import { NotificationService } from '@/src/services/notificationService';
import { parseToEpoch } from '@/src/utils/philippineTime';
import { parseDateLocal } from '@/src/utils/scheduleUtils';
import { useTheme } from '@/src/theme/useTheme';

import { MonthGrid, Holiday } from '@/src/components/calendar/MonthGrid';
import { WeekStrip } from '@/src/components/calendar/WeekStrip';
import { DayView } from '@/src/components/calendar/DayView';
import { AddEventSheet } from '@/src/components/calendar/AddEventSheet';
import { AddExamSheet } from '@/src/components/calendar/AddExamSheet';
import { AddClassSheet } from '@/src/components/calendar/AddClassSheet';
import { EditEventSheet } from '@/src/components/calendar/EditEventSheet';
import { EditClassSheet } from '@/src/components/calendar/EditClassSheet';
import { ClassDetailModal } from '@/src/components/calendar/ClassDetailModal';
import { EventDetailModal } from '@/src/components/calendar/EventDetailModal';
import { TaskDetailModal } from '@/src/components/tasks/TaskDetailModal';
import { EditTaskSheet } from '@/src/components/tasks/EditTaskSheet';
import { AddExamWeekModal } from '@/src/components/calendar/AddExamWeekModal';
import { StudySessionDetailModal } from '@/src/components/calendar/StudySessionDetailModal';
import { EditStudySessionSheet } from '@/src/components/calendar/EditStudySessionSheet';

import { useCalendarEvents, CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { useClassSchedules, ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { useTasks, TaskRow } from '@/src/hooks/useTasks';
import { useExamWeeks } from '@/src/hooks/useExamWeeks';
import { useAuthStore } from '@/src/features/auth/auth.store';

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
  const { colors, isDark } = useTheme();
  const today = startOfDay(new Date());
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ date?: string; t?: string }>();

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  const [isMonthExpanded, setIsMonthExpanded] = useState(true);

  // Sync selectedDate with incoming route parameter (e.g. from Today's Timeline tap)
  useEffect(() => {
    if (params.date) {
      const parsed = parseDateLocal(params.date) || new Date(params.date);
      if (!isNaN(parsed.getTime())) {
        const target = startOfDay(parsed);
        setSelectedDate(target);
        setDisplayYear(target.getFullYear());
        setDisplayMonth(target.getMonth());
      }
    }
  }, [params.date, params.t]);

  // Action menu hook
  const {
    isOpen: isMenuOpen,
    isMounted: isMenuMounted,
    anim: menuAnim,
    closeMenu: closeActionMenu,
    toggleMenu: toggleActionMenu,
  } = useActionMenu();

  // Sheet visibility
  const [isAddEventVisible, setIsAddEventVisible] = useState(false);
  const [isAddExamVisible, setIsAddExamVisible] = useState(false);
  const [isAddClassVisible, setIsAddClassVisible] = useState(false);
  const [isAddExamWeekVisible, setIsAddExamWeekVisible] = useState(false);

  // Edit sheet and view modal state
  const [editingEvent, setEditingEvent] = useState<CalendarEventRow | null>(null);
  const [viewingEvent, setViewingEvent] = useState<CalendarEventRow | null>(null);
  const [editingClass, setEditingClass] = useState<ClassScheduleRow | null>(null);
  const [viewingClass, setViewingClass] = useState<ClassScheduleRow | null>(null);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [viewingTask, setViewingTask] = useState<TaskRow | null>(null);
  const [editingExamWeek, setEditingExamWeek] = useState<import('@/src/hooks/useExamWeeks').ExamWeekRow | null>(null);
  const [viewingStudySession, setViewingStudySession] = useState<CalendarEventRow | null>(null);
  const [editingStudySession, setEditingStudySession] = useState<CalendarEventRow | null>(null);

  // Data
  const { events } = useCalendarEvents();
  const { schedules } = useClassSchedules();
  const { tasks } = useTasks();
  const { examWeeks } = useExamWeeks();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [headerHeight, setHeaderHeight] = useState(64);
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

  const handleDeleteStudySession = async (session: CalendarEventRow) => {
    try {
      await powerSync.execute(`DELETE FROM CalendarEvent WHERE id = ?`, [session.id]);
      await NotificationService.cancelNotification(session.id);
      setViewingStudySession(null);
    } catch (err) {
      console.error('[Calendar] Failed to delete study session:', err);
    }
  };

  const handleDayPress = (date: Date) => {
    setSelectedDate(startOfDay(date));
    setDisplayYear(date.getFullYear());
    setDisplayMonth(date.getMonth());
    closeActionMenu();
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

  const calendarMenuItems: ActionMenuItem[] = useMemo(() => [
    {
      id: 'event',
      label: 'Add Event',
      subtitle: 'One-off event or appointment',
      icon: CalendarDays,
      iconColor: '#8B5CF6',
      iconBg: isDark ? 'rgba(139, 92, 246, 0.18)' : 'rgba(139, 92, 246, 0.1)',
      onPress: openAddEvent,
    },
    {
      id: 'exam',
      label: 'Add Exam',
      subtitle: 'Subject exam session & room',
      icon: GraduationCap,
      iconColor: '#F59E0B',
      iconBg: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.1)',
      onPress: openAddExam,
    },
    {
      id: 'class',
      label: 'Add Class',
      subtitle: 'Recurring weekly class schedule',
      icon: BookOpen,
      iconColor: '#6366F1',
      iconBg: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.1)',
      onPress: openAddClass,
    },
    {
      id: 'period',
      label: 'Add Period / Holiday',
      subtitle: 'Exam week, holiday, or suspension',
      icon: CalendarRange,
      iconColor: '#EF4444',
      iconBg: isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.1)',
      onPress: openAddExamWeek,
    },
    {
      id: 'scan',
      label: 'Scan Schedule',
      subtitle: 'Upload PDF, photo or Word doc',
      icon: ScanLine,
      iconColor: '#6366F1',
      iconBg: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.1)',
      onPress: openScanSchedule,
    },
  ], [isDark]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>

        {/* Screen header */}
        <View
          style={styles.header}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        >
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Calendar</Text>
          <ActionMenuButton
            isOpen={isMenuOpen}
            onPress={toggleActionMenu}
            anim={menuAnim}
            accessibilityLabel="Add calendar item"
          />
        </View>

        {/* Action menu dropdown */}
        <ActionMenuDropdown
          isMounted={isMenuMounted}
          isOpen={isMenuOpen}
          anim={menuAnim}
          onClose={closeActionMenu}
          items={calendarMenuItems}
          top={headerHeight + 56}
          right={16}
        />

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
          onClassPress={(s) => setViewingClass(s)}
          onEditClassPress={(s) => setEditingClass(s)}
          onEventPress={(e) => setViewingEvent(e)}
          onEditEventPress={(e) => setEditingEvent(e)}
          onExamWeekPress={(ew) => setEditingExamWeek(ew)}
          onTaskPress={(t) => setViewingTask(t)}
          onEditTaskPress={(t) => setEditingTask(t)}
          onToggleTask={handleToggleTask}
          onStudySessionPress={(s) => setViewingStudySession(s)}
          onEditStudySessionPress={(s) => setEditingStudySession(s)}
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
        <ClassDetailModal
          visible={viewingClass !== null}
          schedule={viewingClass}
          onClose={() => setViewingClass(null)}
          onEdit={(s) => {
            setViewingClass(null);
            setEditingClass(s);
          }}
        />
        <EventDetailModal
          visible={viewingEvent !== null}
          event={viewingEvent}
          onClose={() => setViewingEvent(null)}
          onEdit={(e) => {
            setViewingEvent(null);
            setEditingEvent(e);
          }}
        />
        <TaskDetailModal
          visible={viewingTask !== null}
          task={viewingTask}
          onClose={() => setViewingTask(null)}
          onEdit={(t) => {
            setViewingTask(null);
            setEditingTask(t);
          }}
        />
        <EditTaskSheet
          visible={editingTask !== null}
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
        <AddExamWeekModal
          visible={isAddExamWeekVisible || editingExamWeek !== null}
          initialData={editingExamWeek}
          onClose={() => {
            setIsAddExamWeekVisible(false);
            setEditingExamWeek(null);
          }}
        />
        <StudySessionDetailModal
          visible={viewingStudySession !== null}
          event={viewingStudySession}
          onClose={() => setViewingStudySession(null)}
          onEdit={(s) => {
            setViewingStudySession(null);
            setEditingStudySession(s);
          }}
          onDelete={handleDeleteStudySession}
        />
        <EditStudySessionSheet
          visible={editingStudySession !== null}
          session={editingStudySession}
          onClose={() => setEditingStudySession(null)}
          onDelete={handleDeleteStudySession}
        />

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    zIndex: 150,
    elevation: 15,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
});
