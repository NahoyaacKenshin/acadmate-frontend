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
import { X, Clock } from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useSubjects } from '@/src/hooks/useSubjects';

interface AddClassSheetProps {
  visible: boolean;
  onClose: () => void;
}

type Modality = 'F2F' | 'ONLINE' | 'HYBRID';
type SetType = 'A' | 'B' | null;
type TimeField = 'start' | 'end';

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
];

const MODALITIES: { label: string; value: Modality }[] = [
  { label: 'F2F', value: 'F2F' },
  { label: 'Online', value: 'ONLINE' },
  { label: 'Hybrid', value: 'HYBRID' },
];

const SET_TYPES: { label: string; value: SetType }[] = [
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

/** Build a Date object from "HH:MM" (today's date, just the time matters) */
function dateFromHHMM(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export function AddClassSheet({ visible, onClose }: AddClassSheetProps) {
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);
  const { subjects } = useSubjects();

  // Form state
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Monday default
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [modality, setModality] = useState<Modality>('F2F');
  const [setType, setSetType] = useState<SetType>(null);
  const [room, setRoom] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  // Time picker state
  const [activeTimeField, setActiveTimeField] = useState<TimeField | null>(null);

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
    setSetType(null);
    setRoom('');
    setSelectedSubjectId(null);
    setShowSubjectPicker(false);
    setActiveTimeField(null);
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

  // ── Time picker ────────────────────────────────────────────────────────────

  const openTimePicker = (field: TimeField) => {
    setShowSubjectPicker(false);
    setActiveTimeField(field);
  };

  const handleTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    // On Android the dialog closes itself; on iOS it stays open until Done
    if (Platform.OS === 'android') setActiveTimeField(null);
    if (!selected) return;
    const hhmm = toHHMM(selected);
    if (activeTimeField === 'start') setStartTime(hhmm);
    else setEndTime(hhmm);
  };

  const handleIOSTimeDone = () => setActiveTimeField(null);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!userId) { setError('You must be logged in.'); return; }
    if (!selectedSubjectId) { setError('Please select a subject for this class.'); return; }
    if (selectedDays.length === 0) { setError('Please select at least one day.'); return; }

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      
      // We run all inserts concurrently
      await Promise.all(selectedDays.map(day => {
        const id = generateId();
        return powerSync.execute(
          `INSERT INTO ClassSchedule
            (id, dayOfWeek, startTime, endTime, room, modality, setType, subjectId, userId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            day,
            startTime,
            endTime,
            room.trim() || null,
            modality,
            setType,
            selectedSubjectId,
            userId,
            now,
            now,
          ]
        );
      }));

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
                <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                  <View style={styles.subjectListContainer}>
                    {subjects.map((s) => (
                      <Pressable
                        key={s.id}
                        style={styles.pickerItem}
                        onPress={() => { setSelectedSubjectId(s.id); setShowSubjectPicker(false); setIsCreatingSubject(false); }}
                      >
                        <View style={[styles.subjectDot, { backgroundColor: s.color ?? '#6C8EFF' }]} />
                        <Text style={styles.pickerItemText}>{s.name}</Text>
                      </Pressable>
                    ))}
                  </View>

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
                        {PRESET_COLORS.map(c => (
                          <Pressable
                            key={c}
                            onPress={() => setNewSubjectColor(c)}
                            style={[
                              styles.newSubjectColorSwatch,
                              { backgroundColor: c },
                              newSubjectColor === c && styles.newSubjectColorSelected
                            ]}
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
                </ScrollView>
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

          {/* Start & End Time — side by side */}
          <View style={[styles.formGroup, styles.timeRow]}>
            {/* Start Time */}
            <View style={styles.timeField}>
              <Text style={styles.label}>Start Time</Text>
              <Pressable style={styles.picker} onPress={() => openTimePicker('start')}>
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
              <Pressable style={styles.picker} onPress={() => openTimePicker('end')}>
                <Text style={styles.pickerText}>{formatTime12(endTime)}</Text>
                <Clock size={14} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          {/* Android time picker dialogs */}
          {Platform.OS === 'android' && activeTimeField !== null && (
            <DateTimePicker
              value={dateFromHHMM(activeTimeField === 'start' ? startTime : endTime)}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}

          {/* iOS inline time spinner — start */}
          {Platform.OS === 'ios' && activeTimeField === 'start' && (
            <View style={styles.iosPickerWrapper}>
              <DateTimePicker
                value={dateFromHHMM(startTime)}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                textColor="#ffffff"
                themeVariant="dark"
                style={styles.iosPicker}
              />
              <Pressable style={styles.iosDoneBtn} onPress={handleIOSTimeDone}>
                <Text style={styles.iosDoneBtnText}>Done</Text>
              </Pressable>
            </View>
          )}

          {/* iOS inline time spinner — end */}
          {Platform.OS === 'ios' && activeTimeField === 'end' && (
            <View style={styles.iosPickerWrapper}>
              <DateTimePicker
                value={dateFromHHMM(endTime)}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                textColor="#ffffff"
                themeVariant="dark"
                style={styles.iosPicker}
              />
              <Pressable style={styles.iosDoneBtn} onPress={handleIOSTimeDone}>
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

          {/* Set Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Schedule Set</Text>
            <Text style={styles.sublabel}>For alternating week setups (e.g. Set A / Set B)</Text>
            <View style={styles.pillRow}>
              {SET_TYPES.map((st) => (
                <Pressable
                  key={String(st.value)}
                  style={[styles.pill, styles.pillWide, setType === st.value && styles.pillSelected]}
                  onPress={() => setSetType(st.value)}
                >
                  <Text style={[styles.pillText, setType === st.value && styles.pillTextSelected]}>
                    {st.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Room */}
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
  sublabel: { fontSize: 12, color: '#2A3143', marginTop: -4, marginBottom: 8 },

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
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3143',
  },
  pickerItemText: { color: '#ffffff', fontSize: 15, marginLeft: 8 },

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
  subjectListContainer: {
    maxHeight: 180,
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
    gap: 8,
    marginBottom: 12,
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
