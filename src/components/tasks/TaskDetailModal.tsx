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
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Pencil,
  FileText,
  ListChecks,
  Check,
} from 'lucide-react-native';
import { TaskRow, SubtaskItem } from '@/src/hooks/useTasks';
import {
  isTodayPHT,
  isOverduePHT,
  formatTimePHT,
  parseToPHTDate,
} from '@/src/utils/philippineTime';
import { parseDateLocal } from '@/src/utils/scheduleUtils';
import { useTheme } from '@/src/theme/useTheme';
import type { ThemeColors } from '@/src/theme/tokens';

export interface TaskDetailModalProps {
  visible: boolean;
  task: TaskRow | null;
  onClose: () => void;
  onEdit?: (task: TaskRow) => void;
}

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function TaskDetailModal({
  visible,
  task,
  onClose,
  onEdit,
}: TaskDetailModalProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  if (!task) return null;

  const isCompleted = task.completed === 1;
  const isOverdue = task.due_date ? isOverduePHT(task.due_date) && !isCompleted : false;
  const isTodayDue = task.due_date ? isTodayPHT(task.due_date) && !isCompleted : false;

  const accentColor = isCompleted
    ? '#10B981'
    : isOverdue
    ? '#EF4444'
    : isTodayDue
    ? '#F59E0B'
    : '#6366F1';

  let dueString = 'No due date set';
  if (task.due_date) {
    const parsed = parseToPHTDate(task.due_date) ?? parseDateLocal(task.due_date) ?? new Date(task.due_date);
    const dateFormatted = formatDate(parsed);
    const timeFormatted = formatTimePHT(task.due_date);
    dueString = `${dateFormatted} · ${timeFormatted}`;
  }

  // Parse subtasks if available
  let subtaskList: SubtaskItem[] = [];
  if (task.subtasks) {
    try {
      const parsed = JSON.parse(task.subtasks);
      if (Array.isArray(parsed)) subtaskList = parsed;
    } catch {
      subtaskList = [];
    }
  }

  const completedSubtasksCount = subtaskList.filter((s) => s.completed).length;

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
                    backgroundColor: isDark
                      ? `${accentColor}25`
                      : `${accentColor}18`,
                    borderColor: isDark
                      ? `${accentColor}50`
                      : `${accentColor}35`,
                  },
                ]}
              >
                {isCompleted ? (
                  <CheckCircle2 size={16} color={accentColor} />
                ) : isOverdue ? (
                  <AlertTriangle size={16} color={accentColor} />
                ) : (
                  <Clock size={16} color={accentColor} />
                )}
              </View>
              <Text style={styles.headerTitle}>Task Details</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8} accessibilityLabel="Close">
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Task title & status pills */}
          <View style={styles.titleBlock}>
            <Text
              style={[
                styles.taskTitle,
                isCompleted && styles.taskTitleCompleted,
              ]}
              numberOfLines={2}
            >
              {task.title}
            </Text>

            <View style={styles.badgeRow}>
              {/* Status Badge */}
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: `${accentColor}18`,
                    borderColor: `${accentColor}35`,
                  },
                ]}
              >
                {isCompleted ? (
                  <CheckCircle2 size={11} color={accentColor} />
                ) : isOverdue ? (
                  <AlertTriangle size={11} color={accentColor} />
                ) : (
                  <Clock size={11} color={accentColor} />
                )}
                <Text style={[styles.statusBadgeText, { color: accentColor }]}>
                  {isCompleted
                    ? 'COMPLETED'
                    : isOverdue
                    ? 'OVERDUE'
                    : isTodayDue
                    ? 'DUE TODAY'
                    : task.due_date
                    ? 'PENDING'
                    : 'NO DUE DATE'}
                </Text>
              </View>

              {/* Subject Tag */}
              {task.subject_name ? (
                <View style={styles.subjectTag}>
                  <BookOpen size={10} color={colors.mutedForeground} />
                  <Text style={styles.subjectTagText} numberOfLines={1}>
                    {task.subject_name}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Details list card */}
          <View style={styles.infoCard}>
            {/* Due Date & Time */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Clock size={15} color={colors.mutedForeground} />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Due Date & Time</Text>
                <Text
                  style={[
                    styles.infoValue,
                    isOverdue && { color: '#EF4444' },
                    isTodayDue && { color: '#F59E0B' },
                  ]}
                >
                  {dueString}
                </Text>
              </View>
            </View>

            {/* Description / Notes */}
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <FileText size={15} color={colors.mutedForeground} />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Description</Text>
                {task.description?.trim() ? (
                  <Text style={styles.infoDescValue}>{task.description.trim()}</Text>
                ) : (
                  <Text style={[styles.infoDescValue, { color: colors.mutedForeground, fontStyle: 'italic' }]}>
                    No description provided
                  </Text>
                )}
              </View>
            </View>

            {/* Subtasks if any */}
            {subtaskList.length > 0 ? (
              <>
                <View style={styles.divider} />
                <View style={styles.subtasksBlock}>
                  <View style={styles.subtasksHeaderRow}>
                    <ListChecks size={14} color={colors.mutedForeground} />
                    <Text style={styles.infoLabel}>
                      Subtasks ({completedSubtasksCount}/{subtaskList.length})
                    </Text>
                  </View>
                  <ScrollView style={styles.subtasksScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {subtaskList.map((sub) => (
                      <View key={sub.id} style={styles.subtaskRow}>
                        <View
                          style={[
                            styles.subtaskCheck,
                            sub.completed && styles.subtaskCheckDone,
                          ]}
                        >
                          {sub.completed && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                        <Text
                          style={[
                            styles.subtaskTitle,
                            sub.completed && styles.subtaskTitleDone,
                          ]}
                          numberOfLines={1}
                        >
                          {sub.title}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </>
            ) : null}
          </View>

          {/* Footer action buttons */}
          <View style={styles.footerRow}>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close task details"
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>

            {onEdit ? (
              <Pressable
                style={styles.editButton}
                onPress={() => onEdit(task)}
                accessibilityLabel="Edit task"
              >
                <Pencil size={15} color="#FFFFFF" />
                <Text style={styles.editButtonText}>Edit Task</Text>
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
    taskTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
      letterSpacing: -0.4,
      includeFontPadding: false,
      marginBottom: 10,
    },
    taskTitleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.mutedForeground,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      flexShrink: 0,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
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
    subtasksBlock: {
      paddingVertical: 8,
    },
    subtasksHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    subtasksScroll: {
      maxHeight: 100,
    },
    subtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    subtaskCheck: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subtaskCheckDone: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    subtaskTitle: {
      fontSize: 13,
      color: colors.foreground,
      flex: 1,
      includeFontPadding: false,
    },
    subtaskTitleDone: {
      textDecorationLine: 'line-through',
      color: colors.mutedForeground,
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
