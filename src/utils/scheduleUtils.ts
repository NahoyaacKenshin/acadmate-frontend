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
 * Determines whether a class schedule should appear on a given calendar date.
 *
 * Checks:
 *  1. Day-of-week must match
 *  2. Target date must be >= schedule startDate
 *  3. Target date must be <= schedule endDate (if set)
 *  4. Exam week exclusions and Set A/B alternation
 */
export function isScheduleActiveOnDate(
  schedule: ClassScheduleRow,
  date: Date,
  examWeeks: ExamWeekRow[] = []
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

  // 4. Set A/B alternation
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
        // If the exam week started after the class started and ended before or on the target date
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

