import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { X, ChevronDown, Calendar, MapPin, Clock, Trash2 } from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { useSubjects } from '@/src/hooks/useSubjects';
import { CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { formatDateLocal } from '@/src/utils/scheduleUtils';

interface EditEventSheetProps {
  visible: boolean;
  event: CalendarEventRow | null;
  onClose: () => void;
}

type DateField = 'start' | 'end';
type DatePickerStep = 'date' | 'time' | null;

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

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = date.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} · ${h12}:${pad(date.getMinutes())} ${ampm}`;
}

export function EditEventSheet({ visible, event, onClose }: EditEventSheetProps) {
  const powerSync = usePowerSync();
  const { subjects } = useSubjects();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<DateField | null>(null);
  const [datePickerStep, setDatePickerStep] = useState<DatePickerStep>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when event changes
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? '');
      setStartDate(new Date(event.start_date));
      setEndDate(event.end_date ? new Date(event.end_date) : null);
      setAllDay(event.all_day === 1);
      setLocation(event.location ?? '');
      setSelectedColor(event.color ?? PRESET_COLORS[0]);
      setSelectedSubjectId(event.subject_id);
      setShowSubjectPicker(false);
      setActiveDateField(null);
      setDatePickerStep(null);
      setError(null);
    }
  }, [event]);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const handleClose = () => {
    setShowSubjectPicker(false);
    setActiveDateField(null);
    setDatePickerStep(null);
    setError(null);
    onClose();
  };

  const openDatePicker = (field: DateField) => {
    setShowSubjectPicker(false);
    if (Platform.OS === 'android') {
      const baseDate = field === 'start' ? startDate : (endDate ?? new Date());
      if (allDay) {
        DateTimePickerAndroid.open({
          value: baseDate,
          mode: 'date',
          onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
            if (event.type === 'dismissed' || !selectedDate) return;
            if (field === 'start') setStartDate(selectedDate);
            else setEndDate(selectedDate);
          },
        });
      } else {
        DateTimePickerAndroid.open({
          value: baseDate,
          mode: 'date',
          onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
            if (event.type === 'dismissed' || !selectedDate) return;
            const merged = new Date(selectedDate);
            merged.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);
            DateTimePickerAndroid.open({
              value: merged,
              mode: 'time',
              is24Hour: false,
              onChange: (timeEvent: DateTimePickerEvent, selectedTime?: Date) => {
                if (timeEvent.type === 'dismissed' || !selectedTime) {
                  if (field === 'start') setStartDate(merged);
                  else setEndDate(merged);
                  return;
                }
                const finalDate = new Date(merged);
                finalDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
                if (field === 'start') setStartDate(finalDate);
                else setEndDate(finalDate);
              },
            });
          },
        });
      }
    } else {
      setActiveDateField(field);
      setDatePickerStep('date');
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) {
      if (activeDateField === 'start') setStartDate(selected);
      else setEndDate(selected);
    }
  };

  const handleIOSDone = () => { setDatePickerStep(null); setActiveDateField(null); };

  const handleSave = async () => {
    if (!title.trim()) { setError('Event title is required.'); return; }
    if (!event) return;
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      await powerSync.execute(
        `UPDATE CalendarEvent SET
          title = ?, description = ?, startDate = ?, endDate = ?,
          allDay = ?, location = ?, color = ?, subjectId = ?, updatedAt = ?
         WHERE id = ?`,
        [
          title.trim(),
          description.trim() || null,
          allDay ? formatDateLocal(startDate) : startDate.toISOString(),
          endDate ? (allDay ? formatDateLocal(endDate) : endDate.toISOString()) : null,
          allDay ? 1 : 0,
          location.trim() || null,
          selectedColor,
          selectedSubjectId,
          now,
          event.id,
        ]
      );
      handleClose();
    } catch (err) {
      console.error('[EditEvent] update failed:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!event) return;
            setIsDeleting(true);
            try {
              await powerSync.execute('DELETE FROM CalendarEvent WHERE id = ?', [event.id]);
              handleClose();
            } catch (err) {
              console.error('[EditEvent] delete failed:', err);
              setError('Failed to delete event.');
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
          <Text style={styles.headerTitle}>Edit Event</Text>
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

          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Event Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="What's the event?"
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

          {/* All Day toggle */}
          <View style={[styles.formGroup, styles.toggleRow]}>
            <View>
              <Text style={styles.label}>All Day</Text>
              <Text style={styles.sublabel}>No specific time</Text>
            </View>
            <Switch
              value={allDay}
              onValueChange={setAllDay}
              trackColor={{ false: '#2A3143', true: '#6C8EFF' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Start Date */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Start {allDay ? 'Date' : 'Date & Time'} *</Text>
            <Pressable style={styles.picker} onPress={() => openDatePicker('start')}>
              <Text style={styles.pickerText}>{formatDateTime(startDate)}</Text>
              <Calendar size={16} color="#94A3B8" />
            </Pressable>
            {Platform.OS === 'ios' && activeDateField === 'start' && datePickerStep !== null && (
              <View style={styles.iosPickerWrapper}>
                <DateTimePicker
                  value={startDate}
                  mode={allDay ? 'date' : 'datetime'}
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

          {/* End Date */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>End {allDay ? 'Date' : 'Date & Time'} (Optional)</Text>
            <Pressable style={styles.picker} onPress={() => openDatePicker('end')}>
              <Text style={endDate ? styles.pickerText : styles.pickerPlaceholder}>
                {endDate ? formatDateTime(endDate) : 'Select end time...'}
              </Text>
              <Clock size={16} color="#94A3B8" />
            </Pressable>
            {Platform.OS === 'ios' && activeDateField === 'end' && datePickerStep !== null && (
              <View style={styles.iosPickerWrapper}>
                <DateTimePicker
                  value={endDate ?? startDate}
                  mode={allDay ? 'date' : 'datetime'}
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

          {/* Location */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Location</Text>
            <View style={styles.inputWithIcon}>
              <MapPin size={16} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inputInline}
                placeholder="Room, building, or online link..."
                placeholderTextColor="#94A3B8"
                value={location}
                onChangeText={setLocation}
                onFocus={() => setShowSubjectPicker(false)}
              />
            </View>
          </View>

          {/* Color */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorSwatchSelected
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
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, color: '#94A3B8', marginBottom: 8 },
  sublabel: { fontSize: 12, color: '#2A3143', marginTop: 2 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputInline: { flex: 1, color: '#ffffff', fontSize: 16 },
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
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  colorSwatch: { width: 24, height: 24, borderRadius: 12 },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },
  iosPickerWrapper: {
    marginTop: 8,
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 8,
    overflow: 'hidden',
  },
  iosPicker: { height: 180 },
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

