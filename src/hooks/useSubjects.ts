import { useQuery } from '@powersync/react';

export interface SubjectRow {
  id: string;
  name: string;
  color: string | null;
  user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Reactively queries all subjects from the local PowerSync SQLite database.
 * Returns live-updating results — no REST API calls needed for reads.
 */
export function useSubjects() {
  const { data: subjects, isLoading, error } = useQuery<SubjectRow>(`
    SELECT
      Subject.id,
      Subject.name,
      Subject.color,
      Subject.userId AS user_id,
      Subject.createdAt AS created_at,
      Subject.updatedAt AS updated_at
    FROM Subject
    ORDER BY Subject.name ASC
  `);

  return { subjects: subjects ?? [], isLoading, error };
}
