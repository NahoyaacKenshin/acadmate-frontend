import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { X, ChevronDown } from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { SubjectRow } from '@/src/hooks/useSubjects';
import { TaskRow } from '@/src/hooks/useTasks';

interface EditTaskSheetProps {
  visible: boolean;
  task: TaskRow | null;
  subjects: SubjectRow[];
  onClose: () => void;
}

export function EditTaskSheet({ visible, task, subjects, onClose }: EditTaskSheetProps) {
  const powerSync = usePowerSync();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setDueDate(task.due_date ?? '');
      setSelectedSubjectId(task.subject_id);
      setError(null);
    }
  }, [task]);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const handleClose = () => {
    setShowSubjectPicker(false);
    setError(null);
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!task) return;

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date().toISOString();

      // Write directly to local SQLite — PowerSync syncs upstream automatically
      await powerSync.execute(
        `UPDATE Task SET title = ?, description = ?, dueDate = ?, subjectId = ?, updatedAt = ?
         WHERE id = ?`,
        [title.trim(), description.trim() || null, dueDate.trim() || null, selectedSubjectId, now, task.id]
      );

      handleClose();
    } catch (err: any) {
      console.error('[EditTask] SQLite update failed:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheetContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Task</Text>
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <X size={24} color="#94A3B8" />
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Task Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="What needs to be done?"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Optional details..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Due Date</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2026-07-10"
              placeholderTextColor="#94A3B8"
              value={dueDate}
              onChangeText={setDueDate}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Subject</Text>
            <Pressable
              style={styles.picker}
              onPress={() => setShowSubjectPicker(!showSubjectPicker)}
            >
              <Text style={selectedSubject ? styles.pickerText : styles.pickerPlaceholder}>
                {selectedSubject ? selectedSubject.name : 'Select a subject...'}
              </Text>
              <ChevronDown size={16} color="#94A3B8" />
            </Pressable>
            {showSubjectPicker && (
              <View style={styles.pickerList}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 160 }}>
                  <Pressable
                    style={styles.pickerItem}
                    onPress={() => { setSelectedSubjectId(null); setShowSubjectPicker(false); }}
                  >
                    <Text style={styles.pickerItemText}>None</Text>
                  </Pressable>
                  {subjects.map((s) => (
                    <Pressable
                      key={s.id}
                      style={styles.pickerItem}
                      onPress={() => { setSelectedSubjectId(s.id); setShowSubjectPicker(false); }}
                    >
                      <View style={[styles.subjectDot, { backgroundColor: s.color ?? '#6C8EFF' }]} />
                      <Text style={styles.pickerItemText}>{s.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <Button style={styles.saveButton} onPress={handleSave} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text>Save Changes</Text>}
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
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: { padding: 4 },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
  },
  formGroup: { marginBottom: 16 },
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
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  picker: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: { color: '#ffffff', fontSize: 16 },
  pickerPlaceholder: { color: '#94A3B8', fontSize: 16 },
  pickerList: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3143',
  },
  pickerItemText: { color: '#ffffff', fontSize: 15, marginLeft: 8 },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#6C8EFF',
  },
});
