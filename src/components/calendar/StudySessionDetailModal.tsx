import React from 'react';
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  X,
  Clock,
  BookOpen,
  Pencil,
  FileText,
  Trash2,
  ArrowUpRight,
} from 'lucide-react-native';
import { CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { parseDateLocal, parseToPHTDate } from '@/src/utils/scheduleUtils';
import { formatTimePHT } from '@/src/utils/philippineTime';
import { useTheme } from '@/src/theme/useTheme';

export interface StudySessionDetailModalProps {
  visible: boolean;
  event: CalendarEventRow | null;
  onClose: () => void;
  onEdit?: (event: CalendarEventRow) => void;
  onDelete?: (event: CalendarEventRow) => void;
}

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function StudySessionDetailModal({
  visible,
  event,
  onClose,
  onEdit,
  onDelete,
}: StudySessionDetailModalProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  if (!event) return null;

  const startDate = event.start_date
    ? (parseToPHTDate(event.start_date) ?? parseDateLocal(event.start_date) ?? new Date(event.start_date))
    : new Date();

  const endDate = event.end_date
    ? (parseToPHTDate(event.end_date) ?? parseDateLocal(event.end_date) ?? new Date(event.end_date))
    : null;

  const startTimeStr = formatTimePHT(event.start_date);
  const endTimeStr = endDate ? ` – ${formatTimePHT(event.end_date!)}` : '';
  const timeString = `${formatDate(startDate)} · ${startTimeStr}${endTimeStr}`;

  const notebookTitle = event.title.replace(/^Study Session:\s*/i, '').trim() || 'Notebook';
  const notebookId = event.location?.startsWith('study_session:')
    ? event.location.replace(/^study_session:/, '')
    : null;

  const handleOpenNotebook = () => {
    onClose();
    if (notebookId) {
      router.push(`/(app)/notebook/${notebookId}` as any);
    } else {
      router.push('/(app)/notebook' as any);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centeredView} pointerEvents="box-none">
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : '#EEF2FF',
                    borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE',
                  },
                ]}
              >
                <BookOpen size={12} color="#6366F1" />
                <Text style={styles.badgeText}>STUDY SESSION</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              {onEdit ? (
                <Pressable
                  style={[
                    styles.iconBtn,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F4F4F5' },
                  ]}
                  onPress={() => onEdit(event)}
                  hitSlop={8}
                  accessibilityLabel="Edit study session"
                >
                  <Pencil size={15} color={colors.foreground} />
                </Pressable>
              ) : null}

              {onDelete ? (
                <Pressable
                  style={[
                    styles.iconBtn,
                    { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2' },
                  ]}
                  onPress={() => onDelete(event)}
                  hitSlop={8}
                  accessibilityLabel="Delete study session"
                >
                  <Trash2 size={15} color="#EF4444" />
                </Pressable>
              ) : null}

              <Pressable
                style={[
                  styles.iconBtn,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F4F4F5' },
                ]}
                onPress={onClose}
                hitSlop={8}
                accessibilityLabel="Close"
              >
                <X size={15} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
            {notebookTitle}
          </Text>

          {/* Time row */}
          <View style={styles.timeRow}>
            <Clock size={14} color="#6366F1" />
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{timeString}</Text>
          </View>

          {/* Details / Focus Notes */}
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {event.description ? (
              <View style={styles.sectionGroup}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  STUDY FOCUS & NOTES
                </Text>
                <View
                  style={[
                    styles.descCard,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.descText, { color: colors.foreground }]}>
                    {event.description}
                  </Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Open Notebook CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.ctaBtn,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleOpenNotebook}
          >
            <BookOpen size={16} color="#ffffff" />
            <Text style={styles.ctaBtnText}>Open Notebook</Text>
            <ArrowUpRight size={16} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 0.5,
    includeFontPadding: false,
    flexShrink: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    letterSpacing: -0.4,
    marginBottom: 8,
    includeFontPadding: false,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
    includeFontPadding: false,
  },
  scrollArea: {
    marginBottom: 16,
    maxHeight: 200,
  },
  sectionGroup: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    includeFontPadding: false,
  },
  descCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  descText: {
    fontSize: 14,
    lineHeight: 20,
    includeFontPadding: false,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    height: 48,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    includeFontPadding: false,
  },
});
