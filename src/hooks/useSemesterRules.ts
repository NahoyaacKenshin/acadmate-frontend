import { useQuery } from '@powersync/react';

export interface SemesterRuleRow {
  id: string;
  startDate: string;
  endDate: string | null;
  dayOfWeek: number;
  setType: 'A' | 'B';
  label: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function useSemesterRules() {
  const { data, isLoading, error } = useQuery<SemesterRuleRow>(`
    SELECT
      id,
      startDate,
      endDate,
      dayOfWeek,
      setType,
      label,
      createdAt,
      updatedAt
    FROM SemesterRule
    ORDER BY startDate ASC
  `);

  return { semesterRules: data ?? [], isLoading, error };
}
