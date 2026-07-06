import { useQuery } from '@powersync/react';

export interface ClassScheduleRow {
  id: string;
  day_of_week: number;        // 0=Sun, 1=Mon, ... 6=Sat
  start_time: string;         // "HH:MM" 24-hour
  end_time: string;           // "HH:MM" 24-hour
  room: string | null;
  modality: 'F2F' | 'ONLINE' | 'HYBRID';
  set_type: 'A' | 'B' | 'BOTH' | null;
  subject_id: string | null;
  subject_name: string | null;
  subject_color: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Reactively queries all ClassSchedules from the local PowerSync SQLite database.
 * Joins Subject for color-coding and labeling. Zero REST API calls for reads.
 */
export function useClassSchedules() {
  const { data, isLoading, error } = useQuery<ClassScheduleRow>(`
    SELECT
      ClassSchedule.id,
      ClassSchedule.dayOfWeek   AS day_of_week,
      ClassSchedule.startTime   AS start_time,
      ClassSchedule.endTime     AS end_time,
      ClassSchedule.room,
      ClassSchedule.modality,
      ClassSchedule.setType     AS set_type,
      ClassSchedule.subjectId   AS subject_id,
      ClassSchedule.userId      AS user_id,
      ClassSchedule.createdAt   AS created_at,
      ClassSchedule.updatedAt   AS updated_at,
      Subject.name              AS subject_name,
      Subject.color             AS subject_color
    FROM ClassSchedule
    LEFT JOIN Subject ON ClassSchedule.subjectId = Subject.id
    ORDER BY ClassSchedule.dayOfWeek ASC, ClassSchedule.startTime ASC
  `);

  return { schedules: data ?? [], isLoading, error };
}
