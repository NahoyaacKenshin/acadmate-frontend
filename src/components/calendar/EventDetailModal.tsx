import React, { useMemo } from 'react';
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  ScrollView,
} from 'react-native';
import {
  X,
  Clock,
  CalendarDays,
  MapPin,
  BookOpen,
  Pencil,
  GraduationCap,
  FileText,
} from 'lucide-react-native';
import { CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { parseDateLocal, parseToPHTDate } from '@/src/utils/scheduleUtils';
import { isExamEvent } from '@/src/services/notificationService';
import { useTheme } from '@/src/theme/useTheme';
import type { ThemeColors } from '@/src/theme/tokens';

export interface EventDetailModalProps {
  visible: boolean;
  event: CalendarEventRow | null;
  onClose: () => void;
  onEdit?: (event: CalendarEventRow) => void;
}

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function EventDetailModal({
  visible,
  event,
  onClose,
  onEdit,
}: EventDetailModalProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  if (!event) return null;

  const isExam =
    event.color === '#F59E0B' ||
    Boolean(event.description?.startsWith('🎓')) ||
    Boolean(event.title?.startsWith('🎓')) ||
    Boolean(event.description?.toLowerCase().includes('exam')) ||
    Boolean(event.title?.toLowerCase().includes('exam')) ||
    isExamEvent(event);

  const accentColor = isExam ? '#F59E0B' : '#6366F1';

  const startDate = event.start_date
    ? (parseToPHTDate(event.start_date) ?? parseDateLocal(event.start_date) ?? new Date(event.start_date))
    : new Date();

  const endDate = event.end_date
    ? (parseToPHTDate(event.end_date) ?? parseDateLocal(event.end_date) ?? new Date(event.end_date))
    : null;

  const isAllDay = event.all_day === 1;

  let timeString = '';
  if (isAllDay) {
    if (endDate && !isSameDay(startDate, endDate)) {
      timeString = `${formatDate(startDate)} – ${formatDate(endDate)} · All day`;
    } else {
      timeString = `${formatDate(startDate)} · All day`;
    }
  } else {
    if (endDate) {
      if (isSameDay(startDate, endDate)) {
        timeString = `${formatDate(startDate)} · ${formatTime(startDate)} – ${formatTime(endDate)}`;
      } else {
        timeString = `${formatDate(startDate)} ${formatTime(startDate)} – ${formatDate(endDate)} ${formatTime(endDate)}`;
      }
    } else {
      timeString = `${formatDate(startDate)} · ${formatTime(startDate)}`;
    }
  }

  // Clean description if it begins with exam emotes
  let displayDescription = event.description?.trim() || '';
  if (displayDescription.startsWith('🎓')) {
    displayDescription = displayDescription.replace(/^🎓\s*/, '').trim();
  }

  // Clean title if it begins with exam emotes
  let displayTitle = event.title?.trim() || 'Event';
  if (displayTitle.startsWith('🎓')) {
    displayTitle = displayTitle.replace(/^🎓\s*/, '').trim();
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centeredView} pointerEvents="box-none">
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.headerBadge,
                  {
                    backgroundColor: isExam
                      ? isDark
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(245, 158, 11, 0.1)'
                      : isDark
                      ? 'rgba(99, 102, 241, 0.15)'
                      : 'rgba(99, 102, 241, 0.1)',
                    borderColor: isExam
                      ? isDark
                        ? 'rgba(245, 158, 11, 0.3)'
                        : 'rgba(245, 158, 11, 0.2)'
                      : isDark
                      ? 'rgba(99, 102, 241, 0.3)'
                      : 'rgba(99, 102, 241, 0.2)',
                  },
                ]}
              >
                {isExam ? (
                  <GraduationCap size={16} color="#F59E0B" />
                ) : (
                  <CalendarDays size={16} color="#6366F1" />
                )}
              </View>
              <Text style={styles.headerTitle}>{isExam ? 'Exam Details' : 'Event Details'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8} accessibilityLabel="Close">
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Event title & badge pills */}
          <View style={styles.titleBlock}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {displayTitle}
            </Text>

            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor: isExam
                      ? 'rgba(245, 158, 11, 0.12)'
                      : 'rgba(99, 102, 241, 0.12)',
                    borderColor: isExam
                      ? 'rgba(245, 158, 11, 0.25)'
                      : 'rgba(99, 102, 241, 0.25)',
                  },
                ]}
              >
                {isExam ? (
                  <GraduationCap size={11} color="#F59E0B" />
                ) : (
                  <CalendarDays size={11} color="#6366F1" />
                )}
                <Text
                  style={[
                    styles.typeBadgeText,
                    { color: accentColor },
                  ]}
                >
                  {isExam ? 'EXAM' : 'EVENT'}
                </Text>
              </View>

              {isAllDay ? (
                <View style={styles.neutralTag}>
                  <Text style={styles.neutralTagText}>All Day</Text>
                </View>
              ) : null}

              {event.subject_name ? (
                <View style={styles.subjectTag}>
                  <BookOpen size={10} color={colors.mutedForeground} />
                  <Text style={styles.subjectTagText} numberOfLines={1}>
                    {event.subject_name}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Details list card */}
          <View style={styles.infoCard}>
            {/* Date & Time */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                {isAllDay ? (
                  <CalendarDays size={15} color={colors.mutedForeground} />
                ) : (
                  <Clock size={15} color={colors.mutedForeground} />
                )}
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Date & Time</Text>
                <Text style={styles.infoValue}>{timeString}</Text>
              </View>
            </View>

            {/* Location */}
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <MapPin size={15} color={colors.mutedForeground} />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Location / Room</Text>
                <Text style={styles.infoValue}>
                  {event.location?.trim() ? event.location : 'No location specified'}
                </Text>
              </View>
            </View>

            {/* Description / Notes if available */}
            {displayDescription ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <FileText size={15} color={colors.mutedForeground} />
                  </View>
                  <View style={styles.infoTextCol}>
                    <Text style={styles.infoLabel}>Description / Notes</Text>
                    <Text style={styles.infoDescValue}>{displayDescription}</Text>
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
              accessibilityLabel="Close event details"
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>

            {onEdit ? (
              <Pressable
                style={[
                  styles.editButton,
                  { backgroundColor: accentColor },
                ]}
                onPress={() => onEdit(event)}
                accessibilityLabel="Edit event"
              >
                <Pencil size={15} color="#FFFFFF" />
                <Text style={styles.editButtonText}>Edit Event</Text>
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
    titleBlock: {
      marginBottom: 16,
    },
    eventTitle: {
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
      flexWrap: 'wrap',
      gap: 8,
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      flexShrink: 0,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      includeFontPadding: false,
      flexShrink: 0,
    },
    neutralTag: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: colors.border,
      flexShrink: 0,
    },
    neutralTagText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedForeground,
      includeFontPadding: false,
      flexShrink: 0,
    },
    subjectTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: 160,
    },
    subjectTagText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedForeground,
      includeFontPadding: false,
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
      alignItems: 'flex-start',
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
      marginTop: 2,
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
    infoDescValue: {
      fontSize: 13,
      fontWeight: '400',
      color: colors.foreground,
      lineHeight: 18,
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
