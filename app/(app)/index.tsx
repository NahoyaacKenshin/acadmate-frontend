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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Text } from '@/src/components/ui/text';
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
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuthStore } from '@/src/features/auth/auth.store';
import { useUserStore, computeCurrentSet } from '@/src/store/userStore';
import { useNetworkSyncStatus } from '@/src/hooks/useNetworkSyncStatus';
import { NotificationService } from '@/src/services/notificationService';
import { useTasks, TaskRow } from '@/src/hooks/useTasks';
import { useClassSchedules } from '@/src/hooks/useClassSchedules';
import { useCalendarEvents, CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { useExamWeeks } from '@/src/hooks/useExamWeeks';
import { useHolidays } from '@/src/hooks/useHolidays';
import { useSemesterRules } from '@/src/hooks/useSemesterRules';
import { useNotebookStore } from '@/src/store/notebookStore';
import { usePowerSync } from '@powersync/react';
import { resolveScheduleForDate } from '@/src/utils/scheduleResolver';
import { isScheduleActiveOnDate } from '@/src/utils/scheduleUtils';
import {
  getPhilippineToday,
  formatTime12,
  formatTimePHT,
  isTodayPHT,
  isOverduePHT,
  isTodayOrPastPHT,
  parseToEpoch,
} from '@/src/utils/philippineTime';

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

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: 'Good Morning', emoji: '☀️' };
  if (h >= 12 && h < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
  if (h >= 17 && h < 21) return { text: 'Good Evening', emoji: '🌇' };
  return { text: 'Good Night', emoji: '🌙' };
}

function getTodayDateParam(): string {
  const d = getPhilippineToday();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function navigateToCalendarToday() {
  router.push({
    pathname: '/(app)/calendar' as any,
    params: { date: getTodayDateParam(), t: Date.now().toString() },
  });
}

// ── Task Detail Modal ─────────────────────────────────────────────────────────

function TaskDetailModal({ task, onClose }: { task: TaskRow | null; onClose: () => void }) {
  if (!task) return null;
  const isOverdue = task.due_date ? isOverduePHT(task.due_date) : false;
  const isTodayDue = task.due_date ? isTodayPHT(task.due_date) : false;
  const color = task.subject_color ?? task.color ?? '#6C8EFF';
  const dueTime = task.due_date ? formatTimePHT(task.due_date) : null;
  const fmtDueLabel = fmtDue(task.due_date);

  let dueBg = 'rgba(108,142,255,0.12)';
  let dueTextColor = '#94A3B8';
  if (isOverdue) { dueBg = 'rgba(239,68,68,0.12)'; dueTextColor = '#FCA5A5'; }
  else if (isTodayDue) { dueBg = 'rgba(252,211,77,0.12)'; dueTextColor = '#FCD34D'; }

  return (
    <Modal visible={!!task} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.taskDetailSheet}>
        {/* Handle */}
        <View style={styles.taskDetailHandle} />

        {/* Header */}
        <View style={styles.taskDetailHeader}>
          <View style={[styles.taskDetailAccent, { backgroundColor: color }]} />
          <View style={styles.taskDetailHeaderText}>
            <Text style={styles.taskDetailTitle}>{task.title}</Text>
            {task.subject_name ? (
              <View style={[styles.taskDetailSubjectTag, { backgroundColor: color + '22' }]}>
                <View style={[styles.taskDetailSubjectDot, { backgroundColor: color }]} />
                <Text style={[styles.taskDetailSubjectName, { color }]} numberOfLines={1}>
                  {task.subject_name}
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable onPress={onClose} style={styles.taskDetailCloseBtn} hitSlop={10}>
            <X size={20} color="#64748B" />
          </Pressable>
        </View>

        {/* Due Date */}
        {task.due_date ? (
          <View style={[styles.taskDetailDueRow, { backgroundColor: dueBg }]}>
            <Clock size={14} color={dueTextColor} />
            <Text style={[styles.taskDetailDueText, { color: dueTextColor }]}>
              {isOverdue ? 'Overdue' : isTodayDue ? `Due Today${dueTime ? ` · ${dueTime}` : ''}` : fmtDueLabel}
            </Text>
          </View>
        ) : (
          <View style={[styles.taskDetailDueRow, { backgroundColor: 'rgba(100,116,139,0.08)' }]}>
            <Clock size={14} color="#64748B" />
            <Text style={[styles.taskDetailDueText, { color: '#64748B' }]}>No due date set</Text>
          </View>
        )}

        {/* Description */}
        <View style={styles.taskDetailBody}>
          {task.description ? (
            <Text style={styles.taskDetailDescription}>{task.description}</Text>
          ) : (
            <Text style={styles.taskDetailDescriptionEmpty}>No description provided.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Urgent Task Card ──────────────────────────────────────────────────────────

function UrgentTaskCard({
  task,
  index,
  onComplete,
  onTap,
}: {
  task: TaskRow;
  index: number;
  onComplete: (task: TaskRow) => void;
  onTap: (task: TaskRow) => void;
}) {
  const isOverdue = task.due_date ? isOverduePHT(task.due_date) : false;
  const isTodayDue = task.due_date ? isTodayPHT(task.due_date) : false;
  const color = task.subject_color ?? '#6C8EFF';
  const dueTime = task.due_date ? formatTime12(task.due_date) : null;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      style={styles.urgentCard}
    >
      <View style={[styles.urgentAccent, { backgroundColor: color }]} />

      {/* 1-Tap Circular Checkbox */}
      <TouchableOpacity
        style={styles.urgentCheckbox}
        onPress={() => onComplete(task)}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <CheckCircle2 size={20} color="#3A4455" />
      </TouchableOpacity>

      {/* Tappable body → opens detail modal */}
      <Pressable style={styles.urgentContent} onPress={() => onTap(task)} android_ripple={{ color: '#ffffff08' }}>
        <Text style={styles.urgentTitle} numberOfLines={1}>{task.title}</Text>
        <View style={styles.urgentMeta}>
          {task.subject_name ? (
            <View style={[styles.urgentSubjectTag, { backgroundColor: color + '22' }]}>
              <View style={[styles.urgentSubjectDot, { backgroundColor: color }]} />
              <Text style={[styles.urgentSubject, { color }]} numberOfLines={1}>
                {task.subject_name}
              </Text>
            </View>
          ) : null}

          {isOverdue ? (
            <View style={[styles.urgentBadge, styles.urgentBadgeRed]}>
              <AlertTriangle size={10} color="#FCA5A5" />
              <Text style={[styles.urgentBadgeText, styles.urgentBadgeTextRed]}>Overdue</Text>
            </View>
          ) : isTodayDue ? (
            <View style={styles.urgentBadge}>
              <Clock size={10} color="#FCD34D" />
              <Text style={styles.urgentBadgeText}>
                Due Today{dueTime ? ` · ${dueTime}` : ''}
              </Text>
            </View>
          ) : (
            <View style={styles.urgentBadge}>
              <Clock size={10} color="#94A3B8" />
              <Text style={[styles.urgentBadgeText, { color: '#94A3B8' }]}>
                {fmtDue(task.due_date)}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      <ChevronRight size={14} color="#3A4455" style={{ marginRight: 10 }} />
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
}: {
  label: string;
  time: string;
  color: string;
  room?: string;
  modality?: string;
  setLabel?: string;
  index: number;
}) {
  const isF2F = modality === 'F2F';
  const isOnline = modality === 'ONLINE';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 55).springify()}
      style={styles.timelineItemWrapper}
    >
      <TouchableOpacity
        style={styles.timelineItem}
        activeOpacity={0.75}
        onPress={navigateToCalendarToday}
      >
        <View style={styles.timelineTopRow}>
          <View style={[styles.timelineDot, { backgroundColor: color }]} />
          {modality ? (
            <View style={[styles.modalityTag, { backgroundColor: color + '22' }]}>
              {isF2F
                ? <Users size={9} color={color} />
                : isOnline
                  ? <Radio size={9} color={color} />
                  : null}
              <Text style={[styles.modalityText, { color }]}>{modality}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.timelineText}>
          <Text style={styles.timelineLabel} numberOfLines={1}>{label}</Text>
          <Text style={styles.timelineTime}>{time}</Text>
          {room ? (
            <View style={styles.timelineMetaRow}>
              <MapPin size={9} color="#64748B" />
              <Text style={styles.timelineSub} numberOfLines={1}>{room}</Text>
            </View>
          ) : null}
          {setLabel ? (
            <Text style={styles.timelineSetLabel}>{setLabel}</Text>
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
}: {
  event: CalendarEventRow;
  index: number;
}) {
  const accentColor = event.color ?? event.subject_color ?? '#10B981';
  let timeDisplay = 'All day';
  if (event.all_day !== 1 && event.start_date) {
    const startFmt = fmtTime(event.start_date);
    const endFmt = event.end_date ? fmtTime(event.end_date) : '';
    timeDisplay = endFmt && endFmt !== startFmt ? `${startFmt} – ${endFmt}` : (startFmt || 'Today');
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 55).springify()}
      style={styles.timelineItemWrapper}
    >
      <TouchableOpacity
        style={[styles.timelineItem, styles.eventTimelineItem]}
        activeOpacity={0.75}
        onPress={navigateToCalendarToday}
      >
        <View style={styles.timelineTopRow}>
          <View style={[styles.timelineDot, { backgroundColor: accentColor }]} />
          <View style={[styles.eventTag, { backgroundColor: accentColor + '22' }]}>
            <Calendar size={9} color={accentColor} />
            <Text style={[styles.modalityText, { color: accentColor }]}>Event</Text>
          </View>
        </View>
        <View style={styles.timelineText}>
          <Text style={styles.timelineLabel} numberOfLines={1}>{event.title}</Text>
          <Text style={[styles.timelineTime, { color: accentColor }]}>{timeDisplay}</Text>
          {event.location ? (
            <View style={styles.timelineMetaRow}>
              <MapPin size={9} color="#64748B" />
              <Text style={styles.timelineSub} numberOfLines={1}>{event.location}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Pinned Notebook Card ──────────────────────────────────────────────────────

function PinnedNotebookCard({ notebook, index }: { notebook: import('@/src/components/notebook/NotebookCard').Notebook; index: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(200 + index * 60).springify()}
      style={styles.pinnedCardWrapper}
    >
      <TouchableOpacity
        style={styles.pinnedCard}
        activeOpacity={0.75}
        onPress={() => router.push({ pathname: '/(app)/notebook/[id]' as any, params: { id: notebook.id, title: notebook.title } })}
      >
        <View style={styles.pinnedCardIcon}>
          <BookOpen size={18} color="#F59E0B" />
        </View>
        <View style={styles.pinnedCardContent}>
          <Text style={styles.pinnedCardTitle} numberOfLines={1}>{notebook.title}</Text>
          <View style={styles.pinnedCardMeta}>
            <FileText size={10} color="#64748B" />
            <Text style={styles.pinnedCardSub}>{notebook.sourceCount} {notebook.sourceCount === 1 ? 'source' : 'sources'}</Text>
          </View>
        </View>
        <ChevronRight size={14} color="#3A4455" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

function StudentHomeScreen() {
  const { user } = useAuthStore();
  const { nickname, studentSet, anchorMonday, anchorSet } = useUserStore();
  const powerSync = usePowerSync();

  // Dynamic reactive connection & sync status
  const networkStatus = useNetworkSyncStatus();

  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);

  const handleCompleteTask = async (task: TaskRow) => {
    try { Vibration.vibrate(15); } catch { }
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
            { text: 'Cancel', style: 'cancel', onPress: () => { } },
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

  // Today's events
  const todayEvents = useMemo<CalendarEventRow[]>(() => {
    return events
      .filter((e) => isToday(e.start_date))
      .sort((a, b) => {
        const ta = a.start_date?.substring(11, 16) ?? '00:00';
        const tb = b.start_date?.substring(11, 16) ?? '00:00';
        return ta.localeCompare(tb);
      });
  }, [events]);

  // Pinned notebooks
  const pinnedNotebooks = useMemo(() => {
    return pinnedIds
      .map((id) => notebooks.find((nb) => nb.id === id))
      .filter(Boolean) as typeof notebooks;
  }, [pinnedIds, notebooks]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Header ── */}
        <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
          <View style={styles.heroLeft}>
            <View style={styles.greetingRow}>
              <Text style={styles.greetingText}>{greeting.text} {greeting.emoji}</Text>
              <Text style={styles.dateDot}>·</Text>
              <Text style={styles.dateSubtitle}>{dateSubtitle}</Text>
            </View>
            <Text style={styles.nameText}>{displayName}</Text>
          </View>
          <View style={[
            styles.onlinePill,
            networkStatus === 'online'
              ? styles.onlinePillGreen
              : networkStatus === 'syncing'
                ? styles.onlinePillBlue
                : styles.onlinePillAmber
          ]}>
            {networkStatus === 'online' ? (
              <Wifi size={12} color="#34D399" />
            ) : networkStatus === 'syncing' ? (
              <RotateCw size={12} color="#6C8EFF" />
            ) : (
              <WifiOff size={12} color="#F59E0B" />
            )}
            <Text style={[
              styles.onlineText,
              networkStatus === 'online'
                ? styles.onlineTextGreen
                : networkStatus === 'syncing'
                  ? styles.onlineTextBlue
                  : styles.onlineTextAmber
            ]}>
              {networkStatus === 'online' ? 'Online' : networkStatus === 'syncing' ? 'Syncing...' : 'Offline'}
            </Text>
          </View>
        </Animated.View>

        {/* ── Stats Row ── */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.statsRow}>
          <Pressable style={styles.statChip} onPress={() => router.push('/(app)/tasks' as any)}>
            <Text style={styles.statNum}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </Pressable>
          <View style={styles.statDivider} />
          <Pressable style={styles.statChip} onPress={navigateToCalendarToday}>
            <Text style={styles.statNum}>{todayResolvedClasses.length}</Text>
            <Text style={styles.statLabel}>Classes Today</Text>
          </Pressable>
          <View style={styles.statDivider} />
          <Pressable style={styles.statChip} onPress={navigateToCalendarToday}>
            <Text style={styles.statNum}>{todayEvents.length}</Text>
            <Text style={styles.statLabel}>Events Today</Text>
          </Pressable>
        </Animated.View>

        {/* ── Urgent Tasks ── */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <AlertTriangle size={15} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Urgent Tasks</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(app)/tasks' as any)}>
              <Text style={styles.sectionLink}>See all →</Text>
            </TouchableOpacity>
          </View>

          {urgentTasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <CheckCircle2 size={22} color="#10B981" />
              <Text style={styles.emptyCardText}>All caught up! No urgent tasks.</Text>
            </View>
          ) : (
            urgentTasks.map((t, i) => (
              <UrgentTaskCard
                key={t.id}
                task={t}
                index={i}
                onComplete={handleCompleteTask}
                onTap={setSelectedTask}
              />
            ))
          )}
        </Animated.View>

        {/* ── Today's Classes ── */}
        <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Clock size={15} color="#6C8EFF" />
              <Text style={styles.sectionTitle}>Classes Today</Text>
            </View>
            <TouchableOpacity onPress={navigateToCalendarToday}>
              <Text style={styles.sectionLink}>Calendar →</Text>
            </TouchableOpacity>
          </View>

          {todayResolvedClasses.length === 0 ? (
            <View style={styles.emptyCard}>
              <MapPin size={22} color="#2A3143" />
              <Text style={styles.emptyCardText}>No classes scheduled for today.</Text>
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
                  color={s.subject_color ?? '#6C8EFF'}
                  room={resolution.effectiveRoom ?? undefined}
                  modality={s.modality}
                  setLabel={resolution.reason !== 'Every Week' ? resolution.reason : undefined}
                  index={i}
                />
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* ── Today's Events ── */}
        <Animated.View entering={FadeInDown.delay(170).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Calendar size={15} color="#10B981" />
              <Text style={styles.sectionTitle}>Events Today</Text>
            </View>
            <TouchableOpacity onPress={navigateToCalendarToday}>
              <Text style={[styles.sectionLink, { color: '#10B981' }]}>Calendar →</Text>
            </TouchableOpacity>
          </View>

          {todayEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Calendar size={22} color="#2A3143" />
              <Text style={styles.emptyCardText}>No events scheduled for today. Enjoy the free time!</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timelineScroll}
            >
              {todayEvents.map((e, i) => (
                <EventTimelineItem key={e.id} event={e} index={i} />
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* ── Study Workspace ── */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <BookOpen size={15} color="#6C8EFF" />
              <Text style={styles.sectionTitle}>Study Workspace</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(app)/notebook' as any)}>
              <Text style={styles.sectionLink}>Notebooks →</Text>
            </TouchableOpacity>
          </View>

          {pinnedNotebooks.length === 0 ? (
            <TouchableOpacity
              style={styles.pinnedEmptyCard}
              activeOpacity={0.75}
              onPress={() => router.push('/(app)/notebook' as any)}
            >
              <Pin size={20} color="#2A3143" />
              <View style={{ flex: 1 }}>
                <Text style={styles.pinnedEmptyTitle}>No notebooks pinned yet</Text>
                <Text style={styles.pinnedEmptySub}>
                  Pin notebooks from the Notebooks page to access them quickly here.
                </Text>
              </View>
              <ArrowRight size={16} color="#3A4455" />
            </TouchableOpacity>
          ) : (
            pinnedNotebooks.map((nb, i) => (
              <PinnedNotebookCard key={nb.id} notebook={nb} index={i} />
            ))
          )}
        </Animated.View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Task Detail Modal */}
      <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  return <StudentHomeScreen />;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#10131C' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  // Hero
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingTop: 8,
  },
  heroLeft: { flex: 1, overflow: 'visible' },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greetingText: { fontSize: 13, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateDot: { fontSize: 13, color: '#475569' },
  dateSubtitle: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  nameText: {
    fontSize: 26,
    lineHeight: 36,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
    paddingTop: 2,
    paddingBottom: 8,
  },

  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  onlinePillGreen: { backgroundColor: 'rgba(52,211,153,0.12)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)' },
  onlinePillBlue: { backgroundColor: 'rgba(108,142,255,0.12)', borderWidth: 1, borderColor: 'rgba(108,142,255,0.25)' },
  onlinePillAmber: { backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  onlineText: { fontSize: 11, fontWeight: '700' },
  onlineTextGreen: { color: '#34D399' },
  onlineTextBlue: { color: '#6C8EFF' },
  onlineTextAmber: { color: '#F59E0B' },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#161A26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  statChip: { alignItems: 'center', gap: 4, flex: 1 },
  statNum: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  statDivider: { width: 1, height: 32, backgroundColor: '#2A3143' },

  // Section
  section: { marginBottom: 26 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#E2E8F0', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionLink: { fontSize: 12, color: '#6C8EFF', fontWeight: '600' },

  // Urgent task card
  urgentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
    marginBottom: 8,
    overflow: 'hidden',
    gap: 8,
  },
  urgentAccent: { width: 4, alignSelf: 'stretch' },
  urgentCheckbox: {
    paddingLeft: 6,
    paddingRight: 4,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentContent: { flex: 1, paddingVertical: 12, gap: 4 },
  urgentTitle: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  urgentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urgentSubjectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    maxWidth: 120,
  },
  urgentSubjectDot: { width: 5, height: 5, borderRadius: 2.5 },
  urgentSubject: { fontSize: 11, fontWeight: '600', flexShrink: 1 },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(252,211,77,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentBadgeRed: { backgroundColor: 'rgba(239,68,68,0.12)' },
  urgentBadgeText: { fontSize: 10, fontWeight: '700', color: '#FCD34D' },
  urgentBadgeTextRed: { color: '#FCA5A5' },

  // Empty state
  emptyCard: {
    backgroundColor: '#161A26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyCardText: { fontSize: 13, color: '#64748B', flex: 1 },

  // Timeline
  timelineScroll: { paddingBottom: 4, gap: 10 },
  timelineItemWrapper: { width: 168 },
  timelineItem: {
    backgroundColor: '#161A26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 12,
    gap: 6,
  },
  eventTimelineItem: {
    borderColor: 'rgba(16,185,129,0.2)',
  },
  timelineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
  modalityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalityText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  timelineText: { gap: 2 },
  timelineLabel: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  timelineTime: { fontSize: 11, color: '#6C8EFF', fontWeight: '600' },
  timelineMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  timelineSub: { fontSize: 10, color: '#64748B', flex: 1 },
  timelineSetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6C8EFF',
    backgroundColor: 'rgba(108,142,255,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },

  // Task Detail Modal
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  taskDetailSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#161B26',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: '#2A3143',
    paddingBottom: 36,
    minHeight: 220,
  },
  taskDetailHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A3143',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  taskDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3143',
  },
  taskDetailAccent: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  taskDetailHeaderText: { flex: 1, gap: 4 },
  taskDetailTitle: { fontSize: 17, fontWeight: '800', color: '#ffffff' },
  taskDetailSubjectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  taskDetailSubjectDot: { width: 6, height: 6, borderRadius: 3 },
  taskDetailSubjectName: { fontSize: 12, fontWeight: '600' },
  taskDetailCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(100,116,139,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskDetailDueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  taskDetailDueText: { fontSize: 13, fontWeight: '600' },
  taskDetailBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  taskDetailDescription: { fontSize: 14, color: '#94A3B8', lineHeight: 22 },
  taskDetailDescriptionEmpty: { fontSize: 14, color: '#3A4455', fontStyle: 'italic' },

  // Pinned Notebooks
  pinnedCardWrapper: { marginBottom: 8 },
  pinnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    padding: 14,
    gap: 12,
  },
  pinnedCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedCardContent: { flex: 1, gap: 3 },
  pinnedCardTitle: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  pinnedCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pinnedCardSub: { fontSize: 11, color: '#64748B' },

  pinnedEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
    borderStyle: 'dashed',
    padding: 16,
    gap: 12,
  },
  pinnedEmptyTitle: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 3 },
  pinnedEmptySub: { fontSize: 12, color: '#374151', lineHeight: 17 },

  bottomPad: { height: 20 },
});
