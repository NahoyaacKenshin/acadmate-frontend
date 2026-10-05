import React, { useState, useEffect, useMemo } from 'react';
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
  Text,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Button } from '../ui/button';
import { X, Clock, Calendar, Trash2, RotateCcw, BookOpen, AlertCircle } from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useSubjects } from '@/src/hooks/useSubjects';
import { ClassScheduleRow } from '@/src/hooks/useClassSchedules';
import { formatDateLocal, toPhilippineISO, parseDateLocal, parseToPHTDate } from '@/src/utils/scheduleUtils';
import { useTheme } from '@/src/theme/useTheme';
import type { ThemeColors } from '@/src/theme/tokens';

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
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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
        [subjectId, newSubjectName.trim(), null, userId, now, now]
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
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerBadge}>
                <BookOpen size={16} color="#6366F1" />
              </View>
              <Text style={styles.headerTitle}>Edit Class</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable onPress={handleDelete} style={styles.deleteBtn} hitSlop={8} disabled={isDeleting}>
                {isDeleting
                  ? <ActivityIndicator size="small" color="#EF4444" />
                  : <Trash2 size={18} color="#EF4444" />
                }
              </Pressable>
              <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
                <X size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
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
                    <Text style={styles.pickerText}>{selectedSubject.name}</Text>
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
                          <Text style={styles.pickerItemText}>{s.name}</Text>
                        </Pressable>
                        <Pressable
                          style={styles.deleteSubjectBtn}
                          onPress={() => handleDeleteSubject(s.id)}
                        >
                          <X size={16} color={colors.mutedForeground} />
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
                        placeholderTextColor={colors.mutedForeground}
                        value={newSubjectName}
                        onChangeText={setNewSubjectName}
                        autoFocus
                      />

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
                            <ActivityIndicator size="small" color="#ffffff" />
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
                    <RotateCcw size={10} color={colors.mutedForeground} />
                    <Text style={styles.resetBtnText}>Today</Text>
                  </Pressable>
                </View>
                <Pressable style={styles.picker} onPress={() => openPicker('startDate')}>
                  <Text style={styles.pickerText}>{formatDate(startDate)}</Text>
                  <Calendar size={14} color={colors.mutedForeground} />
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
                      <RotateCcw size={10} color={colors.mutedForeground} />
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
                  <Calendar size={14} color={colors.mutedForeground} />
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
                  textColor={colors.foreground}
                  themeVariant={isDark ? 'dark' : 'light'}
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
                      <RotateCcw size={10} color={colors.mutedForeground} />
                      <Text style={styles.resetBtnText}>Reset</Text>
                    </Pressable>
                  )}
                </View>
                <Pressable style={styles.picker} onPress={() => openPicker('startTime')}>
                  <Text style={styles.pickerText}>{formatTime12(startTime)}</Text>
                  <Clock size={14} color={colors.mutedForeground} />
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
                      <RotateCcw size={10} color={colors.mutedForeground} />
                      <Text style={styles.resetBtnText}>Reset</Text>
                    </Pressable>
                  )}
                </View>
                <Pressable style={styles.picker} onPress={() => openPicker('endTime')}>
                  <Text style={styles.pickerText}>{formatTime12(endTime)}</Text>
                  <Clock size={14} color={colors.mutedForeground} />
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
                  textColor={colors.foreground}
                  themeVariant={isDark ? 'dark' : 'light'}
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
                placeholderTextColor={colors.mutedForeground}
                value={room}
                onChangeText={setRoom}
                onFocus={() => setShowSubjectPicker(false)}
              />
            </View>

            <Pressable
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Save Changes</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    keyboardAvoid: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderTopWidth: 1,
      borderColor: colors.border,
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
      borderBottomColor: colors.border,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerBadge: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.1)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground, letterSpacing: -0.3 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deleteBtn: { padding: 6 },
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
      paddingBottom: 24,
    },
    submitBtn: {
      backgroundColor: '#6366F1',
      marginTop: 20,
      height: 48,
      borderRadius: 12,
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
      includeFontPadding: false,
    },
    formGroup: { marginBottom: 18 },
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
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    },
    resetBtnText: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontWeight: '600',
      includeFontPadding: false,
    },
    label: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, marginBottom: 8, includeFontPadding: false },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.background : colors.muted,
      minWidth: 48,
      alignItems: 'center',
    },
    pillWide: { flex: 1 },
    pillSelected: { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)', borderColor: '#6366F1' },
    pillText: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, includeFontPadding: false },
    pillTextSelected: { color: '#6366F1' },
    timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    timeField: { flex: 1 },
    timeSeparator: { paddingBottom: 12 },
    timeSeparatorText: { color: colors.mutedForeground, fontSize: 16 },
    input: {
      backgroundColor: isDark ? colors.background : colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      color: colors.foreground,
      fontSize: 15,
    },
    picker: {
      backgroundColor: isDark ? colors.background : colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pickerText: { color: colors.foreground, fontSize: 14, flex: 1 },
    pickerPlaceholder: { color: colors.mutedForeground, fontSize: 14, flex: 1 },
    pickerDisabled: {
      opacity: 0.45,
    },
    subjectPickerInner: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
    subjectDot: { width: 10, height: 10, borderRadius: 5 },
    pickerList: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      marginTop: 4,
      overflow: 'hidden',
    },
    pickerItemWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    pickerItemText: { color: colors.foreground, fontSize: 14, marginLeft: 8 },
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
      borderTopColor: colors.border,
      alignItems: 'center',
    },
    newSubjectBtnText: {
      color: '#6366F1',
      fontSize: 14,
      fontWeight: '600',
    },
    newSubjectForm: {
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
    },
    newSubjectInput: {
      backgroundColor: isDark ? colors.background : colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.foreground,
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
      borderColor: colors.foreground,
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
      color: colors.mutedForeground,
      fontSize: 14,
      fontWeight: '600',
    },
    newSubjectSave: {
      backgroundColor: '#6366F1',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
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
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: 'hidden',
    },
    iosPicker: { height: 150 },
    iosDoneBtn: {
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    iosDoneBtnText: { color: '#6366F1', fontSize: 14, fontWeight: '600' },
    saveButton: { marginTop: 8, backgroundColor: '#6366F1' },
  });
}
