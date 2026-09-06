import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/src/components/ui/text';
import { Button } from '@/src/components/ui/button';
import { Plus } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePowerSync } from '@powersync/react';

import { TaskListItem } from '@/src/components/tasks/TaskListItem';
import { AddTaskSheet } from '@/src/components/tasks/AddTaskSheet';
import { EditTaskSheet } from '@/src/components/tasks/EditTaskSheet';
import { useTasks, TaskRow } from '@/src/hooks/useTasks';
import { useSubjects } from '@/src/hooks/useSubjects';

import { ConfirmModal } from '@/src/components/common/ConfirmModal';
import { NotificationService } from '@/src/services/notificationService';
import { formatDateTimePHT, isOverduePHT, parseToEpoch } from '@/src/utils/philippineTime';

type TaskFilter = 'all' | 'pending' | 'overdue' | 'done';

export default function TasksScreen() {
  const { tasks, isLoading } = useTasks();
  const { subjects } = useSubjects();
  const powerSync = usePowerSync();

  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all');
  const [isAddSheetVisible, setIsAddSheetVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  // Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((t) => {
      if (activeFilter === 'pending') return t.completed === 0;
      if (activeFilter === 'done') return t.completed === 1;
      if (activeFilter === 'overdue') {
        if (t.completed === 1 || !t.due_date) return false;
        return isOverduePHT(t.due_date);
      }
      return true; // 'all'
    });

    return filtered.sort((a, b) => {
      // Completed tasks go to the bottom in 'all' view
      if (activeFilter === 'all' && a.completed !== b.completed) {
        return a.completed - b.completed;
      }
      // Sort by due date ascending (earliest first); items without due date at the end
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return (parseToEpoch(a.due_date) ?? 0) - (parseToEpoch(b.due_date) ?? 0);
    });
  }, [tasks, activeFilter]);

  const handleCompleteTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newCompleted = task.completed === 0 ? 1 : 0;
    const now = new Date().toISOString();

    try {
      await powerSync.execute(
        `UPDATE Task SET completed = ?, updatedAt = ? WHERE id = ?`,
        [newCompleted, now, id]
      );
    } catch (err) {
      console.error('[Tasks] Toggle complete failed:', err);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTaskToDeleteId(id);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDeleteId) return;
    try {
      // Cancel local notifications
      await NotificationService.cancelNotification(`task_${taskToDeleteId}_day`);
      await NotificationService.cancelNotification(`task_${taskToDeleteId}_hour`);
      await NotificationService.cancelNotification(`task_${taskToDeleteId}_due`);

      await powerSync.execute(`DELETE FROM Task WHERE id = ?`, [taskToDeleteId]);
    } catch (err) {
      console.error('[Tasks] Delete failed:', err);
    } finally {
      setTaskToDeleteId(null);
    }
  };

  const handlePressTask = (task: TaskRow) => {
    setEditingTask(task);
  };

  const formatDueDate = (iso: string | null): string => {
    if (!iso) return 'No due date';
    return formatDateTimePHT(iso) || 'No due date';
  };

  // Map TaskRow to the shape TaskListItem expects
  const mapToListItem = (task: TaskRow) => ({
    id: task.id,
    title: task.title,
    subject: task.subject_name ?? 'No Subject',
    subjectColor: task.subject_color ?? '#6C8EFF',
    dueDate: formatDueDate(task.due_date),
    completed: task.completed === 1,
  });

  const filterTabs: Array<{ key: TaskFilter; label: string }> = [
    { key: 'pending', label: 'Pending' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'done', label: 'Done' },
    { key: 'all', label: 'All' },
  ];

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Button size="icon" variant="ghost" onPress={() => setIsAddSheetVisible(true)}>
            <Plus size={24} color="#6C8EFF" />
          </Button>
        </View>

        {/* Filter Bar */}
        <View style={styles.filterRow}>
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setActiveFilter(tab.key)}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#6C8EFF" size="large" />
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeFilter === 'pending'
                ? 'No pending tasks!'
                : activeFilter === 'overdue'
                ? 'No overdue tasks 🎉'
                : activeFilter === 'done'
                ? 'No completed tasks yet.'
                : 'No tasks yet.'}
            </Text>
            <Text style={styles.emptySubText}>
              {activeFilter === 'pending' || activeFilter === 'all'
                ? 'Tap + to add your first task!'
                : 'Keep up the good work!'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TaskListItem
                task={mapToListItem(item)}
                onComplete={handleCompleteTask}
                onDelete={handleDeleteTask}
                onPress={() => handlePressTask(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        )}

        <AddTaskSheet
          visible={isAddSheetVisible}
          subjects={subjects}
          onClose={() => setIsAddSheetVisible(false)}
        />

        <EditTaskSheet
          visible={editingTask !== null}
          task={editingTask}
          subjects={subjects}
          onClose={() => setEditingTask(null)}
        />

        <ConfirmModal
          visible={taskToDeleteId !== null}
          title="Delete Task?"
          description="Are you sure you want to delete this task? This action cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={confirmDeleteTask}
          onCancel={() => setTaskToDeleteId(null)}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10131C',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    color: '#ffffff',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  filterPillActive: {
    backgroundColor: 'rgba(108, 142, 255, 0.15)',
    borderColor: '#6C8EFF',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  filterPillTextActive: {
    color: '#6C8EFF',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptySubText: {
    fontSize: 14,
    color: '#94A3B8',
  },
});
