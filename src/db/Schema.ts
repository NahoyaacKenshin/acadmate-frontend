import { Schema, Table, column } from "@powersync/react-native";

export const Subject = new Table({
  name: column.text,
  color: column.text,
  createdAt: column.text,
  updatedAt: column.text,
  userId: column.text
});

export const Task = new Table({
  title: column.text,
  description: column.text,
  dueDate: column.text,
  completed: column.integer,
  createdAt: column.text,
  updatedAt: column.text,
  userId: column.text,
  subjectId: column.text
});

// ── Week 3: Calendar & Scheduler ─────────────────────────────────────────────

export const ClassSchedule = new Table({
  dayOfWeek: column.integer,
  startTime: column.text,
  endTime: column.text,
  startDate: column.text,
  endDate: column.text,
  room: column.text,
  modality: column.text,   // 'F2F' | 'ONLINE' | 'HYBRID'
  setType: column.text,    // 'A' | 'B' | null
  createdAt: column.text,
  updatedAt: column.text,
  userId: column.text,
  subjectId: column.text
});

export const CalendarEvent = new Table({
  title: column.text,
  description: column.text,
  startDate: column.text,
  endDate: column.text,
  allDay: column.integer,  // 0 or 1
  location: column.text,
  color: column.text,
  createdAt: column.text,
  updatedAt: column.text,
  userId: column.text,
  subjectId: column.text
});

export const ExamWeek = new Table({
  title: column.text,
  startDate: column.text,
  endDate: column.text,
  createdAt: column.text,
  updatedAt: column.text,
  userId: column.text
});

// ── Week 4 Additional: Admin & Set A/B Global Config ───────────────────────

export const SemesterRule = new Table({
  startDate: column.text,
  endDate: column.text,
  dayOfWeek: column.integer,
  setType: column.text,
  label: column.text,
  createdAt: column.text,
  updatedAt: column.text,
  userId: column.text
});

export const PhilippineHoliday = new Table({
  date: column.text,
  name: column.text,
  type: column.text
});

export const AppSchema = new Schema({
  Subject,
  Task,
  ClassSchedule,
  CalendarEvent,
  ExamWeek,
  SemesterRule,
  PhilippineHoliday
});

export type Database = (typeof AppSchema)['types'];


