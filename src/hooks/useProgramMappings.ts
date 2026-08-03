import { useQuery } from '@powersync/react';

export interface ProgramMappingRow {
  id: string;
  program_name: string;
  student_set: 'A' | 'B';
  created_at?: string;
  updated_at?: string;
}

export function useProgramMappings() {
  const { data, isLoading, error } = useQuery<ProgramMappingRow>(`
    SELECT
      id,
      programName AS program_name,
      studentSet AS student_set,
      createdAt AS created_at,
      updatedAt AS updated_at
    FROM ProgramMapping
    ORDER BY programName ASC
  `);

  return { programMappings: data ?? [], isLoading, error };
}
