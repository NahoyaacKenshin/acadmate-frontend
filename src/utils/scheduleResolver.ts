import { ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { ExamWeekRow } from '@/src/hooks/useExamWeeks';
import { SemesterRuleRow } from '@/src/hooks/useSemesterRules';
import { HolidayRow } from '@/src/hooks/useHolidays';
import { parseDateLocal, getScheduleDays, getPeriodCategory, getCleanPeriodTitle, getPeriodColor } from './scheduleUtils';

export interface ScheduleResolution {
  isActive: boolean;
  isHoliday: boolean;
  isExamWeek: boolean;
  modality: 'F2F' | 'ONLINE' | 'HYBRID' | 'HOLIDAY' | 'EXAM_WEEK';
  effectiveRoom: string | null;
  reason: string;
  badgeText: string;
  badgeColor: string;
}

/**
 * Dynamically resolves a student's personal ClassSchedule against:
 *  1. Global SemesterRules (Saturday Set A/B rules)
 *  2. Philippine Holidays
 *  3. Global Exam Weeks / Periods
 *  4. Student's assigned StudentSet ('A' | 'B')
 */
export function resolveScheduleForDate(
  schedule: ClassScheduleRow,
  date: Date,
  studentSet: 'A' | 'B' | 'Standard' | null = null,
  semesterRules: SemesterRuleRow[] = [],
  holidays: HolidayRow[] = [],
  examWeeks: ExamWeekRow[] = []
): ScheduleResolution {
  // Treat 'Standard' the same as null — no alternating set logic
  const effectiveSet: 'A' | 'B' | null = studentSet === 'Standard' ? null : studentSet;
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  // 1. Day of week match check (supports multi-day schedules)
  const days = getScheduleDays(schedule);
  if (!days.includes(target.getDay())) {
    return {
      isActive: false,
      isHoliday: false,
      isExamWeek: false,
      modality: schedule.modality,
      effectiveRoom: null,
      reason: 'Day does not match',
      badgeText: schedule.modality,
      badgeColor: '#6B7280',
    };
  }

  // 2. Schedule Set / Student Set filter
  const st = schedule.set_type ? String(schedule.set_type).trim().toUpperCase() : null;
  const isSetA = st === 'A';
  const isSetB = st === 'B';
  const isEveryWeek = !isSetA && !isSetB;

  if (studentSet === 'Standard' || studentSet === null) {
    if (!isEveryWeek) {
      return {
        isActive: false,
        isHoliday: false,
        isExamWeek: false,
        modality: schedule.modality,
        effectiveRoom: null,
        reason: 'Set A/B class hidden in Standard mode',
        badgeText: schedule.modality,
        badgeColor: '#6B7280',
      };
    }
  } else if (studentSet === 'A') {
    if (isSetB) {
      return {
        isActive: false,
        isHoliday: false,
        isExamWeek: false,
        modality: schedule.modality,
        effectiveRoom: null,
        reason: 'Set B class hidden in Set A',
        badgeText: schedule.modality,
        badgeColor: '#6B7280',
      };
    }
  } else if (studentSet === 'B') {
    if (isSetA) {
      return {
        isActive: false,
        isHoliday: false,
        isExamWeek: false,
        modality: schedule.modality,
        effectiveRoom: null,
        reason: 'Set A class hidden in Set B',
        badgeText: schedule.modality,
        badgeColor: '#6B7280',
      };
    }
  }

  // 3. Date bounds check
  const rangeStart = parseDateLocal(schedule.start_date);
  if (rangeStart && target < rangeStart) {
    return {
      isActive: false,
      isHoliday: false,
      isExamWeek: false,
      modality: schedule.modality,
      effectiveRoom: null,
      reason: 'Before schedule start date',
      badgeText: schedule.modality,
      badgeColor: '#6B7280',
    };
  }

  const rangeEnd = parseDateLocal(schedule.end_date);
  if (rangeEnd && target > rangeEnd) {
    return {
      isActive: false,
      isHoliday: false,
      isExamWeek: false,
      modality: schedule.modality,
      effectiveRoom: null,
      reason: 'After schedule end date',
      badgeText: schedule.modality,
      badgeColor: '#6B7280',
    };
  }

  // 4. Philippine Holiday Check
  const targetIsoDate = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  const holiday = holidays.find((h) => {
    const hDate = parseDateLocal(h.date);
    if (!hDate) return false;
    return (
      hDate.getFullYear() === target.getFullYear() &&
      hDate.getMonth() === target.getMonth() &&
      hDate.getDate() === target.getDate()
    );
  });

  if (holiday) {
    const isSuspension = holiday.type === 'SUSPENSION' || holiday.name.toLowerCase().includes('suspension');
    const isRegular = holiday.type === 'REGULAR';
    return {
      isActive: false,
      isHoliday: true,
      isExamWeek: false,
      modality: 'HOLIDAY',
      effectiveRoom: null,
      reason: isSuspension ? `Suspension: ${holiday.name}` : `Holiday: ${holiday.name}`,
      badgeText: isSuspension ? 'SUSPENSION' : isRegular ? 'REGULAR HOLIDAY' : 'SPECIAL HOLIDAY',
      badgeColor: isSuspension ? '#EF4444' : '#10B981',
    };
  }

  // 5. Period Check (User-inputted periods: Exam Week, Holiday, Suspension)
  for (const ew of examWeeks) {
    const ewStart = parseDateLocal(ew.startDate);
    const ewEnd = parseDateLocal(ew.endDate);
    if (ewStart && ewEnd && target >= ewStart && target <= ewEnd) {
      const cat = getPeriodCategory(ew);
      const cleanTitle = getCleanPeriodTitle(ew.title);
      const color = getPeriodColor(cat);
      if (cat === 'HOLIDAY') {
        return {
          isActive: false,
          isHoliday: true,
          isExamWeek: false,
          modality: 'HOLIDAY',
          effectiveRoom: null,
          reason: `Holiday: ${cleanTitle}`,
          badgeText: 'HOLIDAY',
          badgeColor: color,
        };
      } else if (cat === 'SUSPENSION') {
        return {
          isActive: false,
          isHoliday: true,
          isExamWeek: false,
          modality: 'HOLIDAY',
          effectiveRoom: null,
          reason: `Suspension: ${cleanTitle}`,
          badgeText: 'SUSPENSION',
          badgeColor: color,
        };
      } else {
        return {
          isActive: false,
          isHoliday: false,
          isExamWeek: true,
          modality: 'EXAM_WEEK',
          effectiveRoom: null,
          reason: `Exam Period: ${cleanTitle}`,
          badgeText: 'EXAM WEEK',
          badgeColor: color,
        };
      }
    }
  }

  // Determine effective set (user set or schedule set fallback)
  // effectiveSet is already resolved above ('Standard' → null); fall back to the schedule's own set_type
  const resolvedSet: 'A' | 'B' = effectiveSet || (schedule.set_type === 'A' || schedule.set_type === 'B' ? schedule.set_type : 'A');

  // 6. Special Day / Semester Rules (SemesterRule)
  if (semesterRules.length > 0) {
    const matchedRule = semesterRules.find((r) => {
      if (r.dayOfWeek !== target.getDay()) return false;
      const rStart = parseDateLocal(r.startDate);
      if (!rStart) return false;
      if (target < rStart) return false;
      if (r.endDate) {
        const rEnd = parseDateLocal(r.endDate);
        if (rEnd && target > rEnd) return false;
      }
      return true;
    });

    if (matchedRule) {
      const isF2F = resolvedSet === matchedRule.setType;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[matchedRule.dayOfWeek];
      const otherSet = matchedRule.setType === 'A' ? 'B' : 'A';
      return {
        isActive: true,
        isHoliday: false,
        isExamWeek: false,
        modality: isF2F ? 'F2F' : 'ONLINE',
        effectiveRoom: isF2F ? schedule.room : 'Online Class',
        reason: matchedRule.label || (isF2F ? `${dayName} F2F (Set ${matchedRule.setType})` : `${dayName} Online (Set ${otherSet})`),
        badgeText: isF2F ? `F2F (Set ${matchedRule.setType})` : `ONLINE (Set ${otherSet})`,
        badgeColor: isF2F ? '#10B981' : '#3B82F6',
      };
    }
  }

  // 7. Regular Default Modality
  return {
    isActive: true,
    isHoliday: false,
    isExamWeek: false,
    modality: schedule.modality,
    effectiveRoom: schedule.modality === 'ONLINE' ? 'Online Class' : schedule.room,
    reason: 'Regular Class',
    badgeText: schedule.modality,
    badgeColor: schedule.modality === 'F2F' ? '#10B981' : schedule.modality === 'ONLINE' ? '#3B82F6' : '#8B5CF6',
  };
}
