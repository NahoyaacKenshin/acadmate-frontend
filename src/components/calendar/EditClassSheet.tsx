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
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { X, Clock, Calendar, Trash2, RotateCcw } from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useSubjects } from '@/src/hooks/useSubjects';
import { ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { formatDateLocal, toPhilippineISO, parseDateLocal, parseToPHTDate } from '@/src/utils/scheduleUtils';

interface EditClassSheetProps {
  visible: boolean;
  schedule: ClassScheduleRow | null;
  onClose: () => void;
}

type Modality = 'F2F' | 'ONLINE';
type SetType = 'A' | 'B' | null;
type PickerField = 'startTime' | 'endTime' | 'startDate' | 'endDate';

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
];

const SET_OPTIONS: { label: string; value: SetType }[] = [
  { label: 'Every Week', value: null },
  { label: 'Set A', value: 'A' },
  { label: 'Set B', value: 'B' },
];

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function toHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

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

function formatDate(date: Date | null): string {
  if (!date) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function EditClassSheet({ visible, schedule, onClose }: EditClassSheetProps) {
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);
  const { subjects } = useSubjects();

  const [selectedDays, setSelectedDays] = useState<number[]>([1]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [modality, setModality] = useState<Modality>('F2F');
  const [setType, setSetType] = useState<SetType>(null);
  const [room, setRoom] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [activePickerField, setActivePickerField] = useState<PickerField | null>(null);

  // Inline Subject Creation state
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#6C8EFF');
  const [isSavingSubject, setIsSavingSubject] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when schedule changes
  useEffect(() => {
    if (schedule) {
      let days: number[] = [];
      if (schedule.days_of_week) {
        try {
          const parsed = JSON.parse(schedule.days_of_week);
          if (Array.isArray(parsed) && parsed.length > 0) days = parsed.map(Number);
        } catch {
          const parts = schedule.days_of_week.split(',').map((s: string) => Number(s.trim())).filter((n: number) => !isNaN(n));
          if (parts.length > 0) days = parts;
        }
      }
      if (days.length === 0) days = [schedule.day_of_week];
      setSelectedDays(days);
      setStartTime(schedule.start_time);
      setEndTime(schedule.end_time);
      const mod = schedule.modality === 'ONLINE' ? 'ONLINE' : 'F2F';
      setModality(mod);
      const st = schedule.set_type === 'A' ? 'A' : schedule.set_type === 'B' ? 'B' : null;
      setSetType(st);
      setRoom(schedule.room ?? '');
      setSelectedSubjectId(schedule.subject_id);
      setStartDate(parseToPHTDate(schedule.start_date) ?? parseDateLocal(schedule.start_date) ?? new Date(schedule.start_date));
      const parsedEnd = schedule.end_date ? (parseToPHTDate(schedule.end_date) ?? parseDateLocal(schedule.end_date) ?? new Date(schedule.end_date)) : null;
      setEndDate(parsedEnd ?? parseToPHTDate(schedule.start_date) ?? parseDateLocal(schedule.start_date) ?? new Date(schedule.start_date));
      setShowSubjectPicker(false);
      setActivePickerField(null);
      setIsCreatingSubject(false);
      setNewSubjectName('');
      setError(null);
    }
  }, [schedule]);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const handleClose = () => {
    setShowSubjectPicker(false);
    setActivePickerField(null);
    setIsCreatingSubject(false);
    setError(null);
    onClose();
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim() || !userId) return;
    setIsSavingSubject(true);
    try {
      const subjectId = generateId();
      const now = toPhilippineISO(new Date());
      await powerSync.execute(
        `INSERT INTO Subject (id, name, color, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
        [subjectId, newSubjectName.trim(), newSubjectColor, userId, now, now]
      );
      setSelectedSubjectId(subjectId);
      setIsCreatingSubject(false);
      setShowSubjectPicker(false);
      setNewSubjectName('');
    } catch (err) {
      console.error('[EditClass] Subject insert failed:', err);
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
      console.error('[EditClass] Subject delete failed:', err);
      setError('Failed to delete subject.');
    }
  };

  const openPicker = (field: PickerField) => {
    setShowSubjectPicker(false);
    if (field === 'endDate' && !startDate) return;

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
        const val = field === 'startDate' ? (startDate ?? new Date()) : (endDate ?? startDate ?? new Date());
        DateTimePickerAndroid.open({
          value: val,
          mode: 'date',
          minimumDate: field === 'startDate' ? undefined : (startDate ?? undefined),
          onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
            if (event.type === 'dismissed' || !selectedDate) return;
            if (field === 'startDate') {
              setStartDate(selectedDate);
              if (endDate && endDate < selectedDate) setEndDate(selectedDate);
            } else {
              const safeEnd = startDate && selectedDate < startDate ? startDate : selectedDate;
              setEndDate(safeEnd);
            }
          },
        });
      }
    } else {
      setActivePickerField(field);
    }
  };

  const handleTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate || !activePickerField) return;
    const hh = String(selectedDate.getHours()).padStart(2, '0');
    const mm = String(selectedDate.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    if (activePickerField === 'startTime') setStartTime(timeStr);
    else if (activePickerField === 'endTime') setEndTime(timeStr);
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate || !activePickerField) return;
    if (activePickerField === 'startDate') {
      setStartDate(selectedDate);
      if (endDate && endDate < selectedDate) setEndDate(selectedDate);
    } else if (activePickerField === 'endDate') {
      const safeEnd = startDate && selectedDate < startDate ? startDate : selectedDate;
      setEndDate(safeEnd);
    }
  };

  const handleIOSDone = () => setActivePickerField(null);

  const handleSave = async () => {
    if (!schedule) return;
    if (selectedDays.length === 0) { setError('Please select at least one day.'); return; }
    if (!selectedSubjectId) { setError('Please select a subject.'); return; }
    if (!endDate) { setError('Please select an end date.'); return; }
    if (endDate < startDate) { setError('End date cannot be earlier than start date.'); return; }

    setIsLoading(true);
    setError(null);
    try {
      const now = toPhilippineISO(new Date());
      const normalizedSetType = (setType === 'A' || setType === 'B') ? setType : null;
      await powerSync.execute(
        `UPDATE ClassSchedule SET
          dayOfWeek = ?, daysOfWeek = ?, startTime = ?, endTime = ?, startDate = ?, endDate = ?, room = ?,
          modality = ?, setType = ?, subjectId = ?, updatedAt = ?
         WHERE id = ?`,
        [
          selectedDays[0] ?? 0,
          JSON.stringify(selectedDays),
          startTime,
          endTime,
          formatDateLocal(startDate),
          endDate ? formatDateLocal(endDate) : null,
          room.trim() || null,
          modality,
          normalizedSetType,
          selectedSubjectId,
          now,
          schedule.id,
        ]
      );
      handleClose();
    } catch (err) {
      console.error('[EditClass] update failed:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Class Schedule',
      'Are you sure you want to remove this schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!schedule) return;
            setIsDeleting(true);
            try {
              await powerSync.execute('DELETE FROM ClassSchedule WHERE id = ?', [schedule.id]);
              handleClose();
            } catch (err) {
              console.error('[EditClass] delete failed:', err);
              setError('Failed to delete schedule.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoid}
      >
        <View style={styles.sheetContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Class</Text>
            <View style={styles.headerActions}>
              <Pressable onPress={handleDelete} style={styles.deleteBtn} disabled={isDeleting}>
                {isDeleting
                  ? <ActivityIndicator size="small" color="#EF4444" />
                  : <Trash2 size={20} color="#EF4444" />
                }
              </Pressable>
              <Pressable onPress={handleClose} style={styles.closeBtn}>
                <X size={24} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContainer}
          >
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Subject Picker with inline Create/Delete */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Subject</Text>
              <Pressable
                style={styles.picker}
                onPress={() => {
                  setShowSubjectPicker((prev) => !prev);
                  setIsCreatingSubject(false);
                }}
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
                  <ScrollView nestedScrollEnabled style={styles.subjectScroll} showsVerticalScrollIndicator={false}>
                    {subjects.map((s) => (
                      <View key={s.id} style={styles.pickerItemWrapper}>
                        <Pressable
                          style={styles.pickerItem}
                          onPress={() => {
                            setSelectedSubjectId(s.id);
                            setShowSubjectPicker(false);
                            setIsCreatingSubject(false);
                          }}
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
                              newSubjectColor === color && styles.newSubjectColorSelected,
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

            {/* Day of Week — multi-select */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Days of Week</Text>
              <View style={styles.pillRow}>
                {DAYS.map((d) => {
                  const isSelected = selectedDays.includes(d.value);
                  return (
                    <Pressable
                      key={d.value}
                      style={[styles.pill, isSelected && styles.pillSelected]}
                      onPress={() => {
                        setSelectedDays((prev) => {
                          if (prev.includes(d.value)) {
                            if (prev.length === 1) return prev;
                            return prev.filter((x) => x !== d.value);
                          }
                          return [...prev, d.value].sort((a, b) => a - b);
                        });
                      }}
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
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Start Date</Text>
                  <Pressable
                    onPress={() => {
                      const today = new Date();
                      setStartDate(today);
                      if (endDate && endDate < today) setEndDate(today);
                    }}
                    style={styles.resetBtn}
                    hitSlop={8}
                  >
                    <RotateCcw size={10} color="#94A3B8" />
                    <Text style={styles.resetBtnText}>Today</Text>
                  </Pressable>
                </View>
                <Pressable style={styles.picker} onPress={() => openPicker('startDate')}>
                  <Text style={styles.pickerText}>{formatDate(startDate)}</Text>
                  <Calendar size={14} color="#94A3B8" />
                </Pressable>
              </View>

              <View style={styles.timeSeparator}><Text style={styles.timeSeparatorText}>—</Text></View>

              {/* End Date */}
              <View style={styles.timeField}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>End Date</Text>
                  {endDate > startDate && (
                    <Pressable
                      onPress={() => setEndDate(new Date(startDate))}
                      style={styles.resetBtn}
                      hitSlop={8}
                    >
                      <RotateCcw size={10} color="#94A3B8" />
                      <Text style={styles.resetBtnText}>Reset</Text>
                    </Pressable>
                  )}
                </View>
                <Pressable
                  style={[styles.picker, !startDate && styles.pickerDisabled]}
                  onPress={() => openPicker('endDate')}
                  disabled={!startDate}
                >
                  <Text style={styles.pickerText}>
                    {formatDate(endDate)}
                  </Text>
                  <Calendar size={14} color={!startDate ? '#475569' : '#94A3B8'} />
                </Pressable>
              </View>
            </View>

            {/* iOS date picker */}
            {Platform.OS === 'ios' && (activePickerField === 'startDate' || activePickerField === 'endDate') && (
              <View style={styles.iosPickerWrapper}>
                <DateTimePicker
                  value={
                    activePickerField === 'startDate'
                      ? (startDate ?? new Date())
                      : (endDate && startDate && endDate >= startDate ? endDate : (startDate ?? new Date()))
                  }
                  mode="date"
                  minimumDate={activePickerField === 'endDate' ? (startDate ?? undefined) : undefined}
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

            {/* Start & End Time — side by side */}
            <View style={[styles.formGroup, styles.timeRow]}>
              <View style={styles.timeField}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Start Time</Text>
                  {startTime !== '08:00' && (
                    <Pressable
                      onPress={() => setStartTime('08:00')}
                      style={styles.resetBtn}
                      hitSlop={8}
                    >
                      <RotateCcw size={10} color="#94A3B8" />
                      <Text style={styles.resetBtnText}>Reset</Text>
                    </Pressable>
                  )}
                </View>
                <Pressable style={styles.picker} onPress={() => openPicker('startTime')}>
                  <Text style={styles.pickerText}>{formatTime12(startTime)}</Text>
                  <Clock size={14} color="#94A3B8" />
                </Pressable>
              </View>
              <View style={styles.timeSeparator}><Text style={styles.timeSeparatorText}>—</Text></View>
              <View style={styles.timeField}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>End Time</Text>
                  {endTime !== '09:30' && (
                    <Pressable
                      onPress={() => setEndTime('09:30')}
                      style={styles.resetBtn}
                      hitSlop={8}
                    >
                      <RotateCcw size={10} color="#94A3B8" />
                      <Text style={styles.resetBtnText}>Reset</Text>
                    </Pressable>
                  )}
                </View>
                <Pressable style={styles.picker} onPress={() => openPicker('endTime')}>
                  <Text style={styles.pickerText}>{formatTime12(endTime)}</Text>
                  <Clock size={14} color="#94A3B8" />
                </Pressable>
              </View>
            </View>

            {/* iOS time picker */}
            {Platform.OS === 'ios' && (activePickerField === 'startTime' || activePickerField === 'endTime') && (
              <View style={styles.iosPickerWrapper}>
                <DateTimePicker
                  value={dateFromHHMM(activePickerField === 'startTime' ? startTime : endTime)}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  onChange={handleTimeChange}
                  textColor="#ffffff"
                  themeVariant="dark"
                  style={styles.iosPicker}
                />
                <Pressable style={styles.iosDoneBtn} onPress={handleIOSDone}>
                  <Text style={styles.iosDoneBtnText}>Done</Text>
                </Pressable>
              </View>
            )}

            {/* Modality */}
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

            {/* Schedule Set */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Schedule Set</Text>
              <View style={styles.pillRow}>
                {SET_OPTIONS.map((opt) => {
                  const isSelected = setType === opt.value;
                  return (
                    <Pressable
                      key={String(opt.value)}
                      style={[styles.pill, styles.pillWide, isSelected && styles.pillSelected]}
                      onPress={() => setSetType(opt.value)}
                    >
                      <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Room */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Room / Location (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder={setType ? `e.g. Room for Set ${setType}` : 'e.g. Room 416, Tech Hall'}
                placeholderTextColor="#94A3B8"
                value={room}
                onChangeText={setRoom}
                onFocus={() => setShowSubjectPicker(false)}
              />
            </View>

            <Button style={styles.saveButton} onPress={handleSave} disabled={isLoading}>
              {isLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text>Save Changes</Text>
              }
            </Button>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#1E2433',
  },
  resetBtnText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteBtn: { padding: 6 },
  closeBtn: { padding: 4 },
  formContainer: { paddingBottom: 8 },
  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 12 },
  formGroup: { marginBottom: 18 },
  label: { fontSize: 14, color: '#94A3B8', marginBottom: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  pillWide: { flex: 1 },
  pillSelected: { backgroundColor: 'rgba(108,142,255,0.15)', borderColor: '#6C8EFF' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  pillTextSelected: { color: '#6C8EFF' },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  timeField: { flex: 1 },
  timeSeparator: { paddingBottom: 12 },
  timeSeparatorText: { color: '#94A3B8', fontSize: 16 },
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
  pickerDisabled: {
    opacity: 0.45,
    backgroundColor: '#0F131D',
    borderColor: '#1E2433',
  },
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
  saveButton: { marginTop: 8, backgroundColor: '#6C8EFF' },
});
