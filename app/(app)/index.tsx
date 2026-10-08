import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Modal,
  Vibration,
  BackHandler,
  Alert,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import {
  BookOpen,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Wifi,
  WifiOff,
  RotateCw,
  Calendar,
  X,
  ChevronRight,
  Users,
  Radio,
  FileText,
  Pin,
  ArrowRight,
  GraduationCap,
  Pencil,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuthStore } from '@/src/features/auth/auth.store';
import { useUserStore, computeCurrentSet } from '@/src/store/userStore';
import { useNetworkSyncStatus } from '@/src/hooks/useNetworkSyncStatus';
import { NotificationService } from '@/src/services/notificationService';
import { useTasks, TaskRow } from '@/src/hooks/useTasks';
import { useClassSchedules, ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { useCalendarEvents, CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { useExamWeeks } from '@/src/hooks/useExamWeeks';
import { useHolidays } from '@/src/hooks/useHolidays';
import { useSemesterRules } from '@/src/hooks/useSemesterRules';
import { useNotebookStore } from '@/src/store/notebookStore';
import { usePowerSync } from '@powersync/react';
import { ClassDetailModal } from '@/src/components/calendar/ClassDetailModal';
import { EditClassSheet } from '@/src/components/calendar/EditClassSheet';
import { EventDetailModal } from '@/src/components/calendar/EventDetailModal';
import { EditEventSheet } from '@/src/components/calendar/EditEventSheet';
import { EditStudySessionSheet } from '@/src/components/calendar/EditStudySessionSheet';
import { TaskDetailModal } from '@/src/components/tasks/TaskDetailModal';
import { EditTaskSheet } from '@/src/components/tasks/EditTaskSheet';
import { isExamEvent } from '@/src/services/notificationService';
import { resolveScheduleForDate } from '@/src/utils/scheduleResolver';
import { isScheduleActiveOnDate, parseDateLocal, getPeriodCategory, getCleanPeriodTitle } from '@/src/utils/scheduleUtils';
import {
  getPhilippineToday,
  formatTime12,
  formatTimePHT,
  isTodayPHT,
  isOverduePHT,
  isTodayOrPastPHT,
  parseToEpoch,
} from '@/src/utils/philippineTime';
import { useTheme } from '@/src/theme/useTheme';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return isTodayPHT(dateStr);
}

function isTodayOrPast(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return isTodayOrPastPHT(dateStr);
}

function fmtTime(time: string | null | undefined): string {
  if (!time) return '';
  return formatTime12(time);
}

function fmtDue(iso: string | null): string {
  if (!iso) return '';
  const epoch = parseToEpoch(iso);
  if (epoch === null) return '';
  const diff = epoch - Date.now();
  if (diff < 0) return 'Overdue';
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'Due soon';
  if (hrs < 24) return `${hrs}h left`;
  return `${Math.ceil(hrs / 24)}d left`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good Morning';
  if (h >= 12 && h < 17) return 'Good Afternoon';
  if (h >= 17 && h < 21) return 'Good Evening';
  return 'Good Night';
}

function getTodayDateParam(): string {
  return getPhilippineToday();
}

function navigateToCalendarToday() {
  router.push({
    pathname: '/(app)/calendar' as any,
    params: { date: getTodayDateParam(), t: Date.now().toString() },
  });
}

// ── Urgent Task Card ──────────────────────────────────────────────────────────

function UrgentTaskCard({
  task,
  index,
  onComplete,
  onTap,
  onEdit,
}: {
  task: TaskRow;
  index: number;
  onComplete: (task: TaskRow) => void;
  onTap: (task: TaskRow) => void;
  onEdit?: (task: TaskRow) => void;
}) {
  const { colors, isDark } = useTheme();
  const isOverdue = task.due_date ? isOverduePHT(task.due_date) : false;
  const isTodayDue = task.due_date ? isTodayPHT(task.due_date) : false;
  const accentColor = isOverdue ? '#EF4444' : '#10B981';
  const dueTime = task.due_date ? formatTime12(task.due_date) : null;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70).springify()}
      style={[
        styles.urgentCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.urgentAccent, { backgroundColor: accentColor }]} />

      {/* 1-Tap Circular Checkbox */}
      <TouchableOpacity
        style={styles.urgentCheckbox}
        onPress={() => onComplete(task)}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <CheckCircle2 size={19} color={colors.mutedForeground} />
      </TouchableOpacity>

      {/* Tappable body → opens detail modal */}
      <Pressable
        style={styles.urgentContent}
        onPress={() => onTap(task)}
        android_ripple={{ color: colors.muted }}
      >
        <Text style={[styles.urgentTitle, { color: colors.foreground }]} numberOfLines={1}>
          {task.title}
        </Text>
        <View style={styles.urgentMeta}>
          {task.subject_name ? (
            <View style={[styles.urgentSubjectTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]}>
              <Text style={[styles.urgentSubject, { color: colors.mutedForeground }]} numberOfLines={1}>
                {task.subject_name}
              </Text>
            </View>
          ) : null}

          {isOverdue ? (
            <View
              style={[
                styles.urgentBadge,
                { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.1)' },
              ]}
            >
              <AlertTriangle size={10} color="#EF4444" />
              <Text style={[styles.urgentBadgeText, { color: '#EF4444' }]}>Overdue</Text>
            </View>
          ) : isTodayDue ? (
            <View
              style={[
                styles.urgentBadge,
                { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.1)' },
              ]}
            >
              <Clock size={10} color="#F59E0B" />
              <Text style={[styles.urgentBadgeText, { color: '#F59E0B' }]}>
                Due Today{dueTime ? ` · ${dueTime}` : ''}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.urgentBadge,
                { backgroundColor: colors.muted },
              ]}
            >
              <Clock size={10} color={colors.mutedForeground} />
              <Text style={[styles.urgentBadgeText, { color: colors.mutedForeground }]}>
                {fmtDue(task.due_date)}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      <View style={styles.urgentActions}>
        {onEdit ? (
          <TouchableOpacity
            style={[
              styles.urgentEditBtn,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            hitSlop={8}
            accessibilityLabel="Edit task"
          >
            <Pencil size={11} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
        <ChevronRight size={14} color={colors.mutedForeground} />
      </View>
    </Animated.View>
  );
}

// ── Class Timeline Item ───────────────────────────────────────────────────────

function ClassTimelineItem({
  label,
  time,
  color,
  room,
  modality,
  setLabel,
  index,
  onPress,
  onEditPress,
}: {
  label: string;
  time: string;
  color: string;
  room?: string;
  modality?: string;
  setLabel?: string;
  index: number;
  onPress?: () => void;
  onEditPress?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const isF2F = modality === 'F2F';
  const isOnline = modality === 'ONLINE';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      style={styles.timelineItemWrapper}
    >
      <TouchableOpacity
        style={[
          styles.timelineItem,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        activeOpacity={0.75}
        onPress={onPress}
      >
        <View style={styles.timelineTopRow}>
          <View style={[styles.timelineDot, { backgroundColor: color }]} />
          <View style={styles.timelineActionsRow}>
            {modality ? (
              <View style={[styles.modalityTag, { backgroundColor: color + '18' }]}>
                {isF2F ? (
                  <Users size={9} color={color} />
                ) : isOnline ? (
                  <Radio size={9} color={color} />
                ) : null}
                <Text style={[styles.modalityText, { color }]}>{modality}</Text>
              </View>
            ) : null}
            {onEditPress ? (
              <TouchableOpacity
                style={[
                  styles.timelineEditBtn,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' },
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  onEditPress();
                }}
                hitSlop={8}
                accessibilityLabel="Edit class schedule"
              >
                <Pencil size={11} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <View style={styles.timelineText}>
          <Text style={[styles.timelineLabel, { color: colors.foreground }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.timelineTime, { color: '#6366F1' }]}>{time}</Text>
          {room ? (
            <View style={styles.timelineMetaRow}>
              <MapPin size={10} color={colors.mutedForeground} />
              <Text style={[styles.timelineSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {room}
              </Text>
            </View>
          ) : null}
          {setLabel ? (
            <Text
              style={[
                styles.timelineSetLabel,
                {
                  color: '#6366F1',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  borderColor: 'rgba(99, 102, 241, 0.2)',
                },
              ]}
            >
              {setLabel}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Event Timeline Item ───────────────────────────────────────────────────────

function EventTimelineItem({
  event,
  index,
  onPress,
  onEditPress,
}: {
  event: CalendarEventRow;
  index: number;
  onPress?: () => void;
  onEditPress?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const isExam =
    event.color === '#F59E0B' ||
    Boolean(event.description?.startsWith('🎓')) ||
    Boolean(event.title?.startsWith('🎓')) ||
    Boolean(event.description?.toLowerCase().includes('exam')) ||
    Boolean(event.title?.toLowerCase().includes('exam')) ||
    isExamEvent(event);
  const accentColor = isExam ? '#F59E0B' : '#6366F1';

  let timeDisplay = 'All day';
  if (event.all_day !== 1 && event.start_date) {
    const startFmt = fmtTime(event.start_date);
    const endFmt = event.end_date ? fmtTime(event.end_date) : '';
    timeDisplay = endFmt && endFmt !== startFmt ? `${startFmt} – ${endFmt}` : (startFmt || 'Today');
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      style={styles.timelineItemWrapper}
    >
      <TouchableOpacity
        style={[
          styles.timelineItem,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        activeOpacity={0.75}
        onPress={onPress}
      >
        <View style={styles.timelineTopRow}>
          <View style={[styles.timelineDot, { backgroundColor: accentColor }]} />
          <View style={styles.timelineActionsRow}>
            <View style={[styles.eventTag, { backgroundColor: accentColor + '18' }]}>
              {isExam ? (
                <GraduationCap size={9} color={accentColor} />
              ) : (
                <Calendar size={9} color={accentColor} />
              )}
              <Text style={[styles.modalityText, { color: accentColor }]}>
                {isExam ? 'Exam' : 'Event'}
              </Text>
            </View>
            {onEditPress ? (
              <TouchableOpacity
                style={[
                  styles.timelineEditBtn,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' },
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  onEditPress();
                }}
                hitSlop={8}
                accessibilityLabel="Edit event"
              >
                <Pencil size={11} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <View style={styles.timelineText}>
          <Text style={[styles.timelineLabel, { color: colors.foreground }]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[styles.timelineTime, { color: accentColor }]}>{timeDisplay}</Text>
          {event.location ? (
            <View style={styles.timelineMetaRow}>
              <MapPin size={10} color={colors.mutedForeground} />
              <Text style={[styles.timelineSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Pinned Notebook Card ──────────────────────────────────────────────────────

function PinnedNotebookCard({
  notebook,
  index,
}: {
  notebook: import('@/src/components/notebook/NotebookCard').Notebook;
  index: number;
}) {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(180 + index * 50).springify()}
      style={styles.pinnedCardWrapper}
    >
      <TouchableOpacity
        style={[
          styles.pinnedCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        activeOpacity={0.75}
        onPress={() =>
          router.push({
            pathname: '/(app)/notebook/[id]' as any,
            params: { id: notebook.id, title: notebook.title },
          })
        }
      >
        <View
          style={[
            styles.pinnedCardIcon,
            {
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              borderColor: 'rgba(99, 102, 241, 0.2)',
            },
          ]}
        >
          <BookOpen size={16} color="#6366F1" />
        </View>
        <View style={styles.pinnedCardContent}>
          <Text style={[styles.pinnedCardTitle, { color: colors.foreground }]} numberOfLines={1}>
            {notebook.title}
          </Text>
          <View style={styles.pinnedCardMeta}>
            <FileText size={10} color={colors.mutedForeground} />
            <Text style={[styles.pinnedCardSub, { color: colors.mutedForeground }]}>
              {notebook.sourceCount} {notebook.sourceCount === 1 ? 'source' : 'sources'}
            </Text>
          </View>
        </View>
        <ChevronRight size={14} color={colors.mutedForeground} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

function StudentHomeScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const { nickname, studentSet, anchorMonday, anchorSet } = useUserStore();
  const powerSync = usePowerSync();

  // Dynamic reactive connection & sync status
  const networkStatus = useNetworkSyncStatus();

  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [viewingClass, setViewingClass] = useState<ClassScheduleRow | null>(null);
  const [editingClass, setEditingClass] = useState<ClassScheduleRow | null>(null);
  const [viewingEvent, setViewingEvent] = useState<CalendarEventRow | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEventRow | null>(null);
  const [editingStudySession, setEditingStudySession] = useState<CalendarEventRow | null>(null);

  const handleEditEventPress = (e: CalendarEventRow) => {
    const isStudySession =
      Boolean(e.location?.startsWith('study_session')) ||
      Boolean(e.title?.toLowerCase().startsWith('study session:')) ||
      Boolean(e.title?.toLowerCase().startsWith('study:'));

    if (isStudySession) {
      setEditingStudySession(e);
    } else {
      setEditingEvent(e);
    }
  };

  const handleCompleteTask = async (task: TaskRow) => {
    try {
      Vibration.vibrate(15);
    } catch {}
    const now = new Date().toISOString();
    try {
      await powerSync.execute(
        `UPDATE Task SET completed = 1, updatedAt = ? WHERE id = ?`,
        [now, task.id]
      );
      await NotificationService.cancelTaskNotifications(task.id);
    } catch (err) {
      console.error('[Home] Complete task failed:', err);
    }
  };

  const displayName = nickname || user?.name?.split(' ')[0] || 'Student';
  const greeting = getGreeting();

  // Android hardware back button — exit confirmation
  useFocusEffect(
    useCallback(() => {
      const handler = BackHandler.addEventListener('hardwareBackPress', () => {
        Alert.alert(
          'Exit AcadMate',
          'Are you sure you want to exit?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => {} },
            { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
          ]
        );
        return true;
      });
      return () => handler.remove();
    }, [])
  );

  const dateSubtitle = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  // ── Data ──
  const { tasks } = useTasks();
  const { schedules } = useClassSchedules();
  const { events } = useCalendarEvents();
  const { examWeeks = [] } = useExamWeeks();
  const { holidays = [] } = useHolidays();
  const { semesterRules = [] } = useSemesterRules();

  const { notebooks, pinnedIds } = useNotebookStore();

  // Urgent tasks: incomplete, due today or overdue — max 3
  const urgentTasks = useMemo<TaskRow[]>(() => {
    return tasks
      .filter((t) => t.completed === 0 && isTodayOrPast(t.due_date))
      .slice(0, 3);
  }, [tasks]);

  const pendingCount = useMemo(() => tasks.filter((t) => t.completed === 0).length, [tasks]);

  // Today's classes with full resolution
  const todayResolvedClasses = useMemo(() => {
    const today = new Date();
    const currentSet = computeCurrentSet(studentSet, anchorMonday, anchorSet, today);
    return schedules
      .filter((s) => isScheduleActiveOnDate(s, today, examWeeks, holidays, currentSet))
      .map((s) => ({
        schedule: s,
        resolution: resolveScheduleForDate(s, today, currentSet, semesterRules, holidays, examWeeks),
      }))
      .filter((item) => item.resolution.isActive)
      .sort((a, b) => a.schedule.start_time.localeCompare(b.schedule.start_time));
  }, [schedules, studentSet, anchorMonday, anchorSet, semesterRules, holidays, examWeeks]);

  // Today's exams and events
  const { todayExams, todayGeneralEvents } = useMemo(() => {
    const list = events
      .filter((e) => isToday(e.start_date))
      .sort((a, b) => {
        const ta = a.start_date?.substring(11, 16) ?? '00:00';
        const tb = b.start_date?.substring(11, 16) ?? '00:00';
        return ta.localeCompare(tb);
      });
    return {
      todayExams: list.filter(isExamEvent),
      todayGeneralEvents: list.filter((e) => !isExamEvent(e)),
    };
  }, [events]);

  const todayEvents = useMemo<CalendarEventRow[]>(() => {
    return [...todayExams, ...todayGeneralEvents];
  }, [todayExams, todayGeneralEvents]);

  // Pinned notebooks
  const pinnedNotebooks = useMemo(() => {
    return pinnedIds
      .map((id) => notebooks.find((nb) => nb.id === id))
      .filter(Boolean) as typeof notebooks;
  }, [pinnedIds, notebooks]);

  // Active today's period or holiday banner
  const todayPeriodInfo = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Check holidays & suspensions (Crimson Red #EF4444)
    const dayHol = holidays.find((h) => {
      const hd = parseDateLocal(h.date) ?? new Date(h.date);
      return (
        hd.getFullYear() === today.getFullYear() &&
        hd.getMonth() === today.getMonth() &&
        hd.getDate() === today.getDate()
      );
    });
    if (dayHol) {
      const isSuspension =
        dayHol.type === 'SUSPENSION' || dayHol.name?.toLowerCase().includes('suspension');
      return {
        type: isSuspension ? ('SUSPENSION' as const) : ('HOLIDAY' as const),
        categoryLabel: isSuspension ? 'Class Suspension' : 'Holiday',
        title: getCleanPeriodTitle(dayHol.name ?? ''),
        color: '#EF4444',
        bg: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
        border: isDark ? 'rgba(239, 68, 68, 0.28)' : 'rgba(239, 68, 68, 0.2)',
        badgeBg: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)',
      };
    }

    // 2. Check user-defined exam weeks & periods
    for (const ew of examWeeks) {
      const ewStart = parseDateLocal(ew.startDate);
      const ewEnd = parseDateLocal(ew.endDate) ?? ewStart;
      if (!ewStart || !ewEnd) continue;
      if (today >= ewStart && today <= ewEnd) {
        const cat = getPeriodCategory(ew);
        if (cat === 'EXAM') {
          return {
            type: 'EXAM' as const,
            categoryLabel: 'Exam Period',
            title: getCleanPeriodTitle(ew.title),
            color: '#F59E0B',
            bg: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
            border: isDark ? 'rgba(245, 158, 11, 0.28)' : 'rgba(245, 158, 11, 0.2)',
            badgeBg: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.12)',
          };
        } else {
          const isSusp = cat === 'SUSPENSION';
          return {
            type: isSusp ? ('SUSPENSION' as const) : ('HOLIDAY' as const),
            categoryLabel: isSusp ? 'Class Suspension' : 'Holiday',
            title: getCleanPeriodTitle(ew.title),
            color: '#EF4444',
            bg: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
            border: isDark ? 'rgba(239, 68, 68, 0.28)' : 'rgba(239, 68, 68, 0.2)',
            badgeBg: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)',
          };
        }
      }
    }

    return null;
  }, [holidays, examWeeks, isDark]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Header ── */}
        <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
          <View style={styles.heroLeft}>
            <View style={styles.greetingRow}>
              <Text style={[styles.greetingText, { color: colors.mutedForeground }]}>
                {greeting}
              </Text>
              <Text style={[styles.dateDot, { color: colors.mutedForeground }]}>·</Text>
              <Text style={[styles.dateSubtitle, { color: colors.mutedForeground }]}>
                {dateSubtitle}
              </Text>
            </View>
            <Text style={[styles.nameText, { color: colors.foreground }]}>{displayName}</Text>
          </View>

          {/* Network Sync Pill — flexShrink: 0 and includeFontPadding: false prevents clipping */}
          <View
            style={[
              styles.onlinePill,
              networkStatus === 'online'
                ? {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.2)',
                  }
                : networkStatus === 'syncing'
                ? {
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)',
                    borderColor: isDark ? 'rgba(99, 102, 241, 0.28)' : 'rgba(99, 102, 241, 0.2)',
                  }
                : {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
                    borderColor: isDark ? 'rgba(245, 158, 11, 0.28)' : 'rgba(245, 158, 11, 0.2)',
                  },
            ]}
          >
            {networkStatus === 'online' ? (
              <Wifi size={12} color="#10B981" />
            ) : networkStatus === 'syncing' ? (
              <RotateCw size={12} color="#6366F1" />
            ) : (
              <WifiOff size={12} color="#F59E0B" />
            )}
            <Text
              style={[
                styles.onlineText,
                {
                  color:
                    networkStatus === 'online'
                      ? '#10B981'
                      : networkStatus === 'syncing'
                      ? '#6366F1'
                      : '#F59E0B',
                },
              ]}
            >
              {networkStatus === 'online' ? 'Online' : networkStatus === 'syncing' ? 'Syncing...' : 'Offline'}
            </Text>
          </View>
        </Animated.View>

        {/* ── Stats Metric Cards ── */}
        <Animated.View
          entering={FadeInDown.delay(50).springify()}
          style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Pressable style={styles.statChip} onPress={() => router.push('/(app)/tasks' as any)}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{pendingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Pending</Text>
          </Pressable>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.statChip} onPress={navigateToCalendarToday}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{todayResolvedClasses.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Classes Today</Text>
          </Pressable>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.statChip} onPress={navigateToCalendarToday}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{todayEvents.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Events Today</Text>
          </Pressable>
        </Animated.View>

        {/* ── Active Period / Holiday Banner ── */}
        {todayPeriodInfo && (
          <Animated.View entering={FadeInDown.delay(70).springify()} style={styles.periodBannerWrap}>
            <TouchableOpacity
              style={[
                styles.periodBanner,
                { backgroundColor: todayPeriodInfo.bg, borderColor: todayPeriodInfo.border },
              ]}
              onPress={navigateToCalendarToday}
              activeOpacity={0.82}
            >
              <View style={[styles.periodIconWrap, { backgroundColor: todayPeriodInfo.badgeBg }]}>
                {todayPeriodInfo.type === 'EXAM' ? (
                  <GraduationCap size={18} color="#F59E0B" />
                ) : todayPeriodInfo.type === 'SUSPENSION' ? (
                  <AlertTriangle size={18} color="#EF4444" />
                ) : (
                  <Calendar size={18} color="#EF4444" />
                )}
              </View>

              <View style={styles.periodTextContainer}>
                <View style={styles.periodTagRow}>
                  <Text style={[styles.periodTagText, { color: todayPeriodInfo.color }]}>
                    {todayPeriodInfo.categoryLabel.toUpperCase()}
                  </Text>
                  <Text style={[styles.periodDot, { color: colors.mutedForeground }]}>·</Text>
                  <Text style={[styles.periodSubAction, { color: colors.mutedForeground }]}>
                    Classes Blocked
                  </Text>
                </View>
                <Text
                  style={[styles.periodBannerMainText, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {todayPeriodInfo.title}
                </Text>
              </View>

              <View style={styles.periodLinkWrap}>
                <Text style={[styles.periodLinkText, { color: todayPeriodInfo.color }]}>Calendar</Text>
                <ChevronRight size={14} color={todayPeriodInfo.color} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Urgent Tasks ── */}
        <Animated.View entering={FadeInDown.delay(90).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Urgent Tasks</Text>
          </View>

          {urgentTasks.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <CheckCircle2 size={20} color="#10B981" />
              <Text style={[styles.emptyCardText, { color: colors.mutedForeground }]}>
                All caught up. No urgent tasks right now.
              </Text>
            </View>
          ) : (
            urgentTasks.map((t, i) => (
              <UrgentTaskCard
                key={t.id}
                task={t}
                index={i}
                onComplete={handleCompleteTask}
                onTap={setSelectedTask}
                onEdit={(task) => setEditingTask(task)}
              />
            ))
          )}
        </Animated.View>

        {/* ── Classes Today ── */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Classes Today</Text>
          </View>

          {todayResolvedClasses.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <MapPin size={20} color={colors.mutedForeground} />
              <Text style={[styles.emptyCardText, { color: colors.mutedForeground }]}>
                No classes scheduled for today.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timelineScroll}
            >
              {todayResolvedClasses.map(({ schedule: s, resolution }, i) => (
                <ClassTimelineItem
                  key={s.id}
                  label={s.subject_name ?? 'Class'}
                  time={`${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`}
                  color={s.subject_color ?? '#6366F1'}
                  room={resolution.effectiveRoom ?? undefined}
                  modality={s.modality}
                  setLabel={resolution.reason !== 'Every Week' ? resolution.reason : undefined}
                  index={i}
                  onPress={() => setViewingClass(s)}
                  onEditPress={() => setEditingClass(s)}
                />
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* ── Exams Today ── */}
        {todayExams.length > 0 && (
          <Animated.View entering={FadeInDown.delay(135).springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Exams Today</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timelineScroll}
            >
              {todayExams.map((e, i) => (
                <EventTimelineItem
                  key={e.id}
                  event={e}
                  index={i}
                  onPress={() => setViewingEvent(e)}
                  onEditPress={() => setEditingEvent(e)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Events Today ── */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Events Today</Text>
          </View>

          {todayGeneralEvents.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Calendar size={20} color={colors.mutedForeground} />
              <Text style={[styles.emptyCardText, { color: colors.mutedForeground }]}>
                No events scheduled for today.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timelineScroll}
            >
              {todayGeneralEvents.map((e, i) => (
                <EventTimelineItem
                  key={e.id}
                  event={e}
                  index={i}
                  onPress={() => setViewingEvent(e)}
                  onEditPress={() => handleEditEventPress(e)}
                />
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* ── Study Workspace ── */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Study Workspace</Text>
          </View>

          {pinnedNotebooks.length === 0 ? (
            <TouchableOpacity
              style={[
                styles.pinnedEmptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              activeOpacity={0.75}
              onPress={() => router.push('/(app)/notebook' as any)}
            >
              <Pin size={18} color={colors.mutedForeground} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.pinnedEmptyTitle, { color: colors.foreground }]}>
                  No notebooks pinned yet
                </Text>
                <Text style={[styles.pinnedEmptySub, { color: colors.mutedForeground }]}>
                  Pin notebooks from the Notebooks page to access them quickly here.
                </Text>
              </View>
              <ArrowRight size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : (
            pinnedNotebooks.map((nb, i) => (
              <PinnedNotebookCard key={nb.id} notebook={nb} index={i} />
            ))
          )}
        </Animated.View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Task Detail Modal (Read-Only) */}
      <TaskDetailModal
        visible={selectedTask !== null}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onEdit={(t) => {
          setSelectedTask(null);
          setEditingTask(t);
        }}
      />

      {/* Edit Task Sheet */}
      <EditTaskSheet
        visible={editingTask !== null}
        task={editingTask}
        onClose={() => setEditingTask(null)}
      />

      {/* Class Detail Modal (Read-Only) */}
      <ClassDetailModal
        visible={viewingClass !== null}
        schedule={viewingClass}
        onClose={() => setViewingClass(null)}
        onEdit={(s) => {
          setViewingClass(null);
          setEditingClass(s);
        }}
      />

      {/* Edit Class Sheet */}
      <EditClassSheet
        visible={editingClass !== null}
        schedule={editingClass}
        onClose={() => setEditingClass(null)}
      />

      {/* Event Detail Modal (Read-Only) */}
      <EventDetailModal
        visible={viewingEvent !== null}
        event={viewingEvent}
        onClose={() => setViewingEvent(null)}
        onEdit={(e) => {
          setViewingEvent(null);
          handleEditEventPress(e);
        }}
      />

      {/* Edit Event Sheet */}
      <EditEventSheet
        visible={editingEvent !== null}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
      />

      {/* Edit Study Session Sheet */}
      <EditStudySessionSheet
        visible={editingStudySession !== null}
        session={editingStudySession}
        onClose={() => setEditingStudySession(null)}
      />
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  return <StudentHomeScreen />;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 130,
  },

  // Hero
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingTop: 8,
  },
  heroLeft: {
    flex: 1,
    marginRight: 12,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  dateDot: {
    fontSize: 12,
  },
  dateSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  nameText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.7,
  },

  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    flexShrink: 0,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
    flexShrink: 0,
    includeFontPadding: false,
    paddingRight: 2,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginBottom: 22,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statChip: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 2,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
    includeFontPadding: false,
    paddingHorizontal: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Urgent task card
  urgentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  urgentAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  urgentCheckbox: {
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentContent: {
    flex: 1,
    paddingVertical: 12,
    gap: 4,
  },
  urgentTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  urgentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  urgentSubjectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 110,
    flexShrink: 1,
  },
  urgentSubjectDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  urgentSubject: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
    includeFontPadding: false,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  urgentBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    includeFontPadding: false,
    flexShrink: 0,
    paddingRight: 4,
  },
  urgentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
    flexShrink: 0,
  },
  urgentEditBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyCardText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  // Timeline
  timelineScroll: {
    paddingBottom: 4,
    gap: 10,
  },
  timelineItemWrapper: {
    width: 182,
  },
  timelineItem: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  timelineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timelineEditBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  eventTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  modalityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 0,
    includeFontPadding: false,
    paddingRight: 4,
  },
  timelineText: {
    gap: 3,
  },
  timelineLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  timelineTime: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  timelineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  timelineSub: {
    fontSize: 10.5,
    flex: 1,
  },
  timelineSetLabel: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },

  // Pinned Notebooks
  pinnedCardWrapper: {
    marginBottom: 8,
  },
  pinnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  pinnedCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedCardContent: {
    flex: 1,
    gap: 3,
  },
  pinnedCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  pinnedCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinnedCardSub: {
    fontSize: 11,
  },

  pinnedEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
    gap: 12,
  },
  pinnedEmptyTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  pinnedEmptySub: {
    fontSize: 12,
    lineHeight: 17,
  },

  bottomPad: {
    height: 96,
  },

  // Active period banner
  periodBannerWrap: {
    marginBottom: 20,
  },
  periodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  periodIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  periodTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  periodTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  periodDot: {
    fontSize: 10,
  },
  periodSubAction: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  periodBannerMainText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  periodLinkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: 4,
    flexShrink: 0,
  },
  periodLinkText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 0,
    includeFontPadding: false,
  },
});
