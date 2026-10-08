import React, { useState, useMemo } from 'react';
import { View, Pressable, StyleSheet, Vibration } from 'react-native';
import { Text } from '../ui/text';
import { Check, Trash, AlertTriangle, Clock, Calendar, FileText } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { isOverduePHT, isTodayPHT, isTomorrowPHT, formatTimePHT } from '@/src/utils/philippineTime';
import { useTheme } from '@/src/theme/useTheme';
import type { ThemeColors } from '@/src/theme/tokens';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  subject: string;
  subjectColor: string;
  dueDate: string;
  dueDateIso?: string | null;
  completed: boolean;
  subtasks?: string | null;
}

export interface TaskListItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onPress: () => void;
}

export function TaskListItem({ task, onComplete, onDelete, onPress }: TaskListItemProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const handleToggleComplete = (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    try {
      Vibration.vibrate(15);
    } catch {
      // Ignored if Vibration not supported
    }
    onComplete(task.id);
  };

  const renderRightActions = () => (
    <Pressable
      style={[styles.actionButton, styles.deleteButton]}
      onPress={() => onDelete(task.id)}
    >
      <Trash size={18} color="#fff" />
    </Pressable>
  );

  const renderLeftActions = () => (
    <Pressable
      style={[styles.actionButton, styles.completeButton]}
      onPress={handleToggleComplete}
    >
      <Check size={18} color="#fff" />
    </Pressable>
  );

  const renderDueBadge = () => {
    if (task.completed) {
      return (
        <View style={styles.badgeCompleted}>
          <Check size={10} color="#10B981" strokeWidth={3} />
          <Text style={styles.badgeTextCompleted}>Done</Text>
        </View>
      );
    }

    if (!task.dueDateIso) {
      return <Text style={styles.dueDateNone}>No due date</Text>;
    }

    if (isOverduePHT(task.dueDateIso)) {
      return (
        <View style={styles.badgeOverdue}>
          <AlertTriangle size={11} color="#EF4444" />
          <Text style={styles.badgeTextOverdue}>Overdue · {task.dueDate}</Text>
        </View>
      );
    }

    if (isTodayPHT(task.dueDateIso)) {
      const timeStr = formatTimePHT(task.dueDateIso);
      return (
        <View style={styles.badgeToday}>
          <Clock size={11} color="#F59E0B" />
          <Text style={styles.badgeTextToday}>Due Today{timeStr ? ` · ${timeStr}` : ''}</Text>
        </View>
      );
    }

    if (isTomorrowPHT(task.dueDateIso)) {
      const timeStr = formatTimePHT(task.dueDateIso);
      return (
        <View style={styles.badgeTomorrow}>
          <Clock size={11} color="#F59E0B" />
          <Text style={styles.badgeTextTomorrow}>Due Tomorrow{timeStr ? ` · ${timeStr}` : ''}</Text>
        </View>
      );
    }

    return (
      <View style={styles.badgeUpcoming}>
        <Calendar size={11} color={colors.mutedForeground} />
        <Text style={styles.badgeTextUpcoming}>{task.dueDate}</Text>
      </View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} renderLeftActions={renderLeftActions}>
      <Pressable
        style={({ pressed }) => [
          styles.container,
          task.completed && styles.containerCompleted,
          pressed && styles.containerPressed,
        ]}
        onPress={onPress}
      >
        {/* Interactive 1-Tap Circular Checkbox */}
        <Pressable
          style={({ pressed }) => [
            styles.checkbox,
            task.completed && styles.checkboxCompleted,
            pressed && { transform: [{ scale: 0.9 }] },
          ]}
          onPress={handleToggleComplete}
          hitSlop={10}
        >
          {task.completed && <Check size={12} color="#ffffff" strokeWidth={3} />}
        </Pressable>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text
              style={[styles.title, task.completed && styles.completedTitle]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
            {!!task.subject && (
              <View style={styles.subjectTag}>
                <Text style={styles.subjectText} numberOfLines={1}>
                  {task.subject}
                </Text>
              </View>
            )}
          </View>

          {/* Description Preview if present */}
          {!!task.description && (
            <View style={styles.descRow}>
              <FileText size={11} color={colors.mutedForeground} />
              <Text
                style={[styles.descText, task.completed && styles.descTextCompleted]}
                numberOfLines={1}
              >
                {task.description}
              </Text>
            </View>
          )}

          {/* Urgency Badge */}
          <View style={styles.footer}>{renderDueBadge()}</View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.card,
      padding: 14,
      marginVertical: 5,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    containerCompleted: {
      backgroundColor: isDark ? 'rgba(18, 21, 31, 0.7)' : 'rgba(244, 244, 245, 0.8)',
      borderColor: colors.border,
      opacity: 0.75,
    },
    containerPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.99 }],
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: isDark ? '#3A4455' : '#D1D5DB',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxCompleted: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    content: {
      flex: 1,
      gap: 6,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
      flex: 1,
      lineHeight: 20,
      includeFontPadding: false,
    },
    completedTitle: {
      textDecorationLine: 'line-through',
      color: colors.mutedForeground,
    },
    subjectTag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      maxWidth: 130,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: colors.border,
      flexShrink: 0,
    },
    subjectText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedForeground,
      includeFontPadding: false,
    },
    descRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    descText: {
      fontSize: 12,
      color: colors.mutedForeground,
      flex: 1,
      includeFontPadding: false,
    },
    descTextCompleted: {
      color: isDark ? '#475569' : '#A1A1AA',
      textDecorationLine: 'line-through',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    dueDateNone: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontStyle: 'italic',
      includeFontPadding: false,
    },
    badgeCompleted: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      flexShrink: 0,
    },
    badgeTextCompleted: {
      fontSize: 11,
      fontWeight: '600',
      color: '#10B981',
      includeFontPadding: false,
      flexShrink: 0,
      paddingRight: 4,
    },
    badgeOverdue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      flexShrink: 0,
    },
    badgeTextOverdue: {
      fontSize: 11,
      fontWeight: '600',
      color: '#EF4444',
      includeFontPadding: false,
      flexShrink: 0,
      paddingRight: 6,
    },
    badgeToday: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      flexShrink: 0,
    },
    badgeTextToday: {
      fontSize: 11,
      fontWeight: '600',
      color: '#F59E0B',
      includeFontPadding: false,
      flexShrink: 0,
      paddingRight: 4,
    },
    badgeTomorrow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      flexShrink: 0,
    },
    badgeTextTomorrow: {
      fontSize: 11,
      fontWeight: '600',
      color: '#F59E0B',
      includeFontPadding: false,
      flexShrink: 0,
      paddingRight: 4,
    },
    badgeUpcoming: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.15)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      flexShrink: 0,
    },
    badgeTextUpcoming: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.mutedForeground,
      includeFontPadding: false,
      flexShrink: 0,
      paddingRight: 4,
    },
    actionButton: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 60,
      marginVertical: 5,
      borderRadius: 14,
    },
    deleteButton: {
      backgroundColor: '#EF4444',
      marginRight: 0,
      marginLeft: 8,
    },
    completeButton: {
      backgroundColor: '#10B981',
      marginLeft: 0,
      marginRight: 8,
    },
  });
}
