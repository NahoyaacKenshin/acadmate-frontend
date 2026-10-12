import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Platform,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CheckSquare,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  Inbox,
  Clock,
  CalendarCheck2,
} from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePowerSync } from '@powersync/react';

import { router } from 'expo-router';

import { TaskListItem } from '@/src/components/tasks/TaskListItem';
import { AddTaskSheet } from '@/src/components/tasks/AddTaskSheet';
import { EditTaskSheet } from '@/src/components/tasks/EditTaskSheet';
import { TaskDetailModal } from '@/src/components/tasks/TaskDetailModal';
import { useTasks, TaskRow } from '@/src/hooks/useTasks';
import { useSubjects } from '@/src/hooks/useSubjects';

import { ConfirmModal } from '@/src/components/common/ConfirmModal';
import { NotificationService } from '@/src/services/notificationService';
import {
  formatDateTimePHT,
  isOverduePHT,
  parseToEpoch,
  toPhilippineISO,
} from '@/src/utils/philippineTime';
import { groupTasksByTimeline, TaskSection } from '@/src/utils/taskGrouping';
import { useTheme } from '@/src/theme/useTheme';
import type { ThemeColors } from '@/src/theme/tokens';
import {
  ActionMenuButton,
  ActionMenuDropdown,
  ActionMenuItem,
  useActionMenu,
} from '@/src/components/common/ActionMenuDropdown';

type TaskFilter = 'all' | 'pending' | 'overdue' | 'done';

export default function TasksScreen() {
  const { tasks, isLoading } = useTasks();
  const { subjects } = useSubjects();
  const powerSync = usePowerSync();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [isAddSheetVisible, setIsAddSheetVisible] = useState(false);
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);
  const [viewingTask, setViewingTask] = useState<TaskRow | null>(null);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  // Action Menu state & layout
  const [headerHeight, setHeaderHeight] = useState(0);
  const {
    isOpen: isActionMenuOpen,
    isMounted: isActionMenuMounted,
    anim: menuAnim,
    toggleMenu: toggleActionMenu,
    closeMenu: closeActionMenu,
  } = useActionMenu();

  const taskMenuItems = useMemo<ActionMenuItem[]>(() => [
    {
      id: 'manual',
      label: 'New Task',
      subtitle: 'Create a task manually',
      icon: CheckSquare,
      iconColor: '#6366F1',
      iconBg: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.1)',
      onPress: () => setIsAddSheetVisible(true),
    },
    {
      id: 'scan',
      label: 'Scan Tasks',
      subtitle: 'Auto-detect from syllabus or photo',
      icon: Sparkles,
      iconColor: '#6366F1',
      iconBg: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.1)',
      onPress: () => router.push('/(app)/task-upload'),
    },
  ], [isDark]);

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

  // Keep viewingTask in sync with reactive SQLite updates
  const activeViewingTask = useMemo(() => {
    if (!viewingTask) return null;
    return tasks.find((t) => t.id === viewingTask.id) ?? viewingTask;
  }, [tasks, viewingTask]);

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
    const now = toPhilippineISO(new Date());

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
    setViewingTask(task);
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
    subject: task.subject_name ?? 'General',
    subjectColor: task.subject_color ?? task.color ?? colors.primary,
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
        <View
          style={styles.header}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        >
          <Text style={styles.headerTitle}>Tasks</Text>
          <ActionMenuButton
            isOpen={isActionMenuOpen}
            onPress={toggleActionMenu}
            anim={menuAnim}
            accessibilityLabel="Add task options"
          />
        </View>

        {/* Action Menu Dropdown */}
        <ActionMenuDropdown
          isMounted={isActionMenuMounted}
          isOpen={isActionMenuOpen}
          anim={menuAnim}
          onClose={closeActionMenu}
          items={taskMenuItems}
          top={headerHeight + 56}
          right={16}
        />

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
                  numberOfLines={1}
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
                    <View
                      style={[
                        styles.subjectDot,
                        { backgroundColor: sub.color || '#6366F1' },
                      ]}
                    />
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
            <ActivityIndicator color="#6366F1" size="large" />
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              {activeFilter === 'done' ? (
                <CalendarCheck2 size={28} color={colors.mutedForeground} />
              ) : activeFilter === 'overdue' ? (
                <Clock size={28} color="#10B981" />
              ) : (
                <Inbox size={28} color={colors.mutedForeground} />
              )}
            </View>
            <Text style={styles.emptyText}>
              {activeFilter === 'pending'
                ? 'No pending tasks'
                : activeFilter === 'overdue'
                ? 'No overdue tasks'
                : activeFilter === 'done'
                ? 'No completed tasks yet'
                : 'No tasks found'}
            </Text>
            <Text style={styles.emptySubText}>
              {activeFilter === 'pending' || activeFilter === 'all'
                ? 'Tap + above to create a task or scan a document.'
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
                      color={colors.mutedForeground}
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

        {/* Read-Only Task Detail Modal */}
        <TaskDetailModal
          visible={activeViewingTask !== null}
          task={activeViewingTask}
          onClose={() => setViewingTask(null)}
          onEdit={(t) => {
            setViewingTask(null);
            setEditingTask(t);
          }}
        />

        {/* Add Task Sheet */}
        <AddTaskSheet
          visible={isAddSheetVisible}
          subjects={subjects}
          onClose={() => setIsAddSheetVisible(false)}
          onOpenScanner={() => {
            setIsAddSheetVisible(false);
            router.push('/(app)/task-upload');
          }}
        />

        {/* Edit Task Sheet */}
        <EditTaskSheet
          visible={editingTask !== null}
          task={editingTask}
          subjects={subjects}
          onClose={() => setEditingTask(null)}
        />

        {/* Delete Confirmation Modal */}
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

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      lineHeight: 34,
      fontWeight: '700',
      color: colors.foreground,
      includeFontPadding: false,
    },
    progressCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 14,
      gap: 10,
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
      color: colors.foreground,
      includeFontPadding: false,
    },
    progressStats: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontWeight: '500',
      includeFontPadding: false,
    },
    progressBarBg: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
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
      paddingVertical: 8,
      paddingHorizontal: 2,
      borderRadius: 9,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterPillActive: {
      backgroundColor: '#6366F1',
      borderColor: '#6366F1',
    },
    filterPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.mutedForeground,
      includeFontPadding: false,
      flexShrink: 0,
      paddingHorizontal: 2,
      textAlign: 'center',
    },
    filterPillTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    subjectFilterWrapper: {
      marginBottom: 12,
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
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      flexShrink: 0,
    },
    subjectPillActive: {
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.12)',
      borderColor: '#6366F1',
    },
    subjectDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    subjectPillText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.mutedForeground,
      includeFontPadding: false,
      flexShrink: 0,
    },
    subjectPillTextActive: {
      color: '#6366F1',
      fontWeight: '700',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 130,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 8,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    sectionIndicator: {
      width: 4,
      height: 14,
      borderRadius: 2,
      marginRight: 8,
      flexShrink: 0,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.foreground,
      includeFontPadding: false,
      flexShrink: 0,
      marginRight: 8,
      paddingRight: 6,
    },
    sectionBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 10,
      flexShrink: 0,
    },
    sectionBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      includeFontPadding: false,
      flexShrink: 0,
    },
    collapseBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
      paddingLeft: 8,
    },
    collapseBtnText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontWeight: '600',
      includeFontPadding: false,
      flexShrink: 0,
      paddingRight: 6,
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
      paddingHorizontal: 32,
      marginTop: 40,
    },
    emptyIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 6,
      textAlign: 'center',
      includeFontPadding: false,
      paddingHorizontal: 4,
    },
    emptySubText: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 18,
      includeFontPadding: false,
    },
  });
}
