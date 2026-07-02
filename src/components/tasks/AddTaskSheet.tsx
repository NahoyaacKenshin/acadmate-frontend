import React, { useState } from 'react';
import { View, StyleSheet, Modal, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { X } from 'lucide-react-native';
import { Task } from './TaskListItem';

interface AddTaskSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (task: Task) => void;
}

export function AddTaskSheet({ visible, onClose, onAdd }: AddTaskSheetProps) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('General');
  const [dueDate, setDueDate] = useState('Today');

  const handleAdd = () => {
    if (!title.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      subject,
      subjectColor: '#6C8EFF', // Default or pick based on subject
      dueDate,
      completed: false,
    };
    onAdd(newTask);
    setTitle('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheetContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add New Task</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#94A3B8" />
            </Pressable>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Task Title</Text>
            <TextInput
              style={styles.input}
              placeholder="What needs to be done?"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Math, Physics"
              placeholderTextColor="#94A3B8"
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Due Date</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Tomorrow, 2026-07-05"
              placeholderTextColor="#94A3B8"
              value={dueDate}
              onChangeText={setDueDate}
            />
          </View>

          <Button style={styles.addButton} onPress={handleAdd}>
            <Text>Add Task</Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheetContent: {
    backgroundColor: '#1A1F2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: '#2A3143',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  addButton: {
    marginTop: 16,
    backgroundColor: '#6C8EFF',
  },
});
