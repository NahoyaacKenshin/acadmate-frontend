import { ClassScheduleRow } from '@/src/hooks/useClassSchedules';

/**
 * Safely parses a date string as LOCAL midnight to avoid UTC timezone shifts.
 *
 * Handles:
 *  - 'YYYY-MM-DD'              (standard stored format)
 *  - 'YYYY-MM-DDTHH:mm:ss.sssZ' (full ISO, strips the time part)
 *  - null / undefined           (returns null — means "no bound")
 */
function parseDateLocal(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const datePart = dateStr.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return new Date(year, month - 1, day); // local midnight
}

/**
 * Determines whether a class schedule should appear on a given calendar date.
 *
 * Checks:
 *  1. Day-of-week must match
 *  2. Target date must be >= schedule startDate
 *  3. Target date must be <= schedule endDate (if set)
 */
export function isScheduleActiveOnDate(
  schedule: ClassScheduleRow,
  date: Date,
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

  return true;
}
