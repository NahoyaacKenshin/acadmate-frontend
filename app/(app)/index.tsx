import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/src/components/ui/text';
import {
  Sparkles,
  ListTodo,
  UploadCloud,
  BookOpen,
  ScanLine,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Wifi,
  WifiOff,
  RotateCw,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuthStore } from '@/src/features/auth/auth.store';
import { useUserStore } from '@/src/store/userStore';
import { useStatus, usePowerSync } from '@powersync/react';
import { useNetworkSyncStatus } from '@/src/hooks/useNetworkSyncStatus';
import { NotificationService } from '@/src/services/notificationService';
import { useTasks, TaskRow } from '@/src/hooks/useTasks';
import { useClassSchedules, ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { useCalendarEvents, CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { useExamWeeks } from '@/src/hooks/useExamWeeks';
import { useHolidays } from '@/src/hooks/useHolidays';
import { useSemesterRules } from '@/src/hooks/useSemesterRules';
import { resolveScheduleForDate } from '@/src/utils/scheduleResolver';
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

// ── Sub-components ────────────────────────────────────────────────────────────

function UrgentTaskCard({
  task,
  index,
  onComplete,
}: {
  task: TaskRow;
  index: number;
  onComplete: (task: TaskRow) => void;
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

      <View style={styles.urgentContent}>
        <Text style={styles.urgentTitle} numberOfLines={1}>
          {task.title}
        </Text>
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
              <Text style={[styles.urgentBadgeText, styles.urgentBadgeTextRed]}>
                Overdue
              </Text>
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
      </View>
    </Animated.View>
  );
}

function TimelineItem({
  label,
  time,
  color,
  sub,
  modality,
  index,
  onPress,
}: {
  label: string;
  time: string;
  color: string;
  sub?: string;
  modality?: string;
  index: number;
  onPress?: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      style={styles.timelineItemWrapper}
    >
      <TouchableOpacity
        style={styles.timelineItem}
        activeOpacity={0.75}
        onPress={onPress}
      >
        <View style={styles.timelineTopRow}>
          <View style={[styles.timelineDot, { backgroundColor: color }]} />
          {modality ? (
            <View style={[styles.modalityTag, { backgroundColor: color + '22' }]}>
              <Text style={[styles.modalityText, { color }]}>{modality}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.timelineText}>
          <Text style={styles.timelineLabel} numberOfLines={1}>
            {label}
          </Text>
          <Text style={styles.timelineTime}>{time}</Text>
          {sub ? (
            <Text style={styles.timelineSub} numberOfLines={1}>
              {sub}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

type HubItem = {
  icon: React.ReactNode;
  label: string;
  sub: string;
  accent: string;
  onPress: () => void;
};

function HubCard({ item, index }: { item: HubItem; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(200 + index * 60).springify()} style={styles.hubCardWrapper}>
      <TouchableOpacity
        style={styles.hubCard}
        onPress={item.onPress}
        activeOpacity={0.75}
      >
        <View style={styles.hubIcon}>
          {item.icon}
        </View>
        <Text style={styles.hubLabel}>{item.label}</Text>
        <Text style={styles.hubSub}>{item.sub}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

function StudentHomeScreen() {
  const { user } = useAuthStore();
  const { nickname, studentSet } = useUserStore();
  const powerSyncStatus = useStatus();
  const powerSync = usePowerSync();

  // Dynamic reactive connection & sync status (accurate offline / syncing / online detection)
  const networkStatus = useNetworkSyncStatus();

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
  const dateSubtitle = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  // ── Data from PowerSync (zero REST calls) ──
  const { tasks } = useTasks();
  const { schedules } = useClassSchedules();
  const { events } = useCalendarEvents();
  const { examWeeks = [] } = useExamWeeks();
  const { holidays = [] } = useHolidays();
  const { semesterRules = [] } = useSemesterRules();

  // Urgent tasks: incomplete, due today or overdue — max 3
  const urgentTasks = useMemo<TaskRow[]>(() => {
    return tasks
      .filter((t) => t.completed === 0 && isTodayOrPast(t.due_date))
      .slice(0, 3);
  }, [tasks]);

  // Pending tasks (incomplete, any date)
  const pendingCount = useMemo(() => tasks.filter((t) => t.completed === 0).length, [tasks]);

  // Today's classes with full schedule resolution pipeline (modality, exam weeks, holidays, Set A/B)
  const todayResolvedClasses = useMemo(() => {
    const today = new Date();
    return schedules
      .map((s) => ({
        schedule: s,
        resolution: resolveScheduleForDate(s, today, studentSet, semesterRules, holidays, examWeeks),
      }))
      .filter((item) => item.resolution.isActive);
  }, [schedules, studentSet, semesterRules, holidays, examWeeks]);

  // Today's events
  const todayEvents = useMemo<CalendarEventRow[]>(() => {
    return events.filter((e) => isToday(e.start_date));
  }, [events]);

  // Merged timeline (classes + events), sorted by time in 12-hour format
  const timeline = useMemo(() => {
    const items: Array<{
      id: string;
      label: string;
      time: string;
      color: string;
      sub?: string;
      modality?: string;
      sortKey: string;
    }> = [
      ...todayResolvedClasses.map(({ schedule: s, resolution }) => ({
        id: s.id,
        label: s.subject_name ?? 'Class',
        time: `${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`,
        color: s.subject_color ?? '#6C8EFF',
        sub: resolution.effectiveRoom ? `📍 ${resolution.effectiveRoom}` : undefined,
        modality: resolution.badgeText,
        sortKey: s.start_time,
      })),
      ...todayEvents.map((e) => {
        let timeDisplay = 'All day';
        if (e.all_day !== 1 && e.start_date) {
          const startFmt = fmtTime(e.start_date);
          const endFmt = e.end_date ? fmtTime(e.end_date) : '';
          timeDisplay = endFmt && endFmt !== startFmt ? `${startFmt} – ${endFmt}` : (startFmt || 'Today');
        }
        return {
          id: e.id,
          label: e.title,
          time: timeDisplay,
          color: e.color ?? e.subject_color ?? '#10B981',
          sortKey: e.start_date ? e.start_date.substring(11, 16) : '00:00',
        };
      }),
    ];
    return items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [todayResolvedClasses, todayEvents]);

  // Academic Tools & Study Workspace actions
  const hubItems: HubItem[] = [
    {
      icon: <BookOpen size={20} color="#6C8EFF" />,
      label: 'Course Notes',
      sub: 'Browse & review materials',
      accent: '#6C8EFF',
      onPress: () => router.push('/(app)/notebook' as any),
    },
    {
      icon: <ScanLine size={20} color="#6C8EFF" />,
      label: 'Scan Timetable',
      sub: 'Import class schedule',
      accent: '#6C8EFF',
      onPress: () => router.push('/(app)/schedule-upload' as any),
    },
    {
      icon: <UploadCloud size={20} color="#6C8EFF" />,
      label: 'Upload Sources',
      sub: 'PDFs, docs & lecture slides',
      accent: '#6C8EFF',
      onPress: () => router.push('/(app)/notebook' as any),
    },
    {
      icon: <Sparkles size={20} color="#6C8EFF" />,
      label: 'AI Study Assistant',
      sub: 'Grounded note search & Q&A',
      accent: '#6C8EFF',
      onPress: () => router.push('/(app)/notebook' as any),
    },
  ];

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
          <View style={styles.statChip}>
            <ListTodo size={14} color="#6C8EFF" />
            <Text style={styles.statNum}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Clock size={14} color="#10B981" />
            <Text style={styles.statNum}>{todayResolvedClasses.length}</Text>
            <Text style={styles.statLabel}>Classes Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <BookOpen size={14} color="#F59E0B" />
            <Text style={styles.statNum}>{todayEvents.length}</Text>
            <Text style={styles.statLabel}>Events Today</Text>
          </View>
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
              />
            ))
          )}
        </Animated.View>

        {/* ── Today's Timeline ── */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Clock size={15} color="#6C8EFF" />
              <Text style={styles.sectionTitle}>Today's Timeline</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(app)/calendar' as any)}>
              <Text style={styles.sectionLink}>Calendar →</Text>
            </TouchableOpacity>
          </View>

          {timeline.length === 0 ? (
            <View style={styles.emptyCard}>
              <MapPin size={22} color="#2A3143" />
              <Text style={styles.emptyCardText}>Nothing scheduled for today. Enjoy the free time!</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timelineScroll}
            >
              {timeline.map((item, i) => (
                <TimelineItem
                  key={item.id}
                  label={item.label}
                  time={item.time}
                  color={item.color}
                  sub={item.sub}
                  modality={item.modality}
                  index={i}
                  onPress={() => router.push('/(app)/calendar' as any)}
                />
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* ── Study Workspace ── */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <BookOpen size={15} color="#6C8EFF" />
              <Text style={styles.sectionTitle}>Study Workspace</Text>
            </View>
          </View>
          <View style={styles.hubGrid}>
            {hubItems.map((item, i) => (
              <HubCard key={item.label} item={item} index={i} />
            ))}
          </View>
        </Animated.View>

        <View style={styles.bottomPad} />
      </ScrollView>
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
    paddingRight: 14,
    gap: 8,
  },
  urgentAccent: { width: 4, alignSelf: 'stretch' },
  urgentCheckbox: {
    paddingLeft: 6,
    paddingRight: 4,
    paddingVertical: 12,
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
  timelineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
  modalityTag: {
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
  timelineSub: { fontSize: 10, color: '#64748B' },

  // Workspace Hub
  hubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  hubCardWrapper: { width: '48%' },
  hubCard: {
    backgroundColor: '#161A26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 14,
    gap: 6,
  },
  hubIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(108,142,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  hubLabel: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  hubSub: { fontSize: 11, color: '#64748B', lineHeight: 15 },

  bottomPad: { height: 20 },
});
