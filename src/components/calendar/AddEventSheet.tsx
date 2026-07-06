import React, { useState } from 'react';
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
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { X, ChevronDown, Calendar, MapPin, Clock } from 'lucide-react-native';
import ColorPicker, { Panel1, HueSlider, Swatches } from 'reanimated-color-picker';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useSubjects, SubjectRow } from '@/src/hooks/useSubjects';

interface AddEventSheetProps {
  visible: boolean;
  initialDate?: Date; // Pre-fill start date from selected day
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

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function AddEventSheet({ visible, initialDate, onClose }: AddEventSheetProps) {
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);
  const { subjects } = useSubjects();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>(initialDate ?? new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Picker state
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<DateField | null>(null);
  const [datePickerStep, setDatePickerStep] = useState<DatePickerStep>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate(initialDate ?? new Date());
    setEndDate(null);
    setAllDay(false);
    setLocation('');
    setSelectedColor(PRESET_COLORS[0]);
    setSelectedSubjectId(null);
    setShowSubjectPicker(false);
    setActiveDateField(null);
    setDatePickerStep(null);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ── Date picker handlers ──────────────────────────────────────────────────

  const openDatePicker = (field: DateField) => {
    setShowSubjectPicker(false);
    setActiveDateField(field);
    setDatePickerStep('date');
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) {
      setDatePickerStep(null);
      setActiveDateField(null);
      return;
    }

    if (Platform.OS === 'android') {
      if (datePickerStep === 'date') {
        // Store the date portion, then open time picker
        if (activeDateField === 'start') {
          const merged = new Date(selected);
          merged.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
          setStartDate(merged);
        } else {
          const base = endDate ?? new Date();
          const merged = new Date(selected);
          merged.setHours(base.getHours(), base.getMinutes(), 0, 0);
          setEndDate(merged);
        }
        setDatePickerStep('time');
      } else {
        // Merge time into the stored date
        if (activeDateField === 'start') {
          const merged = new Date(startDate);
          merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
          setStartDate(merged);
        } else {
          const base = endDate ?? new Date();
          const merged = new Date(base);
          merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
          setEndDate(merged);
        }
        setDatePickerStep(null);
        setActiveDateField(null);
      }
    } else {
      // iOS: single datetime spinner
      if (activeDateField === 'start') setStartDate(selected);
      else setEndDate(selected);
    }
  };

  const handleIOSDone = () => {
    setDatePickerStep(null);
    setActiveDateField(null);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!title.trim()) { setError('Event title is required.'); return; }
    if (!userId) { setError('You must be logged in.'); return; }

    setIsLoading(true);
    setError(null);

    try {
      const id = generateId();
      const now = new Date().toISOString();

      await powerSync.execute(
        `INSERT INTO CalendarEvent
          (id, title, description, startDate, endDate, allDay, location, color, subjectId, userId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          title.trim(),
          description.trim() || null,
          allDay ? startDate.toISOString().split('T')[0] : startDate.toISOString(),
          endDate ? (allDay ? endDate.toISOString().split('T')[0] : endDate.toISOString()) : null,
          allDay ? 1 : 0,
          location.trim() || null,
          selectedColor,
          selectedSubjectId,
          userId,
          now,
          now,
        ]
      );

      handleClose();
    } catch (err: any) {
      console.error('[AddEvent] SQLite insert failed:', err);
      setError('Failed to add event. Please try again.');
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
          <Text style={styles.headerTitle}>New Event</Text>
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
            {Platform.OS === 'android' && activeDateField === 'start' && datePickerStep !== null && (
              <DateTimePicker
                value={startDate}
                mode={datePickerStep}
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* End Date (only show if not all-day or explicitly wanted) */}
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
            {Platform.OS === 'android' && activeDateField === 'end' && datePickerStep !== null && (
              <DateTimePicker
                value={endDate ?? startDate}
                mode={datePickerStep}
                display="default"
                onChange={handleDateChange}
              />
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

          {/* Color Picker */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              <ColorPicker
                style={{ width: '100%', gap: 12 }}
                value={selectedColor}
                onComplete={(colors) => setSelectedColor(colors.hex)}
              >
                <Panel1 style={{ height: 120, borderRadius: 8 }} />
                <HueSlider style={{ borderRadius: 8, height: 20 }} />
                <Swatches style={{ marginTop: 8 }} colors={PRESET_COLORS} />
              </ColorPicker>
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

          <Button style={styles.addButton} onPress={handleAdd} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text>Add Event</Text>}
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
  inputInline: {
    flex: 1,
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
  // Color picker
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },
  // iOS picker
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
  addButton: { marginTop: 8, backgroundColor: '#6C8EFF' },
});
