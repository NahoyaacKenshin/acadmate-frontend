import { usePowerSync, useQuery } from '@powersync/react';

export interface ExamWeekRow {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD format from DB or date object if parsed
  endDate: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export function useExamWeeks() {
  const { data: examWeeks, isLoading } = useQuery<ExamWeekRow>(
    `SELECT * FROM ExamWeek ORDER BY startDate ASC`
  );

  return { examWeeks, isLoading };
}
