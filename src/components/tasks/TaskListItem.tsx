import React, { useState, useMemo } from 'react';
import { View, Pressable, StyleSheet, Vibration } from 'react-native';
import { Text } from '../ui/text';
import { Check, Trash, AlertTriangle, Clock, Calendar, FileText, ListChecks, ChevronDown } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { isOverduePHT, isTodayPHT, isTomorrowPHT, formatTimePHT } from '@/src/utils/philippineTime';
import { SubtaskItem } from '@/src/hooks/useTasks';

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

interface TaskListItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onPress: () => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
}

export function TaskListItem({ task, onComplete, onDelete, onPress, onToggleSubtask }: TaskListItemProps) {
  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(false);

  const subtaskList: SubtaskItem[] = useMemo(() => {
    if (!task.subtasks) return [];
    try {
      const parsed = JSON.parse(task.subtasks);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [task.subtasks]);

  const completedSubtasksCount = subtaskList.filter((s) => s.completed).length;

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
        <Calendar size={11} color="#94A3B8" />
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
              <FileText size={11} color="#64748B" />
              <Text
                style={[styles.descText, task.completed && styles.descTextCompleted]}
                numberOfLines={1}
              >
                {task.description}
              </Text>
            </View>
          )}

          {/* Subtasks Progress Pill */}
          {subtaskList.length > 0 && (
            <Pressable
              style={styles.subtasksPill}
              onPress={(e) => {
                e.stopPropagation();
                setIsSubtasksExpanded((prev) => !prev);
              }}
              hitSlop={6}
            >
              <ListChecks size={12} color="#6C8EFF" />
              <Text style={styles.subtasksPillText}>
                {completedSubtasksCount}/{subtaskList.length} subtasks
              </Text>
              <ChevronDown
                size={12}
                color="#6C8EFF"
                style={isSubtasksExpanded ? { transform: [{ rotate: '180deg' }] } : undefined}
              />
            </Pressable>
          )}

          {/* Subtasks Expanded List */}
          {isSubtasksExpanded && subtaskList.length > 0 && (
            <View style={styles.subtasksContainer}>
              {subtaskList.map((st) => (
                <Pressable
                  key={st.id}
                  style={styles.subtaskRow}
                  onPress={(e) => {
                    e.stopPropagation();
                    onToggleSubtask?.(task.id, st.id);
                  }}
                  hitSlop={6}
                >
                  <View style={[styles.subtaskCheckbox, st.completed && styles.subtaskCheckboxDone]}>
                    {st.completed && <Check size={10} color="#ffffff" strokeWidth={3} />}
                  </View>
                  <Text
                    style={[styles.subtaskTitle, st.completed && styles.subtaskTitleDone]}
                    numberOfLines={2}
                  >
                    {st.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Urgency Badge */}
          <View style={styles.footer}>{renderDueBadge()}</View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#161A26',
    padding: 14,
    marginVertical: 5,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3143',
    gap: 12,
  },
  containerCompleted: {
    backgroundColor: '#12151F',
    borderColor: '#1E2330',
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
    borderColor: '#3A4455',
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
    color: '#ffffff',
    flex: 1,
    lineHeight: 20,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  subjectTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 130,
    backgroundColor: 'rgba(113, 113, 122, 0.16)',
  },
  subjectText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  descRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  descText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  descTextCompleted: {
    color: '#475569',
    textDecorationLine: 'line-through',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dueDateNone: {
    fontSize: 11,
    color: '#4A5568',
    fontStyle: 'italic',
  },
  badgeCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeTextCompleted: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  badgeOverdue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeTextOverdue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  badgeToday: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeTextToday: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  badgeTomorrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeTextTomorrow: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FCD34D',
  },
  badgeUpcoming: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeTextUpcoming: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
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
    marginRight: 16,
    marginLeft: -8,
  },
  completeButton: {
    backgroundColor: '#10B981',
    marginLeft: 16,
    marginRight: -8,
  },
  subtasksPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(108, 142, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(108, 142, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginVertical: 4,
  },
  subtasksPillText: {
    fontSize: 11,
    color: '#6C8EFF',
    fontWeight: '600',
  },
  subtasksContainer: {
    backgroundColor: '#10131C',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E2330',
    padding: 8,
    gap: 6,
    marginVertical: 4,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  subtaskCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#4A5568',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskCheckboxDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  subtaskTitle: {
    fontSize: 12,
    color: '#CBD5E1',
    flex: 1,
  },
  subtaskTitleDone: {
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
});
