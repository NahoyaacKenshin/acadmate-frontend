import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
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

export default function TasksScreen() {
  const powerSync = usePowerSync();
  const { tasks, isLoading } = useTasks();
  const { subjects } = useSubjects();

  const [isAddSheetVisible, setIsAddSheetVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

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
    const d = new Date(iso);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${hour12}:${mins} ${ampm}`;
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

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Button size="icon" variant="ghost" onPress={() => setIsAddSheetVisible(true)}>
            <Plus size={24} color="#6C8EFF" />
          </Button>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#6C8EFF" size="large" />
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks yet.</Text>
            <Text style={styles.emptySubText}>Tap + to add your first task!</Text>
          </View>
        ) : (
          <FlatList
            data={tasks}
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
    fontWeight: '700',
    color: '#ffffff',
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
