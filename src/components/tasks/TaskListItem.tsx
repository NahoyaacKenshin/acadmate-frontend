import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '../ui/text';
import { Check, Trash } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

export interface Task {
  id: string;
  title: string;
  subject: string;
  subjectColor: string;
  dueDate: string;
  completed: boolean;
}

interface TaskListItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onPress: () => void;
}

export function TaskListItem({ task, onComplete, onDelete, onPress }: TaskListItemProps) {
  const renderRightActions = () => {
    return (
      <Pressable
        style={[styles.actionButton, styles.deleteButton]}
        onPress={() => onDelete(task.id)}
      >
        <Trash size={20} color="#fff" />
      </Pressable>
    );
  };

  const renderLeftActions = () => {
    return (
      <Pressable
        style={[styles.actionButton, styles.completeButton]}
        onPress={() => onComplete(task.id)}
      >
        <Check size={20} color="#fff" />
      </Pressable>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} renderLeftActions={renderLeftActions}>
      <Pressable
        style={styles.container}
        onPress={() => onPress()}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, task.completed && styles.completedTitle]}>
              {task.title}
            </Text>
            <View style={[styles.subjectTag, { backgroundColor: task.subjectColor + '20' }]}>
              <Text style={[styles.subjectText, { color: task.subjectColor }]}>{task.subject}</Text>
            </View>
          </View>
          <Text style={styles.dueDate}>Due: {task.dueDate}</Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1F2E',
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  subjectTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dueDate: {
    fontSize: 14,
    color: '#94A3B8',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    marginVertical: 6,
    borderRadius: 12,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    marginRight: 16,
    marginLeft: -8,
  },
  completeButton: {
    backgroundColor: '#10b981',
    marginLeft: 16,
    marginRight: -8,
  },
});
