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
});
