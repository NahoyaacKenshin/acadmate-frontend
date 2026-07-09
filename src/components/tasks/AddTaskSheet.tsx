import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { X, ChevronDown, Calendar } from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { SubjectRow } from '@/src/hooks/useSubjects';

interface AddTaskSheetProps {
  visible: boolean;
  subjects: SubjectRow[];
  onClose: () => void;
}

type DatePickerStep = 'date' | 'time' | null;

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} · ${hour12}:${pad(date.getMinutes())} ${ampm}`;
}

export function AddTaskSheet({ visible, subjects, onClose }: AddTaskSheetProps) {
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [datePickerStep, setDatePickerStep] = useState<DatePickerStep>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setDueDate(null);
    setSelectedSubjectId(null);
    setShowSubjectPicker(false);
    setDatePickerStep(null);
    setError(null);
    onClose();
  };

  // ── Date / Time picker handlers ────────────────────────────────────────────

  const handleOpenDatePicker = () => {
    setShowSubjectPicker(false);
    if (Platform.OS === 'ios') {
      // iOS uses a single datetime spinner inside the sheet
      setDatePickerStep('date');
    } else {
      // Android shows a native dialog; start with date, then chain to time
      setDatePickerStep('date');
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) {
      // User dismissed the picker on Android
      setDatePickerStep(null);
      return;
    }

    if (Platform.OS === 'android') {
      if (datePickerStep === 'date') {
        // Merge chosen date with existing time (or now)
        const base = dueDate ?? new Date();
        const merged = new Date(selected);
        merged.setHours(base.getHours(), base.getMinutes(), 0, 0);
        setDueDate(merged);
        // Chain directly to time picker
        setDatePickerStep('time');
      } else {
        // time step: merge chosen time into existing date
        const base = dueDate ?? new Date();
        const merged = new Date(base);
        merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        setDueDate(merged);
        setDatePickerStep(null);
      }
    } else {
      // iOS: single call, update directly
      setDueDate(selected);
    }
  };

  const handleIOSDone = () => {
    setDatePickerStep(null);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!userId) {
      setError('You must be logged in.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const dueDateISO = dueDate ? dueDate.toISOString() : null;

      await powerSync.execute(
        `INSERT INTO Task (id, title, description, dueDate, completed, subjectId, userId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        [id, title.trim(), description.trim() || null, dueDateISO, selectedSubjectId, userId, now, now]
      );

      handleClose();
    } catch (err: any) {
      console.error('[AddTask] SQLite insert failed:', err);
      setError('Failed to add task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      {/* Backdrop tap-to-dismiss */}
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={styles.sheetContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add New Task</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <X size={24} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Scrollable form — scrolls under the keyboard on Android (pan mode) */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.formContainer}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Task Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="What needs to be done?"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
              onFocus={() => setShowSubjectPicker(false)}
            />
          </View>

          {/* Description */}
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
              onFocus={() => setShowSubjectPicker(false)}
            />
          </View>

          {/* Due Date & Time */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Due Date & Time</Text>
            <Pressable style={styles.picker} onPress={handleOpenDatePicker}>
              <Text style={dueDate ? styles.pickerText : styles.pickerPlaceholder}>
                {dueDate ? formatDateTime(dueDate) : 'Select date & time...'}
              </Text>
              <Calendar size={16} color="#94A3B8" />
            </Pressable>

            {/* iOS inline datetime spinner */}
            {Platform.OS === 'ios' && datePickerStep !== null && (
              <View style={styles.iosPickerWrapper}>
                <DateTimePicker
                  value={dueDate ?? new Date()}
                  mode="datetime"
                  display="spinner"
                  onChange={handleDateChange}
                  textColor="#ffffff"
                  themeVariant="dark"
                  style={styles.iosPicker}
                />
                <Pressable style={styles.iosDoneBtn} onPress={handleIOSDone}>
                  <Text style={styles.iosDoneBtnText}>Done</Text>
                </Pressable>
              </View>
            )}

            {/* Android native dialogs (date then time) */}
            {Platform.OS === 'android' && datePickerStep !== null && (
              <DateTimePicker
                value={dueDate ?? new Date()}
                mode={datePickerStep}
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Subject */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Subject</Text>
            <Pressable
              style={styles.picker}
              onPress={() => setShowSubjectPicker((prev) => !prev)}
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

          <Button style={styles.addButton} onPress={handleAdd} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text>Add Task</Text>}
          </Button>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheetContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A1F2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: '#2A3143',
    maxHeight: '90%',
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
  formContainer: {
    paddingBottom: 8,
  },
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
  // iOS inline picker
  iosPickerWrapper: {
    marginTop: 8,
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 8,
    overflow: 'hidden',
  },
  iosPicker: {
    height: 180,
  },
  iosDoneBtn: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#2A3143',
  },
  iosDoneBtnText: {
    color: '#6C8EFF',
    fontSize: 15,
    fontWeight: '600',
  },
  addButton: {
    marginTop: 8,
    backgroundColor: '#6C8EFF',
  },
});
