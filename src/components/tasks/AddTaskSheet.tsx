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
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { X, ChevronDown, Calendar, CheckSquare, AlertCircle } from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { SubjectRow } from '@/src/hooks/useSubjects';
import { toPhilippineISO } from '@/src/utils/philippineTime';
import { NotificationService } from '@/src/services/notificationService';

interface AddTaskSheetProps {
  visible: boolean;
  subjects: SubjectRow[];
  onClose: () => void;
}

type DatePickerStep = 'date' | 'time' | null;

const PRESET_COLORS = [
  '#6C8EFF', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#14B8A6', // teal
  '#6366F1', // indigo
  '#F97316', // orange
];

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
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);
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
    setSelectedColor(PRESET_COLORS[0]);
    setSelectedSubjectId(null);
    setShowSubjectPicker(false);
    setDatePickerStep(null);
    setError(null);
    onClose();
  };

  // ── Date / Time picker handlers ────────────────────────────────────────────

  const handleOpenDatePicker = () => {
    setShowSubjectPicker(false);
    if (Platform.OS === 'android') {
      const base = dueDate ?? new Date();
      DateTimePickerAndroid.open({
        value: base,
        mode: 'date',
        minimumDate: new Date(),
        is24Hour: false,
        onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type === 'dismissed' || !selectedDate) return;
          const merged = new Date(selectedDate);
          merged.setHours(base.getHours(), base.getMinutes(), 0, 0);
          // Chain to time picker on Android
          DateTimePickerAndroid.open({
            value: merged,
            mode: 'time',
            is24Hour: false,
            onChange: (timeEvent: DateTimePickerEvent, selectedTime?: Date) => {
              if (timeEvent.type === 'dismissed' || !selectedTime) {
                setDueDate(merged);
                return;
              }
              const finalDate = new Date(merged);
              finalDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
              setDueDate(finalDate);
            },
          });
        },
      });
    } else {
      // iOS uses a single datetime spinner inside the sheet
      setDatePickerStep('date');
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) {
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
      const now = toPhilippineISO(new Date());
      const dueDateISO = dueDate ? toPhilippineISO(dueDate) : null;

      await powerSync.execute(
        `INSERT INTO Task (id, title, description, dueDate, completed, color, subjectId, userId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
        [id, title.trim(), description.trim() || null, dueDateISO, selectedColor, selectedSubjectId, userId, now, now]
      );

      if (dueDateISO) {
        NotificationService.scheduleTaskReminders({
          id,
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDateISO,
          completed: 0,
          color: selectedColor,
          subject_id: selectedSubjectId,
          user_id: userId,
          created_at: now,
          updated_at: now,
          subject_name: selectedSubject?.name ?? null,
          subject_color: selectedSubject?.color ?? null,
        }).catch((e) => console.warn('[AddTask] scheduleTaskReminders error:', e));
      }

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

      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoid}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerBadge}>
                <CheckSquare size={16} color="#10B981" />
              </View>
              <Text style={styles.headerTitle}>Add New Task</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color="#94A3B8" />
            </Pressable>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <AlertCircle size={15} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContainer}
          >

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
              <View style={styles.labelRow}>
                <Text style={styles.label}>Due Date & Time (Optional)</Text>
                {dueDate && (
                  <Pressable
                    onPress={() => setDueDate(null)}
                    style={styles.resetBtn}
                    hitSlop={8}
                  >
                    <X size={12} color="#EF4444" />
                    <Text style={[styles.resetBtnText, { color: '#EF4444' }]}>Clear</Text>
                  </Pressable>
                )}
              </View>
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
                    minimumDate={new Date()}
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
            </View>

            {/* Color Picker */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorSwatchSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>
            </View>

            {/* Subject */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Subject (Optional)</Text>
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

            <Pressable
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleAdd}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Add Task</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#161B26',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: '#2A3143',
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3143',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: { padding: 6 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#10B981',
    marginTop: 16,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  formGroup: { marginBottom: 16 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#1E2433',
  },
  resetBtnText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
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
  // Color Picker
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },
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

