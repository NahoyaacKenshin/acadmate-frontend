import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { X, BookOpen, CalendarDays, GraduationCap } from 'lucide-react-native';

// ── Types (mirroring backend ParsedScheduleResult) ───────────────────────────

export interface ParsedSemesterInfo {
  label?: string | null;     // e.g. "1st Semester A.Y. 2026-2027"
  startDate?: string | null; // "YYYY-MM-DD"
  endDate?: string | null;   // "YYYY-MM-DD"
}

export interface ParsedClassSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  room?: string | null;
  modality?: 'F2F' | 'ONLINE' | 'HYBRID';
  setType?: 'A' | 'B' | 'BOTH' | null;
  startDate?: string;
  endDate?: string | null;
}

export interface ParsedCalendarEvent {
  title: string;
  startDate: string;
  endDate?: string | null;
  allDay?: boolean;
  location?: string | null;
}

export interface ParsedExamWeekBlocker {
  title: string;
  startDate: string;
  endDate: string;
}

export interface ParsedExamEvent {
  subjectName?: string | null;
  title: string;
  startDate: string | null;
  endDate?: string | null;
  dayOfWeek?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
}

export interface ParsedExamWeek {
  title: string;
  startDate: string | null; // ISO-8601 datetime if specific date is known, else null
  endDate: string | null;   // ISO-8601 datetime if specific date is known, else null
  dayOfWeek?: number | null; // 0=Sun…6=Sat — set when only day-of-week is known
  startTime?: string | null; // HH:MM 24h — set when only time is known, no specific date
  endTime?: string | null;   // HH:MM 24h
  resolvedFromExamWeekId?: string | null; // which admin ExamWeek block was used to resolve
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function formatTimeFromISO(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  // If time is exactly midnight UTC (00:00:00.000Z), likely no time was parsed — omit it
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return '';
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ── ClassSchedule row ─────────────────────────────────────────────────────────

interface ClassRowProps {
  item: ParsedClassSchedule;
  isNewSubject: boolean;
  onRemove: () => void;
  onCreateSubject: () => void;
  onEdit?: () => void;
}

export function ClassScheduleRow({ item, isNewSubject, onRemove, onCreateSubject, onEdit }: ClassRowProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
        <BookOpen size={16} color="#10B981" />
      </View>

      <Pressable style={styles.content} onPress={onEdit}>
        <View style={styles.titleRow}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.subjectName}</Text>
          {isNewSubject && (
            <Pressable style={styles.newSubjectBadge} onPress={onCreateSubject}>
              <Text style={styles.newSubjectText}>+ New Subject</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.rowSub}>
          {DAY_LABELS[item.dayOfWeek]} · {to12h(item.startTime)} – {to12h(item.endTime)}
          {item.modality ? `  ·  ${item.modality}` : ''}
          {item.room ? `  ·  ${item.room}` : ''}
        </Text>
        {(item.startDate || item.setType) && (
          <Text style={styles.rowMeta}>
            {item.setType && item.setType !== 'BOTH' ? `Set ${item.setType}  ·  ` : ''}
            {item.startDate ? formatDate(item.startDate) : ''}
            {item.endDate ? ` – ${formatDate(item.endDate)}` : ''}
          </Text>
        )}
      </Pressable>

      <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={8}>
        <X size={16} color="#64748B" />
      </Pressable>
    </View>
  );
}

// ── CalendarEvent row ─────────────────────────────────────────────────────────

interface EventRowProps {
  item: ParsedCalendarEvent;
  onRemove: () => void;
  onEdit?: () => void;
}

export function CalendarEventRow({ item, onRemove, onEdit }: EventRowProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: 'rgba(108, 142, 255, 0.15)' }]}>
        <CalendarDays size={16} color="#6C8EFF" />
      </View>

      <Pressable style={styles.content} onPress={onEdit}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.rowSub}>
          {item.allDay ? 'All Day  ·  ' : ''}{formatDate(item.startDate)}
          {item.endDate && item.endDate !== item.startDate ? ` – ${formatDate(item.endDate)}` : ''}
          {item.location ? `  ·  ${item.location}` : ''}
        </Text>
      </Pressable>

      <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={8}>
        <X size={16} color="#64748B" />
      </Pressable>
    </View>
  );
}

// ── ExamWeek Blocker row (Blackout window) ────────────────────────────────────

interface ExamBlockerRowProps {
  item: ParsedExamWeekBlocker;
  onRemove: () => void;
  onEdit?: () => void;
}

export function ExamBlockerRow({ item, onRemove, onEdit }: ExamBlockerRowProps) {
  const startStr = formatDate(item.startDate);
  const endStr = formatDate(item.endDate);
  const dateSub = startStr === endStr ? startStr : `${startStr} – ${endStr}`;

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
        <GraduationCap size={16} color="#F59E0B" />
      </View>

      <Pressable style={styles.content} onPress={onEdit}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.rowSub, { color: '#F59E0B' }]}>
          🛡️ Class Blocker  ·  {dateSub}
        </Text>
      </Pressable>

      <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={8}>
        <X size={16} color="#64748B" />
      </Pressable>
    </View>
  );
}

// ── Exam Event row (Individual subject test session) ──────────────────────────

interface ExamEventRowProps {
  item: ParsedExamEvent;
  onRemove: () => void;
  onEdit?: () => void;
}

export function ExamEventRow({ item, onRemove, onEdit }: ExamEventRowProps) {
  const isPending = !item.startDate && item.dayOfWeek != null;
  const dayLabel = item.dayOfWeek != null ? DAY_LABELS[item.dayOfWeek] : null;

  const timeSub = (() => {
    if (item.startTime) {
      const fmt = (hhmm: string) => {
        const [h, m] = hhmm.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
      };
      return `${fmt(item.startTime)}${item.endTime ? ` – ${fmt(item.endTime)}` : ''}`;
    }
    return null;
  })();

  const dateSub = (() => {
    if (!item.startDate) return null;
    const datePart = formatDate(item.startDate);
    const timePart = formatTimeFromISO(item.startDate);
    return `${datePart}${timePart ? `  ·  ${timePart}` : (timeSub ? `  ·  ${timeSub}` : '')}`;
  })();

  const roomSub = item.room ? `  ·  📍 ${item.room}` : '';

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: isPending ? 'rgba(100,116,139,0.15)' : 'rgba(139, 92, 246, 0.15)' }]}>
        <GraduationCap size={16} color={isPending ? '#64748B' : '#8B5CF6'} />
      </View>

      <Pressable style={styles.content} onPress={onEdit}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
        {isPending ? (
          <Text style={[styles.rowSub, { color: '#64748B', fontStyle: 'italic' }]}>
            {dayLabel}{timeSub ? `  ·  ${timeSub}` : ''}{'  —  Tap to assign date'}{roomSub}
          </Text>
        ) : (
          <Text style={styles.rowSub}>{(dateSub ?? timeSub ?? 'Exam session') + roomSub}</Text>
        )}
      </Pressable>

      <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={8}>
        <X size={16} color="#64748B" />
      </Pressable>
    </View>
  );
}

// ── ExamWeek row (Legacy compatibility) ───────────────────────────────────────

interface ExamWeekRowProps {
  item: ParsedExamWeek;
  onRemove: () => void;
  onEdit?: () => void;
}

export function ExamWeekRow({ item, onRemove, onEdit }: ExamWeekRowProps) {
  const isPending = !item.startDate && item.dayOfWeek != null;
  const dayLabel = item.dayOfWeek != null ? DAY_LABELS[item.dayOfWeek] : null;

  const timeSub = (() => {
    if (item.startTime) {
      const fmt = (hhmm: string) => {
        const [h, m] = hhmm.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
      };
      return `${fmt(item.startTime)}${item.endTime ? ` – ${fmt(item.endTime)}` : ''}`;
    }
    return null;
  })();

  const dateSub = (() => {
    if (!item.startDate) return null;
    const datePart = formatDate(item.startDate);
    const timePart = formatTimeFromISO(item.startDate);
    const endDatePart = item.endDate && formatDate(item.endDate) !== datePart
      ? ` – ${formatDate(item.endDate)}${formatTimeFromISO(item.endDate) ? `  ·  ${formatTimeFromISO(item.endDate)}` : ''}`
      : (item.endDate && formatTimeFromISO(item.endDate) ? ` – ${formatTimeFromISO(item.endDate)}` : '');
    return `${datePart}${timePart ? `  ·  ${timePart}` : ''}${endDatePart}`;
  })();

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: isPending ? 'rgba(100,116,139,0.15)' : 'rgba(139, 92, 246, 0.15)' }]}>
        <GraduationCap size={16} color={isPending ? '#64748B' : '#8B5CF6'} />
      </View>

      <Pressable style={styles.content} onPress={onEdit}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
        {isPending ? (
          <Text style={[styles.rowSub, { color: '#64748B', fontStyle: 'italic' }]}>
            {dayLabel}{timeSub ? `  ·  ${timeSub}` : ''}{'  —  Tap to assign date'}
          </Text>
        ) : (
          <Text style={styles.rowSub}>{dateSub ?? timeSub ?? ''}</Text>
        )}
      </Pressable>

      <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={8}>
        <X size={16} color="#64748B" />
      </Pressable>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1F2E',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 3,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    flexShrink: 1,
  },
  rowSub: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
  rowMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  newSubjectBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  newSubjectText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1A1F2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});

