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
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { X, Clock, Calendar, Trash2 } from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useSubjects } from '@/src/hooks/useSubjects';
import { ClassScheduleRow } from '@/src/hooks/useClassSchedules';

interface EditClassSheetProps {
  visible: boolean;
  schedule: ClassScheduleRow | null;
  onClose: () => void;
}

type Modality = 'F2F' | 'ONLINE' | 'HYBRID';
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
  { label: 'Hybrid', value: 'HYBRID' },
];

const SET_TYPES: { label: string; value: SetType }[] = [
  { label: 'Every Week', value: null },
  { label: 'Set A', value: 'A' },
  { label: 'Set B', value: 'B' },
];

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
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function EditClassSheet({ visible, schedule, onClose }: EditClassSheetProps) {
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);
  const { subjects } = useSubjects();

  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [modality, setModality] = useState<Modality>('F2F');
  const [setType, setSetType] = useState<SetType>(null);
  const [room, setRoom] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [activePickerField, setActivePickerField] = useState<PickerField | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when schedule changes
  useEffect(() => {
    if (schedule) {
      setSelectedDay(schedule.day_of_week);
      setStartTime(schedule.start_time);
      setEndTime(schedule.end_time);
      setModality(schedule.modality as Modality);
      setSetType((schedule.set_type as SetType) ?? null);
      setRoom(schedule.room ?? '');
      setSelectedSubjectId(schedule.subject_id);
      setStartDate(new Date(schedule.start_date));
      setEndDate(schedule.end_date ? new Date(schedule.end_date) : null);
      setShowSubjectPicker(false);
      setActivePickerField(null);
      setError(null);
    }
  }, [schedule]);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const handleClose = () => {
    setShowSubjectPicker(false);
    setActivePickerField(null);
    setError(null);
    onClose();
  };

  const openPicker = (field: PickerField) => {
    setShowSubjectPicker(false);
    setActivePickerField(field);
  };

  const handleTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setActivePickerField(null);
    if (!selected) return;
    const hhmm = toHHMM(selected);
    if (activePickerField === 'startTime') setStartTime(hhmm);
    else if (activePickerField === 'endTime') setEndTime(hhmm);
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setActivePickerField(null);
    if (!selected) return;
    if (activePickerField === 'startDate') setStartDate(selected);
    else if (activePickerField === 'endDate') setEndDate(selected);
  };

  const handleIOSDone = () => setActivePickerField(null);

  const handleSave = async () => {
    if (!schedule) return;
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      await powerSync.execute(
        `UPDATE ClassSchedule SET
          dayOfWeek = ?, startTime = ?, endTime = ?, startDate = ?, endDate = ?, room = ?,
          modality = ?, setType = ?, subjectId = ?, updatedAt = ?
         WHERE id = ?`,
        [
          selectedDay,
          startTime,
          endTime,
          startDate.toISOString().split('T')[0],
          endDate ? endDate.toISOString().split('T')[0] : null,
          room.trim() || null,
          modality,
          setType,
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
      'Delete Class',
      'Are you sure you want to delete this class schedule? This cannot be undone.',
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
              setError('Failed to delete class.');
            } finally {
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

          {/* Subject */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Subject</Text>
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
                <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
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

          {/* Day of Week */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Day of Week</Text>
            <View style={styles.pillRow}>
              {DAYS.map((d) => (
                <Pressable
                  key={d.value}
                  style={[styles.pill, selectedDay === d.value && styles.pillSelected]}
                  onPress={() => setSelectedDay(d.value)}
                >
                  <Text style={[styles.pillText, selectedDay === d.value && styles.pillTextSelected]}>
                    {d.label}
                  </Text>
                </Pressable>
              ))}
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
            <View style={styles.timeSeparator}><Text style={styles.timeSeparatorText}>—</Text></View>
            {/* End Date */}
            <View style={styles.timeField}>
              <Text style={styles.label}>End Date</Text>
              <Text style={styles.sublabel}>Optional</Text>
              <Pressable style={styles.picker} onPress={() => openPicker('endDate')}>
                <Text style={endDate ? styles.pickerText : styles.pickerPlaceholder}>
                  {endDate ? formatDate(endDate) : 'None'}
                </Text>
                <Calendar size={14} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          {/* Android date picker */}
          {Platform.OS === 'android' && (activePickerField === 'startDate' || activePickerField === 'endDate') && (
            <DateTimePicker
              value={activePickerField === 'startDate' ? startDate : (endDate ?? startDate)}
              mode="date"
              display="default"
              onValueChange={handleDateChange}
            />
          )}

          {/* iOS date picker */}
          {Platform.OS === 'ios' && (activePickerField === 'startDate' || activePickerField === 'endDate') && (
            <View style={styles.iosPickerWrapper}>
              <DateTimePicker
                value={activePickerField === 'startDate' ? startDate : (endDate ?? startDate)}
                mode="date"
                display="spinner"
                onValueChange={handleDateChange}
                textColor="#ffffff"
                themeVariant="dark"
                style={styles.iosPicker}
              />
              <Pressable style={styles.iosDoneBtn} onPress={handleIOSDone}>
                <Text style={styles.iosDoneBtnText}>Done</Text>
              </Pressable>
            </View>
          )}

          {/* Start & End Time */}
          <View style={[styles.formGroup, styles.timeRow]}>
            <View style={styles.timeField}>
              <Text style={styles.label}>Start Time</Text>
              <Pressable style={styles.picker} onPress={() => openPicker('startTime')}>
                <Text style={styles.pickerText}>{formatTime12(startTime)}</Text>
                <Clock size={14} color="#94A3B8" />
              </Pressable>
            </View>
            <View style={styles.timeSeparator}><Text style={styles.timeSeparatorText}>—</Text></View>
            <View style={styles.timeField}>
              <Text style={styles.label}>End Time</Text>
              <Pressable style={styles.picker} onPress={() => openPicker('endTime')}>
                <Text style={styles.pickerText}>{formatTime12(endTime)}</Text>
                <Clock size={14} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          {/* Android time picker */}
          {Platform.OS === 'android' && (activePickerField === 'startTime' || activePickerField === 'endTime') && (
            <DateTimePicker
              value={dateFromHHMM(activePickerField === 'startTime' ? startTime : endTime)}
              mode="time"
              display="default"
              onValueChange={handleTimeChange}
            />
          )}

          {/* iOS time picker */}
          {Platform.OS === 'ios' && (activePickerField === 'startTime' || activePickerField === 'endTime') && (
            <View style={styles.iosPickerWrapper}>
              <DateTimePicker
                value={dateFromHHMM(activePickerField === 'startTime' ? startTime : endTime)}
                mode="time"
                display="spinner"
                onValueChange={handleTimeChange}
                textColor="#ffffff"
                themeVariant="dark"
                style={styles.iosPicker}
              />
              <Pressable style={styles.iosDoneBtn} onPress={handleIOSDone}>
                <Text style={styles.iosDoneBtnText}>Done</Text>
              </Pressable>
            </View>
          )}

          {/* If Every Week, show normal Modality + Schedule Set + Room */}
          {setType === null ? (
            <>
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

              {/* Set Type (Locked to Every Week to prevent desyncing pairs) */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Schedule Set</Text>
                <View style={styles.pillRow}>
                  <Pressable style={[styles.pill, styles.pillWide, styles.pillSelected]}>
                    <Text style={[styles.pillText, styles.pillTextSelected]}>Every Week</Text>
                  </Pressable>
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
            </>
          ) : (
            /* If By Set, show locked Modality + Room for this specific set */
            <View style={styles.formGroup}>
              <Text style={styles.label}>Set {setType} Configuration</Text>
              
              <View style={{ backgroundColor: '#10131C', borderWidth: 1, borderColor: '#2A3143', borderRadius: 10, padding: 12 }}>
                <Text style={{ fontSize: 12, color: '#6C8EFF', marginBottom: 6, fontWeight: '600' }}>Modality</Text>
                <View style={[styles.pillRow, { marginBottom: 10 }]}>
                  {MODALITIES.map((m) => (
                    <Pressable
                      key={m.value}
                      style={[styles.pill, styles.pillWide, modality === m.value && styles.pillSelected]}
                      onPress={() => setModality(m.value)}
                    >
                      <Text style={[styles.pillText, modality === m.value && styles.pillTextSelected]}>{m.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={{ fontSize: 12, color: '#6C8EFF', marginBottom: 6, fontWeight: '600' }}>Room / Location (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`e.g. Room for Set ${setType}`}
                  placeholderTextColor="#94A3B8"
                  value={room}
                  onChangeText={setRoom}
                  onFocus={() => setShowSubjectPicker(false)}
                />
              </View>
            </View>
          )}

          <Button style={styles.saveButton} onPress={handleSave} disabled={isLoading}>
            {isLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text>Save Changes</Text>
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteBtn: { padding: 6 },
  closeBtn: { padding: 4 },
  formContainer: { paddingBottom: 8 },
  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 12 },
  formGroup: { marginBottom: 18 },
  label: { fontSize: 14, color: '#94A3B8', marginBottom: 8 },
  sublabel: { fontSize: 12, color: '#64748B', marginBottom: 8, marginTop: -6 },
  setRoomLabel: { fontSize: 12, color: '#6C8EFF', marginBottom: 6, fontWeight: '600' },
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
