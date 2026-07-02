import React, { useState } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { Button } from '@/src/components/ui/button';
import { Plus } from 'lucide-react-native';
import { Task, TaskListItem } from '@/src/components/tasks/TaskListItem';
import { AddTaskSheet } from '@/src/components/tasks/AddTaskSheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Complete Math Assignment',
    subject: 'Math 101',
    subjectColor: '#EF4444',
    dueDate: '2026-07-03',
    completed: false,
  },
  {
    id: '2',
    title: 'Read Physics Chapter 5',
    subject: 'Physics 202',
    subjectColor: '#3B82F6',
    dueDate: '2026-07-04',
    completed: true,
  },
  {
    id: '3',
    title: 'Prepare History Presentation',
    subject: 'History 301',
    subjectColor: '#10B981',
    dueDate: '2026-07-05',
    completed: false,
  },
];

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isAddSheetVisible, setIsAddSheetVisible] = useState(false);

  const handleCompleteTask = (id: string) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
  };

  const handlePressTask = (task: Task) => {
    console.log('Edit task:', task.id);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Button size="icon" variant="ghost" onPress={() => setIsAddSheetVisible(true)}>
            <Plus size={24} color="#6C8EFF" />
          </Button>
        </View>

        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskListItem
              task={item}
              onComplete={handleCompleteTask}
              onDelete={handleDeleteTask}
              onPress={handlePressTask}
            />
          )}
          contentContainerStyle={styles.listContent}
        />

        <AddTaskSheet
          visible={isAddSheetVisible}
          onClose={() => setIsAddSheetVisible(false)}
          onAdd={(newTask) => {
            setTasks([newTask, ...tasks]);
            setIsAddSheetVisible(false);
          }}
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
});
