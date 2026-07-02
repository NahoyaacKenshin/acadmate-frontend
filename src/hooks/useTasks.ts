import { useQuery } from '@powersync/react';

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: number; // 0 or 1 (SQLite integer)
  subject_id: string | null;
  user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Joined from Subject
  subject_name: string | null;
  subject_color: string | null;
}

/**
 * Reactively queries all tasks joined with their subject data from the local
 * PowerSync SQLite database. Returns live-updating results — no REST API calls
 * needed for reads.
 */
export function useTasks() {
  const { data: tasks, isLoading, error } = useQuery<TaskRow>(`
    SELECT
      Task.id,
      Task.title,
      Task.description,
      Task.dueDate AS due_date,
      Task.completed,
      Task.subjectId AS subject_id,
      Task.userId AS user_id,
      Task.createdAt AS created_at,
      Task.updatedAt AS updated_at,
      Subject.name AS subject_name,
      Subject.color AS subject_color
    FROM Task
    LEFT JOIN Subject ON Task.subjectId = Subject.id
    ORDER BY Task.dueDate ASC
  `);

  return { tasks: tasks ?? [], isLoading, error };
}
