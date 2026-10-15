import { useQuery } from '@powersync/react';

export interface CalendarEventRow {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  all_day: number; // 0 | 1 (SQLite boolean)
  location: string | null;
  color: string | null;
  subject_id: string | null;
  subject_name: string | null;
  subject_color: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Reactively queries all CalendarEvents from the local PowerSync SQLite database.
 * Joins Subject for color-coding and labeling. Zero REST API calls for reads.
 */
export function useCalendarEvents() {
  const { data, isLoading, error } = useQuery<CalendarEventRow>(`
    SELECT
      CalendarEvent.id,
      CalendarEvent.title,
      CalendarEvent.description,
      CalendarEvent.startDate    AS start_date,
      CalendarEvent.endDate      AS end_date,
      CalendarEvent.allDay       AS all_day,
      CalendarEvent.location,
      CalendarEvent.color,
      CalendarEvent.subjectId    AS subject_id,
      CalendarEvent.userId       AS user_id,
      CalendarEvent.createdAt    AS created_at,
      CalendarEvent.updatedAt    AS updated_at,
      Subject.name               AS subject_name,
      Subject.color              AS subject_color
    FROM CalendarEvent
    LEFT JOIN Subject ON CalendarEvent.subjectId = Subject.id
    ORDER BY CalendarEvent.startDate ASC
  `);

  return { events: data ?? [], isLoading, error };
}
