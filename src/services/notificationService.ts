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
   * Helper to cancel a group of scheduled notifications by prefix/identifier.
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

    // Parse class time "HH:MM"
    const [hours, minutes] = start_time.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes - leadMinutes;
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60; // Wrap around to previous day
    }

    const scheduledHour = Math.floor(totalMinutes / 60);
    const scheduledMinute = totalMinutes % 60;

    // Map 0-6 to expo-notifications WeeklyTrigger: 1 = Sun, 2 = Mon ... 7 = Sat
    const triggerDay = day_of_week + 1;
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
          data: { type: 'class', scheduleId: id },
        },
        trigger: {
          channelId: 'classes',
          weekday: triggerDay,
          hour: scheduledHour,
          minute: scheduledMinute,
          repeats: true,
        } as any,
      });

      identifiers.push(identifier);
    } catch (e) {
      console.error('Failed to schedule class reminder', e);
    }

    return identifiers;
  },

  /**
   * Schedules task reminders: 1 day before + 1 hour before.
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
        await NotificationService.cancelNotification(idDay);
        await Notifications.scheduleNotificationAsync({
          identifier: idDay,
          content: {
            title: `Task Due Tomorrow`,
            body: `"${title}" is due tomorrow${subject_name ? ` for ${subject_name}` : ''}`,
            sound: true,
            data: { type: 'task', taskId: id },
          },
          trigger: {
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
        await NotificationService.cancelNotification(idHour);
        await Notifications.scheduleNotificationAsync({
          identifier: idHour,
          content: {
            title: `Task Due in 1 Hour`,
            body: `"${title}" is due soon. Make sure to complete it!`,
            sound: true,
            data: { type: 'task', taskId: id },
          },
          trigger: {
            channelId: 'tasks',
            date: new Date(hourBeforeTime),
          },
        });
        identifiers.push(idHour);
      } catch (e) {
        console.error('Failed to schedule task hour-before reminder', e);
      }
    }

    return identifiers;
  },

  /**
   * Schedules a one-off study session alert.
   */
  scheduleStudyReminder: async (payload: StudyReminderPayload): Promise<string> => {
    const { notebookId, notebookTitle, focusText, dateTime } = payload;
    const identifier = `study_${notebookId}_${dateTime.getTime()}`;

    try {
      await NotificationService.cancelNotification(identifier);

      if (dateTime.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: `Time to Study: ${notebookTitle}`,
            body: focusText || `Get ready for your scheduled study session!`,
            sound: true,
            data: { type: 'study', notebookId },
          },
          trigger: {
            channelId: 'study',
            date: dateTime,
          },
        });
      }
    } catch (e) {
      console.error('Failed to schedule study reminder', e);
    }

    return identifier;
  },

  /**
   * Bulk helper to cancel and reschedule all class notifications.
   */
  rescheduleAllClasses: async (schedules: ClassScheduleRow[], enabled: boolean, leadMinutes: number) => {
    // 1. Cancel all scheduled classes matching trigger identifiers
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const classReminders = allNotifications.filter(n => n.identifier.startsWith('class_'));
    for (const notification of classReminders) {
      await NotificationService.cancelNotification(notification.identifier);
    }

    if (!enabled) return;

    // 2. Schedule each active schedule
    for (const schedule of schedules) {
      await NotificationService.scheduleClassReminders(schedule, leadMinutes);
    }
  },

  /**
   * Bulk helper to cancel and reschedule all task notifications.
   */
  rescheduleAllTasks: async (tasks: TaskRow[], enabled: boolean) => {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const taskReminders = allNotifications.filter(n => n.identifier.startsWith('task_'));
    for (const notification of taskReminders) {
      await NotificationService.cancelNotification(notification.identifier);
    }

    if (!enabled) return;

    const incompleteTasks = tasks.filter(t => t.completed === 0);
    for (const task of incompleteTasks) {
      await NotificationService.scheduleTaskReminders(task);
    }
  },
};
