import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useClassSchedules } from '../hooks/useClassSchedules';
import { useTasks } from '../hooks/useTasks';
import { NotificationService } from '../services/notificationService';
import { useNotificationStore } from '../store/notificationStore';
import { useUserStore } from '../store/userStore';
import { useNotificationDeepLink } from '../hooks/useNotificationDeepLink';
import { InAppNotificationBanner } from '../components/common/InAppNotificationBanner';

const NotificationContext = createContext<void | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { schedules } = useClassSchedules();
  const { tasks } = useTasks();
  const { prefs } = useNotificationStore();
  const { studentSet } = useUserStore();

  const prevSchedulesSigRef = useRef<string>('');
  const prevTasksSigRef = useRef<string>('');
  const prevPrefsRef = useRef(prefs);
  const prevStudentSetRef = useRef(studentSet);

  // Bind notification deep-linking handler (foreground, background, cold start)
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
    // Build lightweight signatures based on fields that actually affect notifications
    const schedulesSig = schedules
      .map((s) => `${s.id}_${s.day_of_week}_${s.start_time}_${s.subject_name}_${s.room}_${s.modality}_${s.set_type}`)
      .join('|');

    const tasksSig = tasks
      .map((t) => `${t.id}_${t.due_date}_${t.completed}_${t.title}_${t.subject_name}`)
      .join('|');

    const schedulesChanged = prevSchedulesSigRef.current !== schedulesSig;
    const tasksChanged = prevTasksSigRef.current !== tasksSig;
    const prefsChanged = prevPrefsRef.current !== prefs;
    const setChanged = prevStudentSetRef.current !== studentSet;

    // Reschedule classes if schedules list or settings (enabled, lead time, student set) changed
    if (
      schedulesChanged ||
      setChanged ||
      (prefsChanged &&
        (prevPrefsRef.current.classReminders !== prefs.classReminders ||
          prevPrefsRef.current.classLeadMinutes !== prefs.classLeadMinutes))
    ) {
      NotificationService.rescheduleAllClasses(
        schedules,
        prefs.classReminders,
        prefs.classLeadMinutes,
        studentSet
      );
      prevSchedulesSigRef.current = schedulesSig;
      prevStudentSetRef.current = studentSet;
    }

    // Reschedule tasks if tasks list or task reminders settings changed
    if (
      tasksChanged ||
      (prefsChanged && prevPrefsRef.current.taskReminders !== prefs.taskReminders)
    ) {
      NotificationService.rescheduleAllTasks(tasks, prefs.taskReminders);
      prevTasksSigRef.current = tasksSig;
    }

    prevPrefsRef.current = prefs;
  }, [schedules, tasks, prefs, studentSet]);

  return (
    <NotificationContext.Provider value={undefined}>
      {children}
      <InAppNotificationBanner />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

