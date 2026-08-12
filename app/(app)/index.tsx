import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TouchableOpacity,
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
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuthStore } from '@/src/features/auth/auth.store';
import { useUserStore } from '@/src/store/userStore';
import { useSystemStore } from '@/src/store/systemStore';
import { useTasks, TaskRow } from '@/src/hooks/useTasks';
import { useClassSchedules, ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { useCalendarEvents, CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { useExamWeeks } from '@/src/hooks/useExamWeeks';
import { useHolidays } from '@/src/hooks/useHolidays';
import { useSemesterRules } from '@/src/hooks/useSemesterRules';
import { isScheduleActiveOnDate } from '@/src/utils/scheduleUtils';

import AdminDashboardScreen from './admin';

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr.startsWith(todayISO());
}

function isTodayOrPast(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  return due <= new Date(today.getTime() + 86400000 - 1);
}

function todayDayOfWeek(): number {
  return new Date().getDay(); // 0=Sun ... 6=Sat
}

function fmtTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtDue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
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

function UrgentTaskCard({ task, index }: { task: TaskRow; index: number }) {
  const label = fmtDue(task.due_date);
  const isOverdue = label === 'Overdue';
  const color = task.subject_color ?? '#6C8EFF';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      style={styles.urgentCard}
    >
      <View style={[styles.urgentAccent, { backgroundColor: color }]} />
      <View style={styles.urgentContent}>
        <Text style={styles.urgentTitle} numberOfLines={1}>
          {task.title}
        </Text>
        <View style={styles.urgentMeta}>
          {task.subject_name ? (
            <Text style={[styles.urgentSubject, { color }]} numberOfLines={1}>
              {task.subject_name}
            </Text>
          ) : null}
          <View style={[styles.urgentBadge, isOverdue && styles.urgentBadgeRed]}>
            <AlertTriangle size={10} color={isOverdue ? '#FCA5A5' : '#FCD34D'} />
            <Text style={[styles.urgentBadgeText, isOverdue && styles.urgentBadgeTextRed]}>
              {label}
            </Text>
          </View>
        </View>
      </View>
      <CheckCircle2 size={18} color="#2A3143" />
    </Animated.View>
  );
}

function TimelineItem({
  label,
  time,
  color,
  sub,
  index,
}: {
  label: string;
  time: string;
  color: string;
  sub?: string;
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      style={styles.timelineItem}
    >
      <View style={[styles.timelineDot, { backgroundColor: color }]} />
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
        style={[styles.hubCard, { borderColor: item.accent + '40' }]}
        onPress={item.onPress}
        activeOpacity={0.75}
      >
        <View style={[styles.hubIcon, { backgroundColor: item.accent + '18' }]}>
          {item.icon}
        </View>
        <Text style={styles.hubLabel}>{item.label}</Text>
        <Text style={styles.hubSub}>{item.sub}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { nickname } = useUserStore();
  const { isOnline } = useSystemStore();

  if (user?.role === 'ADMIN') return <AdminDashboardScreen />;

  const displayName = nickname || user?.name?.split(' ')[0] || 'Student';
  const greeting = getGreeting();
  const todayDOW = todayDayOfWeek();

  // ── Data from PowerSync (zero REST calls) ──
  const { tasks } = useTasks();
  const { schedules } = useClassSchedules();
  const { events } = useCalendarEvents();
  const { examWeeks = [] } = useExamWeeks();
  const { holidays = [] } = useHolidays();

  // Urgent tasks: incomplete, due today or overdue — max 3
  const urgentTasks = useMemo<TaskRow[]>(() => {
    return tasks
      .filter((t) => t.completed === 0 && isTodayOrPast(t.due_date))
      .slice(0, 3);
  }, [tasks]);

  // Pending tasks (incomplete, any date)
  const pendingCount = useMemo(() => tasks.filter((t) => t.completed === 0).length, [tasks]);

  // Today's classes
  const todayClasses = useMemo(() => {
    const today = new Date();
    return schedules.filter((s) => isScheduleActiveOnDate(s, today, examWeeks, holidays));
  }, [schedules, examWeeks, holidays]);

  // Today's events
  const todayEvents = useMemo<CalendarEventRow[]>(() => {
    return events.filter((e) => isToday(e.start_date));
  }, [events]);

  // Merged timeline (classes + events), sorted by time
  const timeline = useMemo(() => {
    const items: Array<{
      id: string;
      label: string;
      time: string;
      color: string;
      sub?: string;
      sortKey: string;
    }> = [
      ...todayClasses.map((s) => ({
        id: s.id,
        label: s.subject_name ?? 'Class',
        time: `${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`,
        color: s.subject_color ?? '#6C8EFF',
        sub: s.room ? `📍 ${s.room} · ${s.modality}` : s.modality,
        sortKey: s.start_time,
      })),
      ...todayEvents.map((e) => ({
        id: e.id,
        label: e.title,
        time: e.all_day === 1 ? 'All day' : e.start_date.substring(11, 16) || 'Today',
        color: e.color ?? e.subject_color ?? '#10B981',
        sortKey: e.start_date.substring(11, 16) || '00:00',
      })),
    ];
    return items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [todayClasses, todayEvents]);

  // AI Study Hub actions
  const hubItems: HubItem[] = [
    {
      icon: <Sparkles size={20} color="#A78BFA" />,
      label: 'Ask AI',
      sub: 'Chat with your notes',
      accent: '#A78BFA',
      onPress: () => router.push('/(app)/notebook' as any),
    },
    {
      icon: <UploadCloud size={20} color="#38BDF8" />,
      label: 'Upload Material',
      sub: 'Add PDFs, images, docs',
      accent: '#38BDF8',
      onPress: () => router.push('/(app)/notebook' as any),
    },
    {
      icon: <ScanLine size={20} color="#34D399" />,
      label: 'Scan Schedule',
      sub: 'AI schedule parser',
      accent: '#34D399',
      onPress: () => router.push('/(app)/schedule-upload' as any),
    },
    {
      icon: <BookOpen size={20} color="#FB923C" />,
      label: 'Notebooks',
      sub: 'Browse study materials',
      accent: '#FB923C',
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
            <Text style={styles.greetingText}>
              {greeting.text} {greeting.emoji}
            </Text>
            <Text style={styles.nameText}>{displayName} 👋</Text>
          </View>
          <View style={[styles.onlinePill, isOnline ? styles.onlinePillGreen : styles.onlinePillAmber]}>
            {isOnline ? (
              <Wifi size={12} color="#34D399" />
            ) : (
              <WifiOff size={12} color="#F59E0B" />
            )}
            <Text style={[styles.onlineText, isOnline ? styles.onlineTextGreen : styles.onlineTextAmber]}>
              {isOnline ? 'Online' : 'Offline'}
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
            <Text style={styles.statNum}>{todayClasses.length}</Text>
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
              <UrgentTaskCard key={t.id} task={t} index={i} />
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
                  index={i}
                />
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* ── AI Study Hub ── */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Sparkles size={15} color="#A78BFA" />
              <Text style={styles.sectionTitle}>AI Study Hub</Text>
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
  heroLeft: { flex: 1 },
  greetingText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  nameText: { fontSize: 26, fontWeight: '800', color: '#ffffff', marginTop: 2 },

  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  onlinePillGreen: { backgroundColor: 'rgba(52,211,153,0.12)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)' },
  onlinePillAmber: { backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  onlineText: { fontSize: 11, fontWeight: '600' },
  onlineTextGreen: { color: '#34D399' },
  onlineTextAmber: { color: '#F59E0B' },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#161A26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A3143',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  statChip: { alignItems: 'center', gap: 4, flex: 1 },
  statNum: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  statDivider: { width: 1, height: 36, backgroundColor: '#2A3143' },

  // Section
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#E2E8F0' },
  sectionLink: { fontSize: 12, color: '#6C8EFF', fontWeight: '600' },

  // Urgent task card
  urgentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A26',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3143',
    marginBottom: 8,
    overflow: 'hidden',
    paddingRight: 14,
    gap: 12,
  },
  urgentAccent: { width: 4, alignSelf: 'stretch' },
  urgentContent: { flex: 1, paddingVertical: 12 },
  urgentTitle: { fontSize: 14, fontWeight: '700', color: '#ffffff', marginBottom: 5 },
  urgentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urgentSubject: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyCardText: { fontSize: 13, color: '#64748B', flex: 1 },

  // Timeline
  timelineScroll: { paddingBottom: 4, gap: 10 },
  timelineItem: {
    backgroundColor: '#161A26',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 14,
    width: 160,
    gap: 6,
  },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
  timelineText: { gap: 2 },
  timelineLabel: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  timelineTime: { fontSize: 11, color: '#6C8EFF', fontWeight: '600' },
  timelineSub: { fontSize: 10, color: '#64748B' },

  // AI Hub
  hubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  hubCardWrapper: { width: '48%' },
  hubCard: {
    backgroundColor: '#161A26',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  hubIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubLabel: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  hubSub: { fontSize: 11, color: '#64748B' },

  bottomPad: { height: 20 },
});
