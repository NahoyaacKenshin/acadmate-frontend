import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ClassScheduleRow } from '../hooks/useClassSchedules';
import { TaskRow } from '../hooks/useTasks';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface StudyReminderPayload {
  notebookId: string;
  notebookTitle: string;
  focusText: string;
  dateTime: Date;
  leadMinutes?: number;
}

export const NotificationService = {
  /**
   * Requests necessary OS notification permissions.
   */
  requestPermissions: async (): Promise<boolean> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  },

  /**
   * Configures Android specific channels for granular user control.
   */
  configureChannels: async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('classes', {
        name: 'Class Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C8EFF',
      });
      await Notifications.setNotificationChannelAsync('tasks', {
        name: 'Task & Exam Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
      await Notifications.setNotificationChannelAsync('study', {
        name: 'Study Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#A78BFA',
      });
    }
  },

  /**
   * Helper to cancel a group of scheduled notifications by identifier.
   */
  cancelNotification: async (identifier: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (e) {
      console.warn(`Failed to cancel notification: ${identifier}`, e);
    }
  },

  /**
   * Schedules recurring weekly notifications for a class schedule.
   * Day of week: 0 = Sun, 1 = Mon ... 6 = Sat.
   */
  scheduleClassReminders: async (
    schedule: ClassScheduleRow,
    leadMinutes: number
  ): Promise<string[]> => {
    const identifiers: string[] = [];
    const { id, start_time, day_of_week, subject_name, room, modality } = schedule;
    if (!start_time) return [];

    // Parse class time "HH:MM"
    const [hours, minutes] = start_time.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes - leadMinutes;
    let targetDayOfWeek = day_of_week;

    if (totalMinutes < 0) {
      totalMinutes += 24 * 60; // Wrap around to previous day
      targetDayOfWeek = (day_of_week - 1 + 7) % 7;
    }

    const scheduledHour = Math.floor(totalMinutes / 60);
    const scheduledMinute = totalMinutes % 60;

    // Map 0-6 to expo-notifications WeeklyTrigger: 1 = Sun, 2 = Mon ... 7 = Sat
    const triggerWeekday = targetDayOfWeek + 1;
    const identifier = `class_${id}_${day_of_week}`;

    try {
      // First cancel existing to prevent duplication
      await NotificationService.cancelNotification(identifier);

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: `Upcoming Class: ${subject_name || 'Class'}`,
          body: `Starts in ${leadMinutes} mins${room ? ` at Room ${room}` : ''} (${modality})`,
          sound: true,
          data: {
            type: 'class',
            scheduleId: id,
            subjectName: subject_name || 'Class',
            room: room || '',
            modality: modality || '',
            startTime: start_time,
            dayOfWeek: day_of_week,
            leadMinutes,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          channelId: 'classes',
          weekday: triggerWeekday,
          hour: scheduledHour,
          minute: scheduledMinute,
        },
      });

      identifiers.push(identifier);
    } catch (e) {
      console.error('Failed to schedule class reminder', e);
    }

    return identifiers;
  },

  /**
   * Schedules task reminders: 1 day before + 1 hour before + due now.
   */
  scheduleTaskReminders: async (task: TaskRow): Promise<string[]> => {
    const identifiers: string[] = [];
    const { id, title, due_date, subject_name } = task;
    if (!due_date) return [];

    const dueTime = new Date(due_date).getTime();
    const now = Date.now();

    // 1 Day before reminder
    const dayBeforeTime = dueTime - 24 * 60 * 60 * 1000;
    if (dayBeforeTime > now) {
      const idDay = `task_${id}_day`;
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: idDay,
          content: {
            title: `Task Due Tomorrow`,
            body: `"${title}" is due tomorrow${subject_name ? ` for ${subject_name}` : ''}`,
            sound: true,
            data: {
              type: 'task',
              taskId: id,
              title,
              dueDate: due_date,
              subjectName: subject_name || '',
              reminderType: 'day_before',
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId: 'tasks',
            date: new Date(dayBeforeTime),
          },
        });
        identifiers.push(idDay);
      } catch (e) {
        console.error('Failed to schedule task day-before reminder', e);
      }
    }

    // 1 Hour before reminder
    const hourBeforeTime = dueTime - 60 * 60 * 1000;
    if (hourBeforeTime > now) {
      const idHour = `task_${id}_hour`;
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: idHour,
          content: {
            title: `Task Due in 1 Hour`,
            body: `"${title}" is due soon. Make sure to complete it!`,
            sound: true,
            data: {
              type: 'task',
              taskId: id,
              title,
              dueDate: due_date,
              subjectName: subject_name || '',
              reminderType: 'hour_before',
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId: 'tasks',
            date: new Date(hourBeforeTime),
          },
        });
        identifiers.push(idHour);
      } catch (e) {
        console.error('Failed to schedule task hour-before reminder', e);
      }
    }

    // Due time / due soon reminder (if created within the last hour before due date)
    if (hourBeforeTime <= now && dueTime > now + 60 * 1000) {
      const idDue = `task_${id}_due`;
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: idDue,
          content: {
            title: `Task Due Soon`,
            body: `"${title}" is due right now!`,
            sound: true,
            data: {
              type: 'task',
              taskId: id,
              title,
              dueDate: due_date,
              subjectName: subject_name || '',
              reminderType: 'due_now',
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId: 'tasks',
            date: new Date(dueTime),
          },
        });
        identifiers.push(idDue);
      } catch (e) {
        console.error('Failed to schedule task due-now reminder', e);
      }
    }

    return identifiers;
  },

  /**
   * Schedules a study session alert with optional lead-time.
   */
  scheduleStudyReminder: async (payload: StudyReminderPayload): Promise<string> => {
    const { notebookId, notebookTitle, focusText, dateTime, leadMinutes = 0 } = payload;
    const alertTime = new Date(dateTime.getTime() - leadMinutes * 60 * 1000);
    const identifier = `study_${notebookId}_${dateTime.getTime()}`;

    try {
      await NotificationService.cancelNotification(identifier);

      if (alertTime.getTime() > Date.now()) {
        const leadLabel = leadMinutes > 0 ? ` (in ${leadMinutes}m)` : '';
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: `Study Reminder: ${notebookTitle}${leadLabel}`,
            body: focusText || `Get ready for your scheduled study session!`,
            sound: true,
            data: {
              type: 'study',
              notebookId,
              notebookTitle,
              focusText: focusText || '',
              dateTime: dateTime.toISOString(),
              leadMinutes,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId: 'study',
            date: alertTime,
          },
        });
      }
    } catch (e) {
      console.error('Failed to schedule study reminder', e);
    }

    return identifier;
  },

  /**
   * Schedules a quick test notification for immediate on-device verification.
   */
  sendTestNotification: async (delaySeconds = 3): Promise<string> => {
    const identifier = `test_${Date.now()}`;
    const triggerDate = new Date(Date.now() + delaySeconds * 1000);

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: 'AcadMate Local Notification',
        body: 'Offline notification engine & in-app alerts are active and working!',
        sound: true,
        data: {
          type: 'test',
          timestamp: Date.now(),
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        channelId: 'tasks',
        date: triggerDate,
      },
    });

    return identifier;
  },

  /**
   * Bulk helper to synchronize class notifications without cancelling active ones unnecessarily.
   */
  rescheduleAllClasses: async (
    schedules: ClassScheduleRow[],
    enabled: boolean,
    leadMinutes: number,
    studentSet?: 'A' | 'B' | 'Standard' | null
  ) => {
    try {
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const existingClassNotifs = allNotifications.filter((n) => n.identifier.startsWith('class_'));
      const existingIds = new Set(existingClassNotifs.map((n) => n.identifier));

      if (!enabled) {
        for (const notification of existingClassNotifs) {
          await NotificationService.cancelNotification(notification.identifier);
        }
        return;
      }

      // Filter for student set if set
      const filtered = schedules.filter((s) => {
        if (!studentSet || !s.set_type || s.set_type === 'BOTH') return true;
        return s.set_type === studentSet;
      });

      const desiredIds = new Set<string>();

      for (const schedule of filtered) {
        if (!schedule.start_time) continue;
        const identifier = `class_${schedule.id}_${schedule.day_of_week}`;
        desiredIds.add(identifier);
        await NotificationService.scheduleClassReminders(schedule, leadMinutes);
      }

      // Clean up orphaned/deleted class notifications
      for (const existingId of existingIds) {
        if (!desiredIds.has(existingId)) {
          await NotificationService.cancelNotification(existingId);
        }
      }
    } catch (err) {
      console.error('Error in rescheduleAllClasses:', err);
    }
  },

  /**
   * Bulk helper to synchronize task notifications without cancelling active ones unnecessarily.
   */
  rescheduleAllTasks: async (tasks: TaskRow[], enabled: boolean) => {
    try {
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const existingTaskNotifs = allNotifications.filter((n) => n.identifier.startsWith('task_'));
      const existingIds = new Set(existingTaskNotifs.map((n) => n.identifier));

      if (!enabled) {
        for (const notification of existingTaskNotifs) {
          await NotificationService.cancelNotification(notification.identifier);
        }
        return;
      }

      const incompleteTasks = tasks.filter((t) => t.completed === 0 && !!t.due_date);
      const desiredIds = new Set<string>();

      for (const task of incompleteTasks) {
        const scheduledIds = await NotificationService.scheduleTaskReminders(task);
        scheduledIds.forEach((id) => desiredIds.add(id));
      }

      // Clean up orphaned task notifications (completed or deleted tasks)
      for (const existingId of existingIds) {
        if (!desiredIds.has(existingId)) {
          await NotificationService.cancelNotification(existingId);
        }
      }
    } catch (err) {
      console.error('Error in rescheduleAllTasks:', err);
    }
  },
};
