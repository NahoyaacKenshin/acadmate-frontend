import { TaskRow } from '@/src/hooks/useTasks';
import {
  isOverduePHT,
  isTodayPHT,
  isTomorrowPHT,
  parseToEpoch,
  getPhilippineToday,
  parseToPHT,
} from './philippineTime';

export interface TaskSection {
  key: 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later' | 'completed';
  title: string;
  badgeColor: string;
  iconName?: string;
  data: TaskRow[];
  collapsible?: boolean;
  totalCount?: number;
}

/**
 * Returns true if an ISO timestamp is within the remaining days of the current week (PHT).
 * Week boundary ends Sunday at 23:59:59 PHT.
 */
export function isThisWeekPHT(isoStr: string | null | undefined): boolean {
  if (!isoStr) return false;
  const epoch = parseToEpoch(isoStr);
  if (epoch === null) return false;

  const todayStr = getPhilippineToday(); // "YYYY-MM-DD"
  const [y, m, d] = todayStr.split('-').map(Number);
  const nowPht = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = nowPht.getUTCDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

  // Days until Sunday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const endOfWeek = new Date(Date.UTC(y, m - 1, d + daysUntilSunday, 23, 59, 59, 999));

  return epoch <= endOfWeek.getTime() && epoch >= nowPht.getTime();
}

/**
 * Groups a list of tasks into timeline sections based on Philippine Time.
 */
export function groupTasksByTimeline(tasks: TaskRow[]): TaskSection[] {
  const overdue: TaskRow[] = [];
  const today: TaskRow[] = [];
  const tomorrow: TaskRow[] = [];
  const thisWeek: TaskRow[] = [];
  const later: TaskRow[] = [];
  const completed: TaskRow[] = [];

  for (const task of tasks) {
    if (task.completed === 1) {
      completed.push(task);
      continue;
    }

    if (!task.due_date) {
      later.push(task);
      continue;
    }

    if (isOverduePHT(task.due_date)) {
      overdue.push(task);
    } else if (isTodayPHT(task.due_date)) {
      today.push(task);
    } else if (isTomorrowPHT(task.due_date)) {
      tomorrow.push(task);
    } else if (isThisWeekPHT(task.due_date)) {
      thisWeek.push(task);
    } else {
      later.push(task);
    }
  }

  // Sort function: earlier due dates first
  const sortByDueDate = (a: TaskRow, b: TaskRow) => {
    const aEpoch = parseToEpoch(a.due_date) ?? Number.MAX_SAFE_INTEGER;
    const bEpoch = parseToEpoch(b.due_date) ?? Number.MAX_SAFE_INTEGER;
    return aEpoch - bEpoch;
  };

  overdue.sort(sortByDueDate);
  today.sort(sortByDueDate);
  tomorrow.sort(sortByDueDate);
  thisWeek.sort(sortByDueDate);
  later.sort(sortByDueDate);

  // Completed sorted latest updated/created first
  completed.sort((a, b) => {
    const aEpoch = parseToEpoch(a.updated_at || a.created_at) ?? 0;
    const bEpoch = parseToEpoch(b.updated_at || b.created_at) ?? 0;
    return bEpoch - aEpoch;
  });

  const sections: TaskSection[] = [
    {
      key: 'overdue',
      title: 'Overdue',
      badgeColor: '#EF4444',
      data: overdue,
    },
    {
      key: 'today',
      title: 'Due Today',
      badgeColor: '#F59E0B',
      data: today,
    },
    {
      key: 'tomorrow',
      title: 'Due Tomorrow',
      badgeColor: '#3B82F6',
      data: tomorrow,
    },
    {
      key: 'thisWeek',
      title: 'Later This Week',
      badgeColor: '#8B5CF6',
      data: thisWeek,
    },
    {
      key: 'later',
      title: 'Upcoming & No Date',
      badgeColor: '#64748B',
      data: later,
    },
    {
      key: 'completed',
      title: 'Completed',
      badgeColor: '#10B981',
      data: completed,
      collapsible: true,
    },
  ];

  return sections;
}
