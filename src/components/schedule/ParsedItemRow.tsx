import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { X, BookOpen, CalendarDays, GraduationCap } from 'lucide-react-native';

// ── Types (mirroring backend ParsedScheduleResult) ───────────────────────────

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

export interface ParsedExamWeek {
  title: string;
  startDate: string;
  endDate: string;
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

// ── ExamWeek row ──────────────────────────────────────────────────────────────

interface ExamWeekRowProps {
  item: ParsedExamWeek;
  onRemove: () => void;
  onEdit?: () => void;
}

export function ExamWeekRow({ item, onRemove, onEdit }: ExamWeekRowProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
        <GraduationCap size={16} color="#F59E0B" />
      </View>

      <Pressable style={styles.content} onPress={onEdit}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.rowSub}>
          {formatDate(item.startDate)} – {formatDate(item.endDate)}
        </Text>
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

