import { Schema, Table, column } from "@powersync/react-native";

export const AppSchema = new Schema({
  users: new Table({
    name: column.text,
    email: column.text,
    role: column.text,
    created_at: column.text,
  }),
  documents: new Table({
    title: column.text,
    content: column.text,
    user_id: column.text,
    updated_at: column.text,
  }),
  subjects: new Table({
    name: column.text,
    color: column.text,
    user_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  }),
  tasks: new Table({
    title: column.text,
    description: column.text,
    due_date: column.text,
    is_completed: column.integer, // PowerSync stores booleans as 0/1 integers often, but sqlite can handle it.
    subject_id: column.text,
    user_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  })
});
