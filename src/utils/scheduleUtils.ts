import { ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { ExamWeekRow } from '@/src/hooks/useExamWeeks';

/**
 * Safely parses a date string as LOCAL midnight to avoid UTC timezone shifts.
 *
 * Handles:
 *  - 'YYYY-MM-DD'              (standard stored format)
 *  - 'YYYY-MM-DDTHH:mm:ss.sssZ' (full ISO, strips the time part)
 *  - null / undefined           (returns null — means "no bound")
 */
export function parseDateLocal(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const datePart = dateStr.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return new Date(year, month - 1, day); // local midnight
}

/**
 * Formats a Date object as 'YYYY-MM-DD' in LOCAL timezone (avoiding UTC offset shifts).
 */
export function formatDateLocal(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Ensures any date input (YYYY-M-D, YYYY-MM-DD, or ISO strings) is converted to a
 * strict 2-digit padded ISO-8601 string (e.g. "2026-08-11T00:00:00.000Z") safe for Prisma & Postgres.
 */
export function toIsoDateString(val?: string | null, fallback?: string): string {
  if (!val || val.trim() === '') {
    if (fallback && fallback.trim() !== '') return toIsoDateString(fallback);
    return new Date().toISOString();
  }

  const trimmed = val.trim();
  // Match YYYY-M-D or YYYY-MM-DD
  const ymdMatch = trimmed.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d+))?)?(?:Z|([+-]\d{2}:?\d{2}))?)?/
  );
  if (ymdMatch) {
    const [, y, m, d, hh = '00', mm = '00', ss = '00', ms = '000'] = ymdMatch;
    const padMonth = m.padStart(2, '0');
    const padDay = d.padStart(2, '0');
    const padHour = hh.padStart(2, '0');
    const padMin = mm.padStart(2, '0');
    const padSec = ss.padStart(2, '0');
    const padMs = ms.slice(0, 3).padEnd(3, '0');
    return `${y}-${padMonth}-${padDay}T${padHour}:${padMin}:${padSec}.${padMs}Z`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  if (fallback && fallback.trim() !== '') return toIsoDateString(fallback);
  return new Date().toISOString();
}

/**
 * Formats any date input into a clean 'YYYY-MM-DD' 2-digit string.
 */
export function toDateOnlyString(val?: string | null): string | null {
  if (!val || val.trim() === '') return null;
  const trimmed = val.trim();
  const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return formatDateLocal(d);
  }
  return null;
}


export interface SimpleHoliday {
  date: string;
  name?: string;
  type?: string;
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
  holidays: SimpleHoliday[] = []
): boolean {
  // 1. Day-of-week match
  if (schedule.day_of_week !== date.getDay()) return false;

  // 2. Date range bounds check
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const rangeStart = parseDateLocal(schedule.start_date);
  
  // If we have a valid start date, don't show before it
  if (rangeStart && target < rangeStart) return false;

  // If we have a valid end date, don't show after it
  const rangeEnd = parseDateLocal(schedule.end_date);
  if (rangeEnd && target > rangeEnd) return false;

  // 3. Exam Week logic
  // Check if target date falls inside any exam week
  for (const ew of examWeeks) {
    const ewStart = parseDateLocal(ew.startDate);
    const ewEnd = parseDateLocal(ew.endDate);
    if (ewStart && ewEnd) {
      if (target >= ewStart && target <= ewEnd) {
        return false; // Class does not happen during exam weeks
      }
    }
  }

  // 4. Holiday & Suspension Blocker logic
  for (const h of holidays) {
    const hDate = parseDateLocal(h.date);
    if (hDate && hDate.getFullYear() === target.getFullYear() &&
        hDate.getMonth() === target.getMonth() &&
        hDate.getDate() === target.getDate()) {
      return false; // Class blocked by holiday or suspension
    }
  }

  // 5. Set A/B alternation
  if ((schedule.set_type === 'A' || schedule.set_type === 'B') && rangeStart) {
    const diffMs = target.getTime() - rangeStart.getTime();
    let diffWeeks = Math.floor(Math.round(diffMs / 86400000) / 7);
    
    // Subtract any exam weeks that occurred between rangeStart and target
    // so that Set A/B alternating pattern resumes correctly.
    let pastExamWeeksCount = 0;
    for (const ew of examWeeks) {
      const ewStart = parseDateLocal(ew.startDate);
      const ewEnd = parseDateLocal(ew.endDate);
      if (ewStart && ewEnd) {
        if (ewStart >= rangeStart && ewStart <= target) {
          pastExamWeeksCount++;
        }
      }
    }
    
    diffWeeks -= pastExamWeeksCount;
    
    if (schedule.set_type === 'A') {
      // Set A: Only show on week 0, week 2, week 4, etc. (Even weeks)
      if (diffWeeks % 2 !== 0) return false;
    } else if (schedule.set_type === 'B') {
      // Set B: Only show on week 1, week 3, week 5, etc. (Odd weeks)
      if (diffWeeks % 2 === 0) return false;
    }
  }

  return true;
}

