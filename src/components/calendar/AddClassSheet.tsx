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
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { X, Clock, Calendar, Trash2 } from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useSubjects } from '@/src/hooks/useSubjects';
import { useClassSchedules } from '@/src/hooks/useClassSchedules';
import { AddExamWeekModal } from './AddExamWeekModal';
import { formatDateLocal } from '@/src/utils/scheduleUtils';

interface AddClassSheetProps {
  visible: boolean;
  onClose: () => void;
}

type Modality = 'F2F' | 'ONLINE' | 'HYBRID';
type SetType = 'A' | 'B' | null;
type PickerField = 'startTime' | 'endTime' | 'startDate' | 'endDate';

// scheduleMode: null = every week, 'bySet' = alternating Set A/B
type ScheduleMode = 'everyWeek' | 'bySet';

// 0 = Sunday … 6 = Saturday, displayed Mon–Sun
const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

const PRESET_COLORS = [
  '#6C8EFF', // primary blue
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

const MODALITIES: { label: string; value: Modality }[] = [
  { label: 'F2F', value: 'F2F' },
  { label: 'Online', value: 'ONLINE' },
  { label: 'Hybrid', value: 'HYBRID' },
];

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Convert a Date to "HH:MM" 24-hour string */
function toHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Format "HH:MM" for display as "H:MM AM/PM" */
function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function dateFromHHMM(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m, 0, 0);
}

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function AddClassSheet({ visible, onClose }: AddClassSheetProps) {
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);
  const { subjects } = useSubjects();

  // Form state
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Monday default
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  // Schedule mode: 'everyWeek' (null setType) or 'bySet' (alternating A/B)
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('everyWeek');
  // For By Set: which set starts first
  const [startsWithSet, setStartsWithSet] = useState<'A' | 'B'>('A');
  // Modality fields
  const [modality, setModality] = useState<Modality>('F2F');         // Every Week
  const [modalitySetA, setModalitySetA] = useState<Modality>('F2F'); // By Set — Set A
  const [modalitySetB, setModalitySetB] = useState<Modality>('F2F'); // By Set — Set B
  // Room fields
  const [room, setRoom] = useState('');           // used for Every Week
  const [roomSetA, setRoomSetA] = useState('');   // used for By Set
  const [roomSetB, setRoomSetB] = useState('');   // used for By Set
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  // Date & Time state
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [activePickerField, setActivePickerField] = useState<PickerField | null>(null);

  // Inline Subject Creation state
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#6C8EFF');
  const [isSavingSubject, setIsSavingSubject] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const resetForm = () => {
    setSelectedDays([1]);
    setStartTime('08:00');
    setEndTime('09:30');
    setModality('F2F');
    setScheduleMode('everyWeek');
    setStartsWithSet('A');
    setModalitySetA('F2F');
    setModalitySetB('F2F');
    setRoom('');
    setRoomSetA('');
    setRoomSetB('');
    setStartDate(new Date());
    setEndDate(null);
    setSelectedSubjectId(null);
    setShowSubjectPicker(false);
    setActivePickerField(null);
    setIsCreatingSubject(false);
    setNewSubjectName('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleDay = (dayValue: number) => {
    setSelectedDays(prev => {
      if (prev.includes(dayValue)) {
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== dayValue);
      }
      return [...prev, dayValue];
    });
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim() || !userId) return;
    setIsSavingSubject(true);
    try {
      const subjectId = generateId();
      const now = new Date().toISOString();
      await powerSync.execute(
        `INSERT INTO Subject (id, name, color, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
        [subjectId, newSubjectName.trim(), newSubjectColor, userId, now, now]
      );
      // Automatically select the newly created subject
      setSelectedSubjectId(subjectId);
      setIsCreatingSubject(false);
      setShowSubjectPicker(false);
      setNewSubjectName('');
    } catch (err) {
      console.error('[AddClass] Subject insert failed:', err);
      setError('Failed to create subject.');
    } finally {
      setIsSavingSubject(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!userId) return;
    try {
      await powerSync.execute('DELETE FROM Subject WHERE id = ? AND userId = ?', [subjectId, userId]);
      if (selectedSubjectId === subjectId) {
        setSelectedSubjectId(null);
      }
    } catch (err) {
      console.error('[AddClass] Subject delete failed:', err);
      setError('Failed to delete subject.');
    }
  };

  // ── Pickers ────────────────────────────────────────────────────────────

  const openPicker = (field: PickerField) => {
    setShowSubjectPicker(false);
    if (Platform.OS === 'android') {
      if (field === 'startTime' || field === 'endTime') {
        const val = dateFromHHMM(field === 'startTime' ? startTime : endTime);
        DateTimePickerAndroid.open({
          value: val,
          mode: 'time',
          is24Hour: false,
          onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
            if (event.type === 'dismissed' || !selectedDate) return;
            const hhmm = toHHMM(selectedDate);
            if (field === 'startTime') setStartTime(hhmm);
            else setEndTime(hhmm);
          },
        });
      } else {
        const val = field === 'startDate' ? startDate : (endDate ?? startDate);
        DateTimePickerAndroid.open({
          value: val,
          mode: 'date',
          onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
            if (event.type === 'dismissed' || !selectedDate) return;
            if (field === 'startDate') setStartDate(selectedDate);
            else setEndDate(selectedDate);
          },
        });
      }
    } else {
      setActivePickerField(field);
    }
  };

  const handleTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    const hhmm = toHHMM(selected);
    if (activePickerField === 'startTime') setStartTime(hhmm);
    else if (activePickerField === 'endTime') setEndTime(hhmm);
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    if (activePickerField === 'startDate') setStartDate(selected);
    else if (activePickerField === 'endDate') setEndDate(selected);
  };

  const handleIOSDone = () => setActivePickerField(null);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!userId) { setError('You must be logged in.'); return; }
    if (!selectedSubjectId) { setError('Please select a subject for this class.'); return; }
    if (selectedDays.length === 0) { setError('Please select at least one day.'); return; }

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const isBySet = scheduleMode === 'bySet';

      if (isBySet) {
        // For By Set: insert TWO records per day — one for Set A, one for Set B.
        // startsWithSet determines which set the startDate week belongs to,
        // which controls the alternation via isScheduleActiveOnDate.
        await Promise.all(selectedDays.flatMap(day => [
          // Set A record
          powerSync.execute(
            `INSERT INTO ClassSchedule
              (id, dayOfWeek, startTime, endTime, startDate, endDate, room, modality, setType, subjectId, userId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generateId(), day, startTime, endTime,
              formatDateLocal(startDate),
              endDate ? formatDateLocal(endDate) : null,
              roomSetA.trim() || null,
              modalitySetA, 'A',
              selectedSubjectId, userId, now, now,
            ]
          ),
          // Set B record
          powerSync.execute(
            `INSERT INTO ClassSchedule
              (id, dayOfWeek, startTime, endTime, startDate, endDate, room, modality, setType, subjectId, userId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generateId(), day, startTime, endTime,
              startsWithSet === 'A'
                ? (() => { const d = new Date(startDate); d.setDate(d.getDate() + 7); return formatDateLocal(d); })()
                : formatDateLocal(startDate),
              endDate ? formatDateLocal(endDate) : null,
              roomSetB.trim() || null,
              modalitySetB, 'B',
              selectedSubjectId, userId, now, now,
            ]
          ),
        ]));
      } else {
        // Every Week — single record per day
        await Promise.all(selectedDays.map(day => {
          return powerSync.execute(
            `INSERT INTO ClassSchedule
              (id, dayOfWeek, startTime, endTime, startDate, endDate, room, modality, setType, subjectId, userId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generateId(), day, startTime, endTime,
              formatDateLocal(startDate),
              endDate ? formatDateLocal(endDate) : null,
              room.trim() || null,
              modality, null,
              selectedSubjectId, userId, now, now,
            ]
          );
        }));
      }

      handleClose();
    } catch (err: any) {
      console.error('[AddClass] SQLite insert failed:', err);
      setError('Failed to add class. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={styles.sheetContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Class Schedule</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <X size={24} color="#94A3B8" />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.formContainer}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Subject — required for class schedules */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Subject *</Text>
            <Pressable
              style={styles.picker}
              onPress={() => setShowSubjectPicker((prev) => !prev)}
            >
              <View style={styles.subjectPickerInner}>
                {selectedSubject ? (
                  <>
                    <View style={[styles.subjectDot, { backgroundColor: selectedSubject.color ?? '#6C8EFF' }]} />
                    <Text style={styles.pickerText}>{selectedSubject.name}</Text>
                  </>
                ) : (
                  <Text style={styles.pickerPlaceholder}>Select a subject...</Text>
                )}
              </View>
            </Pressable>
            {showSubjectPicker && (
              <View style={styles.pickerList}>
                {/* Scrollable subject list — capped height so button always shows */}
                <ScrollView nestedScrollEnabled style={styles.subjectScroll} showsVerticalScrollIndicator={false}>
                  {subjects.map((s) => (
                    <View key={s.id} style={styles.pickerItemWrapper}>
                      <Pressable
                        style={styles.pickerItem}
                        onPress={() => { setSelectedSubjectId(s.id); setShowSubjectPicker(false); setIsCreatingSubject(false); }}
                      >
                        <View style={[styles.subjectDot, { backgroundColor: s.color ?? '#6C8EFF' }]} />
                        <Text style={styles.pickerItemText}>{s.name}</Text>
                      </Pressable>
                      <Pressable
                        style={styles.deleteSubjectBtn}
                        onPress={() => handleDeleteSubject(s.id)}
                      >
                        <X size={16} color="#94A3B8" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>

                {/* Always-visible action at bottom — either "+ New Subject" or the creation form */}
                {!isCreatingSubject ? (
                  <Pressable
                    style={styles.newSubjectBtn}
                    onPress={() => setIsCreatingSubject(true)}
                  >
                    <Text style={styles.newSubjectBtnText}>+ New Subject</Text>
                  </Pressable>
                ) : (
                  <View style={styles.newSubjectForm}>
                    <TextInput
                      style={styles.newSubjectInput}
                      placeholder="Subject Name"
                      placeholderTextColor="#94A3B8"
                      value={newSubjectName}
                      onChangeText={setNewSubjectName}
                      autoFocus
                    />
                    <View style={styles.newSubjectColors}>
                      {PRESET_COLORS.map((color) => (
                        <Pressable
                          key={color}
                          style={[
                            styles.newSubjectColorSwatch,
                            { backgroundColor: color },
                            newSubjectColor === color && styles.newSubjectColorSelected
                          ]}
                          onPress={() => setNewSubjectColor(color)}
                        />
                      ))}
                    </View>
                    <View style={styles.newSubjectActions}>
                      <Pressable
                        style={styles.newSubjectCancel}
                        onPress={() => setIsCreatingSubject(false)}
                      >
                        <Text style={styles.newSubjectCancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={styles.newSubjectSave}
                        onPress={handleCreateSubject}
                      >
                        {isSavingSubject ? (
                          <ActivityIndicator size="small" color="#6C8EFF" />
                        ) : (
                          <Text style={styles.newSubjectSaveText}>Save</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Day of Week */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Days of Week</Text>
            <View style={styles.pillRow}>
              {DAYS.map((d) => {
                const isSelected = selectedDays.includes(d.value);
                return (
                  <Pressable
                    key={d.value}
                    style={[styles.pill, isSelected && styles.pillSelected]}
                    onPress={() => toggleDay(d.value)}
                  >
                    <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Start & End Date — side by side */}
          <View style={[styles.formGroup, styles.timeRow]}>
            {/* Start Date */}
            <View style={styles.timeField}>
              <Text style={styles.label}>Start Date</Text>
              <Pressable style={styles.picker} onPress={() => openPicker('startDate')}>
                <Text style={styles.pickerText}>{formatDate(startDate)}</Text>
                <Calendar size={14} color="#94A3B8" />
              </Pressable>
            </View>

            <View style={styles.timeSeparator}>
              <Text style={styles.timeSeparatorText}>—</Text>
            </View>

            {/* End Date */}
            <View style={styles.timeField}>
              <Text style={styles.label}>End Date (Optional)</Text>
              <Pressable style={styles.picker} onPress={() => openPicker('endDate')}>
                <Text style={endDate ? styles.pickerText : styles.pickerPlaceholder}>
                  {endDate ? formatDate(endDate) : 'Select end date...'}
                </Text>
                <Calendar size={14} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          {/* Start & End Time — side by side */}
          <View style={[styles.formGroup, styles.timeRow]}>
            {/* Start Time */}
            <View style={styles.timeField}>
              <Text style={styles.label}>Start Time</Text>
              <Pressable style={styles.picker} onPress={() => openPicker('startTime')}>
                <Text style={styles.pickerText}>{formatTime12(startTime)}</Text>
                <Clock size={14} color="#94A3B8" />
              </Pressable>
            </View>

            <View style={styles.timeSeparator}>
              <Text style={styles.timeSeparatorText}>—</Text>
            </View>

            {/* End Time */}
            <View style={styles.timeField}>
              <Text style={styles.label}>End Time</Text>
              <Pressable style={styles.picker} onPress={() => openPicker('endTime')}>
                <Text style={styles.pickerText}>{formatTime12(endTime)}</Text>
                <Clock size={14} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          {/* iOS inline spinners */}
          {Platform.OS === 'ios' && activePickerField !== null && (
            <View style={styles.iosPickerWrapper}>
              <DateTimePicker
                value={
                  activePickerField === 'startTime' || activePickerField === 'endTime'
                    ? dateFromHHMM(activePickerField === 'startTime' ? startTime : endTime)
                    : (activePickerField === 'startDate' ? startDate : (endDate ?? startDate))
                }
                mode={activePickerField === 'startTime' || activePickerField === 'endTime' ? 'time' : 'date'}
                display="spinner"
                onChange={
                  activePickerField === 'startTime' || activePickerField === 'endTime'
                    ? handleTimeChange
                    : handleDateChange
                }
                textColor="#ffffff"
                themeVariant="dark"
                style={styles.iosPicker}
              />
              <Pressable style={styles.iosDoneBtn} onPress={handleIOSDone}>
                <Text style={styles.iosDoneBtnText}>Done</Text>
              </Pressable>
            </View>
          )}

          {/* Modality — only shown in Every Week mode */}
          {scheduleMode === 'everyWeek' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Modality</Text>
              <View style={styles.pillRow}>
                {MODALITIES.map((m) => (
                  <Pressable
                    key={m.value}
                    style={[styles.pill, styles.pillWide, modality === m.value && styles.pillSelected]}
                    onPress={() => setModality(m.value)}
                  >
                    <Text style={[styles.pillText, modality === m.value && styles.pillTextSelected]}>
                      {m.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Schedule Set */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Schedule Set</Text>
            <View style={styles.pillRow}>
              <Pressable
                style={[styles.pill, styles.pillWide, scheduleMode === 'everyWeek' && styles.pillSelected]}
                onPress={() => setScheduleMode('everyWeek')}
              >
                <Text style={[styles.pillText, scheduleMode === 'everyWeek' && styles.pillTextSelected]}>Every Week</Text>
              </Pressable>
              <Pressable
                style={[styles.pill, styles.pillWide, scheduleMode === 'bySet' && styles.pillSelected]}
                onPress={() => setScheduleMode('bySet')}
              >
                <Text style={[styles.pillText, scheduleMode === 'bySet' && styles.pillTextSelected]}>By Set</Text>
              </Pressable>
            </View>
          </View>

          {/* Room — conditional on schedule mode */}
          {scheduleMode === 'everyWeek' ? (
            // Single room for every-week classes
            <View style={styles.formGroup}>
              <Text style={styles.label}>Room / Location (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Room 416, Tech Hall"
                placeholderTextColor="#94A3B8"
                value={room}
                onChangeText={setRoom}
                onFocus={() => setShowSubjectPicker(false)}
              />
            </View>
          ) : (
            // By Set: Starts With + paired Set A & Set B (Modality + Room each)
            <View style={styles.formGroup}>
              <Text style={styles.label}>Set Configuration</Text>

              {/* Which set starts first */}
              <Text style={styles.setRoomLabel}>Starts With</Text>
              <View style={[styles.pillRow, { marginBottom: 16 }]}>
                <Pressable
                  style={[styles.pill, styles.pillWide, startsWithSet === 'A' && styles.pillSelected]}
                  onPress={() => setStartsWithSet('A')}
                >
                  <Text style={[styles.pillText, startsWithSet === 'A' && styles.pillTextSelected]}>Set A First</Text>
                </Pressable>
                <Pressable
                  style={[styles.pill, styles.pillWide, startsWithSet === 'B' && styles.pillSelected]}
                  onPress={() => setStartsWithSet('B')}
                >
                  <Text style={[styles.pillText, startsWithSet === 'B' && styles.pillTextSelected]}>Set B First</Text>
                </Pressable>
              </View>

              {/* Set A — Modality + Room */}
              <View style={styles.setGroup}>
                <Text style={styles.setGroupHeader}>Set A</Text>
                <Text style={styles.setRoomLabel}>Modality</Text>
                <View style={[styles.pillRow, { marginBottom: 10 }]}>
                  {MODALITIES.map((m) => (
                    <Pressable
                      key={m.value}
                      style={[styles.pill, styles.pillWide, modalitySetA === m.value && styles.pillSelected]}
                      onPress={() => setModalitySetA(m.value)}
                    >
                      <Text style={[styles.pillText, modalitySetA === m.value && styles.pillTextSelected]}>{m.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.setRoomLabel}>Room / Location (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Room 301, Building A"
                  placeholderTextColor="#94A3B8"
                  value={roomSetA}
                  onChangeText={setRoomSetA}
                  onFocus={() => setShowSubjectPicker(false)}
                />
              </View>

              {/* Set B — Modality + Room */}
              <View style={[styles.setGroup, { marginTop: 12 }]}>
                <Text style={styles.setGroupHeader}>Set B</Text>
                <Text style={styles.setRoomLabel}>Modality</Text>
                <View style={[styles.pillRow, { marginBottom: 10 }]}>
                  {MODALITIES.map((m) => (
                    <Pressable
                      key={m.value}
                      style={[styles.pill, styles.pillWide, modalitySetB === m.value && styles.pillSelected]}
                      onPress={() => setModalitySetB(m.value)}
                    >
                      <Text style={[styles.pillText, modalitySetB === m.value && styles.pillTextSelected]}>{m.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.setRoomLabel}>Room / Location (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Room 205, Building B"
                  placeholderTextColor="#94A3B8"
                  value={roomSetB}
                  onChangeText={setRoomSetB}
                  onFocus={() => setShowSubjectPicker(false)}
                />
              </View>
            </View>
          )}

          <Button style={styles.addButton} onPress={handleAdd} disabled={isLoading}>
            {isLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text>Add Class</Text>
            }
          </Button>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    maxHeight: '92%',
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
  formContainer: { paddingBottom: 8 },
  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 12 },
  formGroup: { marginBottom: 18 },
  label: { fontSize: 14, color: '#94A3B8', marginBottom: 8 },
  setRoomLabel: { fontSize: 12, color: '#6C8EFF', marginBottom: 6, fontWeight: '600' },
  setGroup: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 10,
    padding: 12,
  },
  setGroupHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
    letterSpacing: 0.5,
  },

  // Pill selectors
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3143',
    backgroundColor: '#10131C',
    minWidth: 48,
    alignItems: 'center',
  },
  pillWide: {
    flex: 1,
  },
  pillSelected: {
    backgroundColor: 'rgba(108,142,255,0.15)',
    borderColor: '#6C8EFF',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  pillTextSelected: {
    color: '#6C8EFF',
  },

  // Time row
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  timeField: { flex: 1 },
  timeSeparator: {
    paddingBottom: 12,
  },
  timeSeparatorText: {
    color: '#94A3B8',
    fontSize: 16,
  },

  // Input
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

  // Picker
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
  pickerText: { color: '#ffffff', fontSize: 15, flex: 1 },
  pickerPlaceholder: { color: '#94A3B8', fontSize: 15, flex: 1 },
  subjectPickerInner: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  pickerList: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3143',
  },
  pickerItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerItemText: { color: '#ffffff', fontSize: 15, marginLeft: 8 },
  deleteSubjectBtn: {
    padding: 12,
  },

  // iOS picker
  iosPickerWrapper: {
    marginTop: -10,
    marginBottom: 12,
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 8,
    overflow: 'hidden',
  },
  iosPicker: { height: 150 },
  iosDoneBtn: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#2A3143',
  },
  iosDoneBtnText: { color: '#6C8EFF', fontSize: 15, fontWeight: '600' },

  addButton: { marginTop: 8, backgroundColor: '#6C8EFF' },

  // Inline new subject form
  subjectScroll: {
    maxHeight: 200,
  },
  newSubjectBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A3143',
    alignItems: 'center',
  },
  newSubjectBtnText: {
    color: '#6C8EFF',
    fontSize: 14,
    fontWeight: '600',
  },
  newSubjectForm: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A3143',
    backgroundColor: '#161A26',
  },
  newSubjectInput: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 12,
  },
  newSubjectColors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  newSubjectColorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  newSubjectColorSelected: {
    borderWidth: 2,
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },
  newSubjectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  newSubjectCancel: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  newSubjectCancelText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  newSubjectSave: {
    backgroundColor: '#6C8EFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 64,
    alignItems: 'center',
  },
  newSubjectSaveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

