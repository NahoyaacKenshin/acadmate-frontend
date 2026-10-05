import React, { useState, useEffect } from 'react';
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
import {
  X,
  ChevronDown,
  Calendar,
  CheckSquare,
  AlertCircle,
  Sparkles,
  Plus,
  Trash2,
  ListChecks,
  Check,
} from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { SubjectRow, useSubjects } from '@/src/hooks/useSubjects';
import { toPhilippineISO, parseToPHTDate } from '@/src/utils/philippineTime';
import { TaskRow, SubtaskItem } from '@/src/hooks/useTasks';
import { NotificationService } from '@/src/services/notificationService';
import { ApiService } from '@/src/services/api';
import { assertOnline, classifyError } from '@/src/lib/aiRequest';

interface EditTaskSheetProps {
  visible: boolean;
  task: TaskRow | null;
  subjects?: SubjectRow[];
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

export function EditTaskSheet({ visible, task, subjects: propSubjects, onClose }: EditTaskSheetProps) {
  const powerSync = usePowerSync();
  const { subjects: dbSubjects } = useSubjects();
  const subjects = propSubjects ?? dbSubjects;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [datePickerStep, setDatePickerStep] = useState<DatePickerStep>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setDueDate(task.due_date ? (parseToPHTDate(task.due_date) ?? new Date(task.due_date)) : null);
      setSelectedColor(task.color ?? PRESET_COLORS[0]);
      setSelectedSubjectId(task.subject_id);

      if (task.subtasks) {
        try {
          const parsed = JSON.parse(task.subtasks);
          setSubtasks(Array.isArray(parsed) ? parsed : []);
        } catch {
          setSubtasks([]);
        }
      } else {
        setSubtasks([]);
      }

      setNewSubtaskText('');
      setShowSubjectPicker(false);
      setDatePickerStep(null);
      setError(null);
    }
  }, [task]);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const handleClose = () => {
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

  const handleAIBreakdown = async () => {
    if (!title.trim()) {
      setError('Please provide a task title first.');
      return;
    }
    setIsGeneratingSubtasks(true);
    setError(null);
    try {
      assertOnline();
      const res = await ApiService.tasks.breakdown({
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate ? toPhilippineISO(dueDate) : null,
      });
      const generated = res?.data?.subtasks ?? [];
      if (generated.length > 0) {
        setSubtasks(generated);
      }
    } catch (err: any) {
      const classified = classifyError(err);
      setError(classified.message);
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleDeleteSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    const newItem: SubtaskItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: newSubtaskText.trim(),
      completed: false,
    };
    setSubtasks((prev) => [...prev, newItem]);
    setNewSubtaskText('');
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!task) return;

    setIsLoading(true);
    setError(null);

    try {
      const now = toPhilippineISO(new Date());
      const dueDateISO = dueDate ? toPhilippineISO(dueDate) : null;
      const subtasksJson = JSON.stringify(subtasks);

      const finalColor = task.color ?? selectedSubject?.color ?? '#6C8EFF';

      await powerSync.execute(
        `UPDATE Task SET title = ?, description = ?, dueDate = ?, color = ?, subtasks = ?, subjectId = ?, updatedAt = ?
         WHERE id = ?`,
        [title.trim(), description.trim() || null, dueDateISO, finalColor, subtasksJson, selectedSubjectId, now, task.id]
      );

      // Cancel previous notification alarms
      await NotificationService.cancelTaskNotifications(task.id);

      // Reschedule if dueDate exists and task is still pending
      if (dueDateISO && task.completed === 0) {
        NotificationService.scheduleTaskReminders({
          id: task.id,
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDateISO,
          completed: 0,
          color: finalColor,
          subtasks: subtasksJson,
          subject_id: selectedSubjectId,
          user_id: task.user_id,
          created_at: task.created_at,
          updated_at: now,
          subject_name: selectedSubject?.name ?? null,
          subject_color: selectedSubject?.color ?? null,
        }).catch((e) => console.warn('[EditTask] scheduleTaskReminders error:', e));
      }

      handleClose();
    } catch (err: any) {
      console.error('[EditTask] SQLite update failed:', err);
      setError('Failed to save changes. Please try again.');
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
                <CheckSquare size={16} color="#6C8EFF" />
              </View>
              <Text style={styles.headerTitle}>Edit Task</Text>
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

          {/* Scrollable form */}
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

            {/* Subtasks Section with AI Breakdown */}
            <View style={styles.formGroup}>
              <View style={styles.subtasksHeaderRow}>
                <View style={styles.subtasksTitleRow}>
                  <ListChecks size={14} color="#6C8EFF" />
                  <Text style={styles.label}>
                    Subtasks ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
                  </Text>
                </View>
                <Pressable
                  style={[styles.aiBreakdownBtn, (!title.trim() || isGeneratingSubtasks) && { opacity: 0.5 }]}
                  onPress={handleAIBreakdown}
                  disabled={!title.trim() || isGeneratingSubtasks}
                >
                  {isGeneratingSubtasks ? (
                    <ActivityIndicator size="small" color="#6C8EFF" />
                  ) : (
                    <>
                      <Sparkles size={12} color="#6C8EFF" />
                      <Text style={styles.aiBreakdownBtnText}>Break it down</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* Subtask items list */}
              {subtasks.length > 0 && (
                <View style={styles.subtaskList}>
                  {subtasks.map((st) => (
                    <View key={st.id} style={styles.subtaskEditRow}>
                      <Pressable
                        style={[styles.subtaskCheck, st.completed && styles.subtaskCheckDone]}
                        onPress={() => handleToggleSubtask(st.id)}
                        hitSlop={6}
                      >
                        {st.completed && <Check size={10} color="#fff" strokeWidth={3} />}
                      </Pressable>
                      <Text
                        style={[styles.subtaskEditText, st.completed && styles.subtaskEditTextDone]}
                        numberOfLines={2}
                      >
                        {st.title}
                      </Text>
                      <Pressable onPress={() => handleDeleteSubtask(st.id)} hitSlop={6}>
                        <Trash2 size={14} color="#64748B" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Add subtask input */}
              <View style={styles.addSubtaskRow}>
                <TextInput
                  style={styles.addSubtaskInput}
                  value={newSubtaskText}
                  onChangeText={setNewSubtaskText}
                  placeholder="Add a milestone step..."
                  placeholderTextColor="#475569"
                  onSubmitEditing={handleAddSubtask}
                  returnKeyType="done"
                />
                <Pressable
                  style={[styles.addSubtaskBtn, !newSubtaskText.trim() && { opacity: 0.5 }]}
                  onPress={handleAddSubtask}
                  disabled={!newSubtaskText.trim()}
                >
                  <Plus size={16} color="#ffffff" />
                </Pressable>
              </View>
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
                        <Text style={styles.pickerItemText}>{s.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <Button style={styles.saveButton} onPress={handleSave} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </Button>
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
    paddingBottom: 24,
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
    backgroundColor: 'rgba(108, 142, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(108, 142, 255, 0.35)',
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
  formGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#ffffff',
    fontSize: 14,
  },
  multiline: { minHeight: 68, textAlignVertical: 'top' },
  picker: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: { color: '#ffffff', fontSize: 14 },
  pickerPlaceholder: { color: '#64748B', fontSize: 14 },
  pickerList: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 10,
    marginTop: 6,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2433',
    gap: 10,
  },
  pickerItemText: { color: '#ffffff', fontSize: 14, fontWeight: '500' },
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
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },
  // iOS inline picker
  iosPickerWrapper: {
    marginTop: 8,
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 10,
    overflow: 'hidden',
  },
  iosPicker: {
    height: 150,
  },
  iosDoneBtn: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#2A3143',
  },
  iosDoneBtnText: {
    color: '#6C8EFF',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#6C8EFF',
    marginTop: 8,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  subtasksHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtasksTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiBreakdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(108, 142, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(108, 142, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiBreakdownBtnText: {
    fontSize: 11,
    color: '#6C8EFF',
    fontWeight: '600',
  },
  subtaskList: {
    backgroundColor: '#10131C',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 10,
    gap: 8,
    marginBottom: 8,
  },
  subtaskEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtaskCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#4A5568',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskCheckDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  subtaskEditText: {
    fontSize: 13,
    color: '#CBD5E1',
    flex: 1,
  },
  subtaskEditTextDone: {
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addSubtaskInput: {
    flex: 1,
    backgroundColor: '#10131C',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3143',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#ffffff',
  },
  addSubtaskBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#6C8EFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

