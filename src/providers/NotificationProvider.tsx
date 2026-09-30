import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useClassSchedules } from '../hooks/useClassSchedules';
import { useTasks } from '../hooks/useTasks';
import { useExamWeeks } from '../hooks/useExamWeeks';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { NotificationService } from '../services/notificationService';
import { useNotificationStore } from '../store/notificationStore';
import { useUserStore, computeCurrentSet } from '../store/userStore';
import { useNotificationDeepLink } from '../hooks/useNotificationDeepLink';
import { InAppNotificationBanner } from '../components/common/InAppNotificationBanner';

const NotificationContext = createContext<void | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { schedules } = useClassSchedules();
  const { tasks } = useTasks();
  const { examWeeks = [] } = useExamWeeks();
  const { events = [] } = useCalendarEvents();
  const { prefs } = useNotificationStore();
  const { studentSet, anchorMonday, anchorSet } = useUserStore();
  const currentSet = computeCurrentSet(studentSet, anchorMonday, anchorSet, new Date());

  const prevSchedulesSigRef = useRef<string>('');
  const prevTasksSigRef = useRef<string>('');
  const prevExamsSigRef = useRef<string>('');
  const prevEventsSigRef = useRef<string>('');
  const prevPrefsRef = useRef(prefs);
  const prevStudentSetRef = useRef(currentSet);

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
      .map((s) => `${s.id}_${s.days_of_week ?? s.day_of_week}_${s.start_time}_${s.subject_name}_${s.room}_${s.modality}_${s.set_type}`)
      .join('|');

    const tasksSig = tasks
      .map((t) => `${t.id}_${t.due_date}_${t.completed}_${t.title}_${t.subject_name}`)
      .join('|');

    const examsSig = `${examWeeks.map((ew) => `${ew.id}_${ew.startDate}_${ew.endDate}_${ew.title}`).join('|')}#${events.filter((e) => e.color === '#8B5CF6' || e.title.toLowerCase().includes('exam') || (e.description && e.description.toLowerCase().includes('exam'))).map((e) => `${e.id}_${e.start_date}_${e.title}`).join('|')}`;

    // General events signature (non-exam events only)
    const generalEventsSig = events
      .filter((e) => e.color !== '#8B5CF6' && !e.title.toLowerCase().includes('exam') && !e.title.toLowerCase().includes('quiz') && !(e.description && e.description.toLowerCase().includes('exam')))
      .map((e) => `${e.id}_${e.start_date}_${e.title}_${e.all_day}_${e.location}`)
      .join('|');

    const schedulesChanged = prevSchedulesSigRef.current !== schedulesSig;
    const tasksChanged = prevTasksSigRef.current !== tasksSig;
    const examsChanged = prevExamsSigRef.current !== examsSig;
    const eventsChanged = prevEventsSigRef.current !== generalEventsSig;
    const prefsChanged = prevPrefsRef.current !== prefs;
    const setChanged = prevStudentSetRef.current !== currentSet;

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
        currentSet
      );
      prevSchedulesSigRef.current = schedulesSig;
      prevStudentSetRef.current = currentSet;
    }

    // Reschedule tasks if tasks list or task reminders settings changed
    if (
      tasksChanged ||
      (prefsChanged && prevPrefsRef.current.taskReminders !== prefs.taskReminders)
    ) {
      NotificationService.rescheduleAllTasks(tasks, prefs.taskReminders);
      prevTasksSigRef.current = tasksSig;
    }

    // Reschedule exams if exam weeks, exam events, or examAlerts prefs changed
    if (
      examsChanged ||
      (prefsChanged && prevPrefsRef.current.examAlerts !== prefs.examAlerts)
    ) {
      NotificationService.rescheduleAllExams(examWeeks, events, prefs.examAlerts);
      prevExamsSigRef.current = examsSig;
    }

    // Reschedule general calendar event reminders if events or eventReminders prefs changed
    if (
      eventsChanged ||
      (prefsChanged &&
        (prevPrefsRef.current.eventReminders !== prefs.eventReminders ||
          prevPrefsRef.current.eventLeadMinutes !== prefs.eventLeadMinutes))
    ) {
      NotificationService.rescheduleAllCalendarEvents(events, prefs.eventReminders, prefs.eventLeadMinutes);
      prevEventsSigRef.current = generalEventsSig;
    }

    prevPrefsRef.current = prefs;
  }, [schedules, tasks, examWeeks, events, prefs, currentSet]);

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

