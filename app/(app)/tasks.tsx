import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/src/components/ui/text';
import { Button } from '@/src/components/ui/button';
import { Plus, CheckCircle2, Sparkles, ChevronDown } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePowerSync } from '@powersync/react';

import { TaskListItem } from '@/src/components/tasks/TaskListItem';
import { AddTaskSheet } from '@/src/components/tasks/AddTaskSheet';
import { EditTaskSheet } from '@/src/components/tasks/EditTaskSheet';
import { TaskScanModal } from '@/src/components/tasks/TaskScanModal';
import { useTasks, TaskRow, SubtaskItem } from '@/src/hooks/useTasks';
import { useSubjects } from '@/src/hooks/useSubjects';

import { ConfirmModal } from '@/src/components/common/ConfirmModal';
import { NotificationService } from '@/src/services/notificationService';
import { formatDateTimePHT, isOverduePHT, parseToEpoch } from '@/src/utils/philippineTime';
import { groupTasksByTimeline, TaskSection } from '@/src/utils/taskGrouping';

type TaskFilter = 'all' | 'pending' | 'overdue' | 'done';

export default function TasksScreen() {
  const { tasks, isLoading } = useTasks();
  const { subjects } = useSubjects();
  const powerSync = usePowerSync();

  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [isAddSheetVisible, setIsAddSheetVisible] = useState(false);
  const [isScanModalVisible, setIsScanModalVisible] = useState(false);
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  // Overall statistics for progress card
  const totalTasks = tasks.length;
  const completedTasks = useMemo(() => tasks.filter((t) => t.completed === 1).length, [tasks]);
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Subject filter
      if (selectedSubjectId !== null && t.subject_id !== selectedSubjectId) {
        return false;
      }
      // Status filter
      if (activeFilter === 'pending') return t.completed === 0;
      if (activeFilter === 'done') return t.completed === 1;
      if (activeFilter === 'overdue') {
        if (t.completed === 1 || !t.due_date) return false;
        return isOverduePHT(t.due_date);
      }
      return true; // 'all'
    });
  }, [tasks, activeFilter, selectedSubjectId]);

  // Grouped Timeline Sections
  const timelineSections = useMemo<TaskSection[]>(() => {
    if (activeFilter === 'overdue') {
      return [{
        key: 'overdue' as const,
        title: 'Overdue Tasks',
        badgeColor: '#EF4444',
        data: filteredTasks,
        totalCount: filteredTasks.length,
      }].filter((s) => s.data.length > 0);
    }
    if (activeFilter === 'done') {
      return [{
        key: 'completed' as const,
        title: 'Completed Tasks',
        badgeColor: '#10B981',
        data: filteredTasks,
        totalCount: filteredTasks.length,
        collapsible: false,
      }].filter((s) => s.data.length > 0);
    }

    const grouped = groupTasksByTimeline(filteredTasks);
    const activeGrouped = activeFilter === 'pending'
      ? grouped.filter((s) => s.key !== 'completed')
      : grouped;

    return activeGrouped
      .filter((s) => s.data.length > 0)
      .map((s) => {
        if (s.collapsible && isCompletedCollapsed) {
          return {
            ...s,
            totalCount: s.data.length,
            data: [],
          };
        }
        return {
          ...s,
          totalCount: s.data.length,
        };
      });
  }, [filteredTasks, activeFilter, isCompletedCollapsed]);

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

      if (newCompleted === 1) {
        // Cancel pending notifications when task is marked done
        await NotificationService.cancelTaskNotifications(id);
      } else {
        // If uncompleted and due date is in the future, re-schedule reminders
        if (task.due_date && (parseToEpoch(task.due_date) ?? 0) > Date.now()) {
          await NotificationService.scheduleTaskReminders(task);
        }
      }
    } catch (err) {
      console.error('[Tasks] Toggle complete failed:', err);
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let subtaskList: SubtaskItem[] = [];
    try {
      subtaskList = task.subtasks ? JSON.parse(task.subtasks) : [];
    } catch {}

    const updatedSubtasks = subtaskList.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const now = new Date().toISOString();
    try {
      await powerSync.execute(
        `UPDATE Task SET subtasks = ?, updatedAt = ? WHERE id = ?`,
        [JSON.stringify(updatedSubtasks), now, taskId]
      );
    } catch (err) {
      console.error('[Tasks] Toggle subtask failed:', err);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTaskToDeleteId(id);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDeleteId) return;
    try {
      // Cancel local notifications
      await NotificationService.cancelTaskNotifications(taskToDeleteId);
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
    description: task.description,
    subject: task.subject_name ?? 'No Subject',
    subjectColor: task.subject_color ?? '#6C8EFF',
    dueDate: formatDueDate(task.due_date),
    dueDateIso: task.due_date,
    completed: task.completed === 1,
    subtasks: task.subtasks,
  });

  const filterTabs: Array<{ key: TaskFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'done', label: 'Done' },
  ];

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tasks</Text>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.scanHeaderBtn}
              onPress={() => setIsScanModalVisible(true)}
              hitSlop={8}
            >
              <Sparkles size={16} color="#6C8EFF" />
              <Text style={styles.scanHeaderBtnText}>Scan</Text>
            </Pressable>
            <Button size="icon" variant="ghost" onPress={() => setIsAddSheetVisible(true)}>
              <Plus size={24} color="#6C8EFF" />
            </Button>
          </View>
        </View>

        {/* Progress Card */}
        {totalTasks > 0 && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View style={styles.progressTitleRow}>
                <CheckCircle2 size={15} color="#10B981" />
                <Text style={styles.progressTitle}>Progress</Text>
              </View>
              <Text style={styles.progressStats}>
                {completedTasks} of {totalTasks} completed ({progressPercent}%)
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>
        )}

        {/* Status Filter Tabs */}
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

        {/* Horizontal Subject Filter Bar */}
        {subjects.length > 0 && (
          <View style={styles.subjectFilterWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subjectFilterScroll}
            >
              <Pressable
                style={[
                  styles.subjectPill,
                  selectedSubjectId === null && styles.subjectPillActive,
                ]}
                onPress={() => setSelectedSubjectId(null)}
              >
                <Text
                  style={[
                    styles.subjectPillText,
                    selectedSubjectId === null && styles.subjectPillTextActive,
                  ]}
                >
                  All Subjects
                </Text>
              </Pressable>
              {subjects.map((sub) => {
                const isSubActive = selectedSubjectId === sub.id;
                return (
                  <Pressable
                    key={sub.id}
                    style={[
                      styles.subjectPill,
                      isSubActive && styles.subjectPillActive,
                    ]}
                    onPress={() => setSelectedSubjectId(isSubActive ? null : sub.id)}
                  >
                    <Text
                      style={[
                        styles.subjectPillText,
                        isSubActive && styles.subjectPillTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {sub.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Task List / Loading / Empty State */}
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
                : 'No tasks found.'}
            </Text>
            <Text style={styles.emptySubText}>
              {activeFilter === 'pending' || activeFilter === 'all'
                ? 'Tap + to add your first task!'
                : 'Keep up the good work!'}
            </Text>
          </View>
        ) : (
          <SectionList
            sections={timelineSections}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled={false}
            renderItem={({ item }) => (
              <TaskListItem
                task={mapToListItem(item)}
                onComplete={handleCompleteTask}
                onDelete={handleDeleteTask}
                onPress={() => handlePressTask(item)}
                onToggleSubtask={handleToggleSubtask}
              />
            )}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.sectionIndicator, { backgroundColor: section.badgeColor }]} />
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={[styles.sectionBadge, { backgroundColor: section.badgeColor + '20' }]}>
                    <Text style={[styles.sectionBadgeText, { color: section.badgeColor }]}>
                      {section.totalCount ?? section.data.length}
                    </Text>
                  </View>
                </View>
                {section.collapsible && (
                  <Pressable
                    style={styles.collapseBtn}
                    onPress={() => setIsCompletedCollapsed((prev) => !prev)}
                    hitSlop={8}
                  >
                    <Text style={styles.collapseBtnText}>
                      {isCompletedCollapsed ? 'Show' : 'Hide'}
                    </Text>
                    <ChevronDown
                      size={14}
                      color="#94A3B8"
                      style={{ transform: [{ rotate: isCompletedCollapsed ? '0deg' : '180deg' }] }}
                    />
                  </Pressable>
                )}
              </View>
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            windowSize={7}
            maxToRenderPerBatch={10}
            initialNumToRender={8}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}

        <AddTaskSheet
          visible={isAddSheetVisible}
          subjects={subjects}
          onClose={() => setIsAddSheetVisible(false)}
          onOpenScanner={() => {
            setIsAddSheetVisible(false);
            setIsScanModalVisible(true);
          }}
        />

        <TaskScanModal
          visible={isScanModalVisible}
          subjects={subjects}
          onClose={() => setIsScanModalVisible(false)}
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
  progressCard: {
    backgroundColor: '#161A26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  progressStats: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2A3143',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#2A3143',
    alignItems: 'center',
    justifyContent: 'center',
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
  subjectFilterWrapper: {
    marginBottom: 8,
  },
  subjectFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  subjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  subjectPillActive: {
    backgroundColor: 'rgba(108, 142, 255, 0.15)',
    borderColor: '#6C8EFF',
  },
  subjectPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subjectPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  subjectPillTextActive: {
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
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptySubText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 142, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(108, 142, 255, 0.25)',
  },
  scanHeaderBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C8EFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#10131C',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: 0.2,
  },
  sectionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  collapseBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
