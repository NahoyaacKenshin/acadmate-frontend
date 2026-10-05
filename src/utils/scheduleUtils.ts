import { ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { ExamWeekRow } from '@/src/hooks/useExamWeeks';
import {
  toPhilippineISO,
  toPhilippineDateOnly,
  PHT_OFFSET,
  formatDatePHT,
  formatTime12PHT,
  parseToPHT,
  parseToPHTDate,
  isSameDayPHT,
  isTodayPHT,
  isTodayOrPastPHT,
  formatDateTimePHT,
  formatTimePHT,
} from './philippineTime';

/**
 * Safely parses a date string as LOCAL midnight corresponding to the Philippine Time calendar date.
 * Avoids the UTC-shift bug where 16:00 UTC (midnight PHT) drops back by 1 day when splitting on 'T'.
 *
 * Handles:
 *  - 'YYYY-MM-DD'              (standard stored format)
 *  - 'YYYY-MM-DDTHH:mm:ss.sssZ' (full ISO in UTC or offset)
 *  - 'YYYY-MM-DD HH:mm:ss+00'   (Postgres timestamptz string)
 *  - null / undefined           (returns null — means "no bound")
 */
export function parseDateLocal(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const p = parseToPHT(dateStr);
  if (!p) return null;
  return new Date(p.year, p.month - 1, p.day); // local midnight of Philippine calendar day
}
export {
  toPhilippineISO,
  toPhilippineDateOnly,
  PHT_OFFSET,
  formatDatePHT,
  formatTime12PHT,
  parseToPHT,
  parseToPHTDate,
  isSameDayPHT,
  isTodayPHT,
  isTodayOrPastPHT,
  formatDateTimePHT,
  formatTimePHT,
};


/**
 * Formats a Date object as 'YYYY-MM-DD' in Philippine/LOCAL timezone (avoiding UTC offset shifts).
 */
export function formatDateLocal(d: Date): string {
  return toPhilippineDateOnly(d);
}

/**
 * Converts any date input to a strict ISO-8601 string normalized to Philippine Time (+08:00).
 * Safe for SQLite, Prisma & PostgreSQL without shifting dates across midnight.
 */
export function toIsoDateString(val?: string | null, fallback?: string): string {
  if (!val || val.trim() === '') {
    if (fallback && fallback.trim() !== '') return toIsoDateString(fallback);
    return toPhilippineISO(new Date());
  }
  return toPhilippineISO(val);
}

/**
 * Formats any date input into a clean 'YYYY-MM-DD' string in Philippine Time.
 */
export function toDateOnlyString(val?: string | null): string | null {
  if (!val || val.trim() === '') return null;
  const res = toPhilippineDateOnly(val);
  return res || null;
}


export type PeriodCategory = 'EXAM' | 'HOLIDAY' | 'SUSPENSION';

/**
 * Returns whether a period entry is an EXAM week, user-inputted HOLIDAY, or user-inputted SUSPENSION.
 */
export function getPeriodCategory(item: { title: string }): PeriodCategory {
  if (!item?.title) return 'EXAM';
  const t = item.title.toLowerCase();
  if (item.title.startsWith('🏖️') || t.includes('holiday') || t.includes('[holiday]')) {
    return 'HOLIDAY';
  }
  if (item.title.startsWith('⚠️') || t.includes('suspension') || t.includes('[suspension]')) {
    return 'SUSPENSION';
  }
  return 'EXAM';
}

export const CALENDAR_THEME = {
  CLASS: '#6C8EFF',
  EVENT: '#8B5CF6',
  TASK: '#10B981',
  EXAM: '#F59E0B',
  HOLIDAY_SUSPENSION: '#EF4444',
} as const;

/**
 * Returns the theme color for a period category:
 * Exam = #F59E0B (Amber)
 * Holiday & Suspension = #EF4444 (Crimson Red)
 */
export function getPeriodColor(category: PeriodCategory): string {
  switch (category) {
    case 'EXAM':
      return CALENDAR_THEME.EXAM;
    case 'HOLIDAY':
    case 'SUSPENSION':
      return CALENDAR_THEME.HOLIDAY_SUSPENSION;
  }
}

/**
 * Removes emoji tags (🎓, 🏖️, ⚠️) from period titles for clean display.
 */
export function getCleanPeriodTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/^[🎓🏖️⚠️\u{1F393}?\uFFFD]\s*/u, '')
    .replace(/[🎓\u{1F393}]/gu, '')
    .replace(/^\?\s*/, '')
    .replace(/\s*\?\s*/g, ' ')
    .trim();
}

export interface SimpleHoliday {
  date: string;
  name?: string;
  type?: string;
}

/**
 * Resolves the active days of week for a schedule row.
 * Checks `days_of_week` first (JSON array like "[1, 3]" or comma string "1,3").
 * Falls back to `[schedule.day_of_week]` for legacy single-day entries.
 */
export function getScheduleDays(schedule: { day_of_week?: number | null; days_of_week?: string | null }): number[] {
  if (schedule.days_of_week) {
    try {
      const parsed = JSON.parse(schedule.days_of_week);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(Number);
      }
    } catch {
      const parts = schedule.days_of_week.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n));
      if (parts.length > 0) return parts;
    }
  }
  if (schedule.day_of_week != null) {
    return [schedule.day_of_week];
  }
  return [];
}

/**
 * Determines whether a class schedule should appear on a given calendar date.
 *
 * Checks:
 *  1. Day-of-week must match
 *  2. Target date must be >= schedule startDate
 *  3. Target date must be <= schedule endDate (if set)
 *  4. Exam week exclusions
 *  5. Regular/Special Holidays & Class Suspensions exclusions
 *  6. Set A/B alternation logic
 */
export function isScheduleActiveOnDate(
  schedule: ClassScheduleRow,
  date: Date,
  examWeeks: ExamWeekRow[] = [],
  holidays: SimpleHoliday[] = [],
  studentSet: 'A' | 'B' | 'Standard' | null = null
): boolean {
  // 1. Day-of-week match (supports multi-day schedules)
  const days = getScheduleDays(schedule);
  if (!days.includes(date.getDay())) return false;

  // 2. Schedule Set / Student Set filter
  const st = schedule.set_type ? String(schedule.set_type).trim().toUpperCase() : null;
  const isSetA = st === 'A';
  const isSetB = st === 'B';
  const isEveryWeek = !isSetA && !isSetB;

  if (studentSet === 'Standard' || studentSet === null) {
    // In Standard mode, only classes set to every week are shown
    if (!isEveryWeek) return false;
  } else if (studentSet === 'A') {
    // In Set A mode, show Set A classes and every-week classes
    if (isSetB) return false;
  } else if (studentSet === 'B') {
    // In Set B mode, show Set B classes and every-week classes
    if (isSetA) return false;
  }

  // 3. Date range bounds check
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const rangeStart = parseDateLocal(schedule.start_date);
  
  // If we have a valid start date, don't show before it
  if (rangeStart && target < rangeStart) return false;

  // If we have a valid end date, don't show after it
  const rangeEnd = parseDateLocal(schedule.end_date);
  if (rangeEnd && target > rangeEnd) return false;

  // 4. Period Blocker logic — ALL period types (EXAM, HOLIDAY, SUSPENSION) block classes
  for (const ew of examWeeks) {
    const ewStart = parseDateLocal(ew.startDate);
    const ewEnd = parseDateLocal(ew.endDate);
    if (ewStart && ewEnd) {
      if (target >= ewStart && target <= ewEnd) {
        return false; // Class does not happen during any blocked period
      }
    }
  }

  // 5. Holiday & Suspension Blocker logic
  for (const h of holidays) {
    const hDate = parseDateLocal(h.date);
    if (hDate && hDate.getFullYear() === target.getFullYear() &&
        hDate.getMonth() === target.getMonth() &&
        hDate.getDate() === target.getDate()) {
      return false; // Class blocked by holiday or suspension
    }
  }

  return true;
}

