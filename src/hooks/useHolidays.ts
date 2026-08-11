import { useQuery } from '@powersync/react';

export interface HolidayRow {
  id: string;
  date: string;
  name: string;
  type: 'REGULAR' | 'SPECIAL' | 'SUSPENSION';
}

export function useHolidays() {
  const { data, isLoading, error } = useQuery<HolidayRow>(`
    SELECT
      id,
      date,
      name,
      type
    FROM PhilippineHoliday
    ORDER BY date ASC
  `);

  return { holidays: data ?? [], isLoading, error };
}
