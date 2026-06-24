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

export const AppSchema = new Schema({
  Subject,
  Task
});

export type Database = (typeof AppSchema)['types'];
