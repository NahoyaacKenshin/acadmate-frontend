import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useClassSchedules } from '../hooks/useClassSchedules';
import { useTasks } from '../hooks/useTasks';
import { NotificationService } from '../services/notificationService';
import { useNotificationStore } from '../store/notificationStore';
import { useNotificationDeepLink } from '../hooks/useNotificationDeepLink';

const NotificationContext = createContext<void | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { schedules } = useClassSchedules();
  const { tasks } = useTasks();
  const { prefs } = useNotificationStore();

  const prevSchedulesRef = useRef(schedules);
  const prevTasksRef = useRef(tasks);
  const prevPrefsRef = useRef(prefs);

  // Bind notification deep-linking handler
  useNotificationDeepLink();

  // Initialization: Request permission & Setup Android channels
  useEffect(() => {
    async function initNotifications() {
      const isGranted = await NotificationService.requestPermissions();
      if (isGranted) {
        await NotificationService.configureChannels();
      }
    }
    initNotifications();
  }, []);

  // Sync / Reschedule loop when local DB data or notification settings change
  useEffect(() => {
    const schedulesChanged = prevSchedulesRef.current !== schedules;
    const tasksChanged = prevTasksRef.current !== tasks;
    const prefsChanged = prevPrefsRef.current !== prefs;

    // Reschedule classes if schedules list or settings (enabled, lead time) changed
    if (
      schedulesChanged ||
      (prefsChanged &&
        (prevPrefsRef.current.classReminders !== prefs.classReminders ||
          prevPrefsRef.current.classLeadMinutes !== prefs.classLeadMinutes))
    ) {
      NotificationService.rescheduleAllClasses(schedules, prefs.classReminders, prefs.classLeadMinutes);
      prevSchedulesRef.current = schedules;
    }

    // Reschedule tasks if tasks list or task reminders settings changed
    if (
      tasksChanged ||
      (prefsChanged && prevPrefsRef.current.taskReminders !== prefs.taskReminders)
    ) {
      NotificationService.rescheduleAllTasks(tasks, prefs.taskReminders);
      prevTasksRef.current = tasks;
    }

    prevPrefsRef.current = prefs;
  }, [schedules, tasks, prefs]);

  return (
    <NotificationContext.Provider value={undefined}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
