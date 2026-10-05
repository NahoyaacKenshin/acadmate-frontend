import React, { useMemo } from 'react';
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import {
  X,
  Clock,
  Calendar,
  MapPin,
  CalendarRange,
  BookOpen,
  Pencil,
  Users,
  Radio,
} from 'lucide-react-native';
import { ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { parseDateLocal, parseToPHTDate } from '@/src/utils/scheduleUtils';
import { useTheme } from '@/src/theme/useTheme';
import type { ThemeColors } from '@/src/theme/tokens';

export interface ClassDetailModalProps {
  visible: boolean;
  schedule: ClassScheduleRow | null;
  onClose: () => void;
  onEdit?: (schedule: ClassScheduleRow) => void;
}

const DAYS_SHORT_MAP: Record<number, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

const DAYS_FULL_MAP: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

function formatTime12(hhmm?: string | null): string {
  if (!hhmm) return '--:--';
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return hhmm;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = parseToPHTDate(dateStr) ?? parseDateLocal(dateStr) ?? new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function ClassDetailModal({
  visible,
  schedule,
  onClose,
  onEdit,
}: ClassDetailModalProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  if (!schedule) return null;

  // Resolve days of week
  let days: number[] = [];
  if (schedule.days_of_week) {
    try {
      const parsed = JSON.parse(schedule.days_of_week);
      if (Array.isArray(parsed) && parsed.length > 0) days = parsed.map(Number);
    } catch {
      const parts = schedule.days_of_week
        .split(',')
        .map((s: string) => Number(s.trim()))
        .filter((n: number) => !isNaN(n));
      if (parts.length > 0) days = parts;
    }
  }
  if (days.length === 0) {
    days = [schedule.day_of_week];
  }
  days.sort((a, b) => a - b);

  const daysText =
    days.length === 7
      ? 'Every day'
      : days.map((d) => (days.length <= 2 ? DAYS_FULL_MAP[d] : DAYS_SHORT_MAP[d])).join(', ');

  const isF2F = schedule.modality === 'F2F';
  const isOnline = schedule.modality === 'ONLINE';

  const setLabel =
    schedule.set_type === 'A'
      ? 'Set A'
      : schedule.set_type === 'B'
      ? 'Set B'
      : 'Every Week';

  const dateRangeText = schedule.end_date
    ? `${formatDate(schedule.start_date)} – ${formatDate(schedule.end_date)}`
    : schedule.start_date
    ? `From ${formatDate(schedule.start_date)}`
    : null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centeredView} pointerEvents="box-none">
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerBadge}>
                <BookOpen size={16} color="#10B981" />
              </View>
              <Text style={styles.headerTitle}>Class Details</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8} accessibilityLabel="Close">
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Subject title & badges */}
          <View style={styles.subjectBlock}>
            <Text style={styles.subjectName} numberOfLines={2}>
              {schedule.subject_name || 'Class Schedule'}
            </Text>

            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.modalityBadge,
                  isF2F
                    ? { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.25)' }
                    : { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: 'rgba(99, 102, 241, 0.25)' },
                ]}
              >
                {isF2F ? (
                  <Users size={11} color="#10B981" />
                ) : (
                  <Radio size={11} color="#6366F1" />
                )}
                <Text
                  style={[
                    styles.modalityBadgeText,
                    { color: isF2F ? '#10B981' : '#6366F1' },
                  ]}
                >
                  {isF2F ? 'F2F' : isOnline ? 'Online' : schedule.modality}
                </Text>
              </View>

              <View style={styles.setTag}>
                <Text style={styles.setTagText}>{setLabel}</Text>
              </View>
            </View>
          </View>

          {/* Details list card */}
          <View style={styles.infoCard}>
            {/* Time */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Clock size={15} color={colors.mutedForeground} />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>
                  {formatTime12(schedule.start_time)} – {formatTime12(schedule.end_time)}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Days */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Calendar size={15} color={colors.mutedForeground} />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Schedule Days</Text>
                <Text style={styles.infoValue}>{daysText}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Room */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <MapPin size={15} color={colors.mutedForeground} />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Room / Location</Text>
                <Text style={styles.infoValue}>
                  {schedule.room?.trim() ? schedule.room : isOnline ? 'Online (No Room)' : 'No room specified'}
                </Text>
              </View>
            </View>

            {/* Date range if available */}
            {dateRangeText ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <CalendarRange size={15} color={colors.mutedForeground} />
                  </View>
                  <View style={styles.infoTextCol}>
                    <Text style={styles.infoLabel}>Semester Term</Text>
                    <Text style={styles.infoValue}>{dateRangeText}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>

          {/* Footer action buttons */}
          <View style={styles.footerRow}>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close class details"
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>

            {onEdit ? (
              <Pressable
                style={styles.editButton}
                onPress={() => onEdit(schedule)}
                accessibilityLabel="Edit class schedule"
              >
                <Pencil size={15} color="#FFFFFF" />
                <Text style={styles.editButtonText}>Edit Schedule</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFill as any,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.4 : 0.1,
      shadowRadius: 16,
      elevation: 10,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerBadge: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
      borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.foreground,
      letterSpacing: -0.3,
      includeFontPadding: false,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    subjectBlock: {
      marginBottom: 16,
    },
    subjectName: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
      letterSpacing: -0.4,
      includeFontPadding: false,
      marginBottom: 10,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    modalityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      flexShrink: 0,
    },
    modalityBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      includeFontPadding: false,
      flexShrink: 0,
    },
    setTag: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: colors.border,
      flexShrink: 0,
    },
    setTagText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedForeground,
      includeFontPadding: false,
      flexShrink: 0,
    },
    infoCard: {
      backgroundColor: isDark ? colors.background : colors.muted,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 20,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      gap: 12,
    },
    infoIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    infoTextCol: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.mutedForeground,
      includeFontPadding: false,
      marginBottom: 2,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      includeFontPadding: false,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    closeButton: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.background : colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      includeFontPadding: false,
    },
    editButton: {
      flex: 1.3,
      height: 44,
      borderRadius: 10,
      backgroundColor: '#6366F1',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
      includeFontPadding: false,
    },
  });
}
