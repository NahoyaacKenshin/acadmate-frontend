import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { X, Clock, Calendar } from 'lucide-react-native';
import {
  ParsedClassSchedule,
  ParsedCalendarEvent,
  ParsedExamWeek,
} from './ParsedItemRow';
import { useSubjects } from '@/src/hooks/useSubjects';
import { formatDateLocal } from '@/src/utils/scheduleUtils';

// ── Helpers ───────────────────────────────────────────────────────────────────

type PickerField = 'startTime' | 'endTime' | 'startDate' | 'endDate';
type Modality = 'F2F' | 'ONLINE' | 'HYBRID';
type SetType = 'A' | 'B' | 'BOTH' | null;

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

function toHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatTime12(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function dateFromHHMM(hhmm: string): Date {
  if (!hhmm) return new Date(2000, 0, 1, 8, 0, 0, 0);
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m, 0, 0);
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function toISODate(date: Date): string {
  return formatDateLocal(date);
}

// ── EditParsedClassSheet ──────────────────────────────────────────────────────

interface EditParsedClassSheetProps {
  visible: boolean;
  item: ParsedClassSchedule | null;
  onClose: () => void;
  onSave: (updated: ParsedClassSchedule) => void;
}

export function EditParsedClassSheet({ visible, item, onClose, onSave }: EditParsedClassSheetProps) {
  const { subjects } = useSubjects();
  
  const [subjectName, setSubjectName] = useState('');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [modality, setModality] = useState<Modality>('F2F');
  const [setType, setSetType] = useState<SetType>(null);
  const [room, setRoom] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [activePickerField, setActivePickerField] = useState<PickerField | null>(null);

  useEffect(() => {
    if (item) {
      setSubjectName(item.subjectName);
      setSelectedDay(item.dayOfWeek);
      setStartTime(item.startTime || '08:00');
      setEndTime(item.endTime || '09:30');
      setModality(item.modality || 'F2F');
      setSetType(item.setType || null);
      setRoom(item.room || '');
      setStartDate(item.startDate ? new Date(item.startDate) : new Date());
      setEndDate(item.endDate ? new Date(item.endDate) : null);
    }
  }, [item]);

  const handleClose = () => {
    setShowSubjectPicker(false);
    setActivePickerField(null);
    onClose();
  };

  const handleSave = () => {
    if (!item) return;
    onSave({
      ...item,
      subjectName,
      dayOfWeek: selectedDay,
      startTime,
      endTime,
      modality,
      setType,
      room,
      startDate: toISODate(startDate),
      endDate: endDate ? toISODate(endDate) : null,
    });
    handleClose();
  };

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
            else if (field === 'endTime') setEndTime(hhmm);
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

  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheetContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Parsed Class</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <X size={24} color="#94A3B8" />
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
          {/* Subject Name (Free Text since it might not be resolved yet) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Subject Name</Text>
            <TextInput
              style={styles.input}
              value={subjectName}
              onChangeText={setSubjectName}
              placeholder="e.g. Mathematics 101"
              placeholderTextColor="#64748B"
            />
          </View>

          {/* Day of Week */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Day of Week</Text>
            <View style={styles.pillRow}>
              {DAYS.map((d) => (
                <Pressable key={d.value} style={[styles.pill, selectedDay === d.value && styles.pillSelected]} onPress={() => setSelectedDay(d.value)}>
                  <Text style={[styles.pillText, selectedDay === d.value && styles.pillTextSelected]}>{d.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Time Fields */}
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

          {/* Date Fields */}
          <View style={[styles.formGroup, styles.timeRow]}>
            <View style={styles.timeField}>
              <Text style={styles.label}>Start Date</Text>
              <Pressable style={styles.picker} onPress={() => openPicker('startDate')}>
                <Text style={styles.pickerText}>{formatDate(startDate)}</Text>
                <Calendar size={14} color="#94A3B8" />
              </Pressable>
            </View>
            <View style={styles.timeSeparator}><Text style={styles.timeSeparatorText}>—</Text></View>
            <View style={styles.timeField}>
              <Text style={styles.label}>End Date</Text>
              <Pressable style={styles.picker} onPress={() => openPicker('endDate')}>
                <Text style={endDate ? styles.pickerText : styles.pickerPlaceholder}>
                  {endDate ? formatDate(endDate) : 'Optional'}
                </Text>
                <Calendar size={14} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          {/* iOS Pickers */}
          {Platform.OS === 'ios' && activePickerField && (
            <View style={styles.iosPickerWrapper}>
              <DateTimePicker
                value={activePickerField === 'startTime' || activePickerField === 'endTime' ? dateFromHHMM(activePickerField === 'startTime' ? startTime : endTime) : (activePickerField === 'startDate' ? startDate : (endDate ?? startDate))}
                mode={activePickerField.includes('Time') ? 'time' : 'date'}
                display="spinner"
                onChange={activePickerField.includes('Time') ? handleTimeChange : handleDateChange}
                textColor="#ffffff"
                themeVariant="dark"
                style={styles.iosPicker}
              />
              <Pressable style={styles.iosDoneBtn} onPress={() => setActivePickerField(null)}>
                <Text style={styles.iosDoneBtnText}>Done</Text>
              </Pressable>
            </View>
          )}

          {/* Modality & Room */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Modality</Text>
            <View style={styles.pillRow}>
              {MODALITIES.map((m) => (
                <Pressable key={m.value} style={[styles.pill, styles.pillWide, modality === m.value && styles.pillSelected]} onPress={() => setModality(m.value)}>
                  <Text style={[styles.pillText, modality === m.value && styles.pillTextSelected]}>{m.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Schedule Set */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Schedule Set</Text>
            <View style={styles.pillRow}>
              {[
                { label: 'Every Week', value: 'BOTH' },
                { label: 'Set A', value: 'A' },
                { label: 'Set B', value: 'B' },
              ].map((s) => (
                <Pressable
                  key={s.value}
                  style={[styles.pill, styles.pillWide, (setType === s.value || (s.value === 'BOTH' && setType === null)) && styles.pillSelected]}
                  onPress={() => setSetType(s.value as any)}
                >
                  <Text style={[styles.pillText, (setType === s.value || (s.value === 'BOTH' && setType === null)) && styles.pillTextSelected]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Room / Location</Text>
            <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#94A3B8" value={room} onChangeText={setRoom} />
          </View>

          <Button style={styles.saveButton} onPress={handleSave}>
            <Text>Save Changes</Text>
          </Button>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── EditParsedEventSheet ──────────────────────────────────────────────────────

interface EditParsedEventSheetProps {
  visible: boolean;
  item: ParsedCalendarEvent | null;
  onClose: () => void;
  onSave: (updated: ParsedCalendarEvent) => void;
}

export function EditParsedEventSheet({ visible, item, onClose, onSave }: EditParsedEventSheetProps) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  const [activePickerField, setActivePickerField] = useState<'startDate' | 'endDate' | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setLocation(item.location || '');
      setStartDate(item.startDate ? new Date(item.startDate) : new Date());
      setEndDate(item.endDate ? new Date(item.endDate) : null);
    }
  }, [item]);

  const handleClose = () => {
    setActivePickerField(null);
    onClose();
  };

  const handleSave = () => {
    if (!item) return;
    onSave({
      ...item,
      title,
      location,
      startDate: toISODate(startDate),
      endDate: endDate ? toISODate(endDate) : null,
    });
    handleClose();
  };

  const openPicker = (field: 'startDate' | 'endDate') => {
    if (Platform.OS === 'android') {
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
    } else {
      setActivePickerField(field);
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    if (activePickerField === 'startDate') setStartDate(selected);
    else if (activePickerField === 'endDate') setEndDate(selected);
  };

  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheetContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Parsed Event</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <X size={24} color="#94A3B8" />
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Event Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Independence Day" placeholderTextColor="#64748B" />
          </View>
          
          <View style={[styles.formGroup, styles.timeRow]}>
            <View style={styles.timeField}>
              <Text style={styles.label}>Start Date</Text>
              <Pressable style={styles.picker} onPress={() => openPicker('startDate')}>
                <Text style={styles.pickerText}>{formatDate(startDate)}</Text>
                <Calendar size={14} color="#94A3B8" />
              </Pressable>
            </View>
            <View style={styles.timeSeparator}><Text style={styles.timeSeparatorText}>—</Text></View>
            <View style={styles.timeField}>
              <Text style={styles.label}>End Date</Text>
              <Pressable style={styles.picker} onPress={() => openPicker('endDate')}>
                <Text style={endDate ? styles.pickerText : styles.pickerPlaceholder}>
                  {endDate ? formatDate(endDate) : 'Optional'}
                </Text>
                <Calendar size={14} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          {Platform.OS === 'ios' && activePickerField && (
            <View style={styles.iosPickerWrapper}>
              <DateTimePicker
                value={activePickerField === 'startDate' ? startDate : (endDate ?? startDate)}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                textColor="#ffffff"
                themeVariant="dark"
                style={styles.iosPicker}
              />
              <Pressable style={styles.iosDoneBtn} onPress={() => setActivePickerField(null)}>
                <Text style={styles.iosDoneBtnText}>Done</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#94A3B8" value={location} onChangeText={setLocation} />
          </View>

          <Button style={styles.saveButton} onPress={handleSave}>
            <Text>Save Changes</Text>
          </Button>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── EditParsedExamSheet ───────────────────────────────────────────────────────

interface EditParsedExamSheetProps {
  visible: boolean;
  item: ParsedExamWeek | null;
  examWeeks: import('@/src/hooks/useExamWeeks').ExamWeekRow[];
  onClose: () => void;
  onSave: (updated: ParsedExamWeek) => void;
}

/** Extract HH:MM from a Date object */
function toHHMMFromDate(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Combine a Date (date part) + HH:MM string (time part) into a single Date */
function combineDateAndTime(date: Date, hhmm: string): Date {
  const result = new Date(date);
  const [h, m] = hhmm.split(':').map(Number);
  result.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
  return result;
}

/** Convert Date to full ISO-8601 datetime string */
function toISODateTime(d: Date): string {
  return d.toISOString();
}

/** Find the matching date-of-week within an ExamWeek block */
function resolveFromBlock(dayOfWeek: number, blockId: string, blocks: import('@/src/hooks/useExamWeeks').ExamWeekRow[]): string | null {
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return null;
  const start = new Date(block.startDate);
  const end = new Date(block.endDate);
  const cur = new Date(start);
  while (cur <= end) {
    if (cur.getDay() === dayOfWeek) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return null;
}

type ExamPickerField = 'startDate' | 'endDate' | 'startTime' | 'endTime';

export function EditParsedExamSheet({ visible, item, examWeeks, onClose, onSave }: EditParsedExamSheetProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [activePickerField, setActivePickerField] = useState<ExamPickerField | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      const sd = item.startDate ? new Date(item.startDate) : new Date();
      const ed = item.endDate ? new Date(item.endDate) : sd;
      setStartDate(sd);
      setEndDate(ed);
      setStartTime(toHHMMFromDate(sd));
      setEndTime(toHHMMFromDate(ed));
      setSelectedBlockId(item.resolvedFromExamWeekId ?? null);
    }
  }, [item]);

  // When user switches the exam week block, re-resolve the date using the stored dayOfWeek
  const handleBlockSelect = (blockId: string) => {
    setSelectedBlockId(blockId);
    if (item?.dayOfWeek != null) {
      const datePart = resolveFromBlock(item.dayOfWeek, blockId, examWeeks);
      if (datePart) {
        const sd = new Date(`${datePart}T00:00:00`);
        const [sh, sm] = startTime.split(':').map(Number);
        sd.setHours(sh, sm, 0, 0);
        const ed = new Date(`${datePart}T00:00:00`);
        const [eh, em] = endTime.split(':').map(Number);
        ed.setHours(eh, em, 0, 0);
        setStartDate(sd);
        setEndDate(ed);
      }
    }
  };

  const handleClose = () => {
    setActivePickerField(null);
    onClose();
  };

  const handleSave = () => {
    if (!item) return;
    const finalStart = combineDateAndTime(startDate, startTime);
    const finalEnd = combineDateAndTime(endDate, endTime);
    onSave({
      ...item,
      title,
      startDate: toISODateTime(finalStart),
      endDate: toISODateTime(finalEnd),
      resolvedFromExamWeekId: selectedBlockId,
    });
    handleClose();
  };

  const openPicker = (field: PickerField) => {
    if (Platform.OS === 'android') {
      if (field === 'startTime' || field === 'endTime') {
        const val = dateFromHHMM(field === 'startTime' ? startTime : endTime);
        DateTimePickerAndroid.open({
          value: val,
          mode: 'time',
          is24Hour: false,
          onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
            if (event.type === 'dismissed' || !selectedDate) return;
            const hhmm = toHHMMFromDate(selectedDate);
            if (field === 'startTime') setStartTime(hhmm);
            else setEndTime(hhmm);
          },
        });
      } else {
        const val = field === 'startDate' ? startDate : endDate;
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

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    if (activePickerField === 'startDate') setStartDate(selected);
    else if (activePickerField === 'endDate') setEndDate(selected);
  };

  const handleTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    const hhmm = toHHMMFromDate(selected);
    if (activePickerField === 'startTime') setStartTime(hhmm);
    else if (activePickerField === 'endTime') setEndTime(hhmm);
  };

  const isTimePicker = activePickerField === 'startTime' || activePickerField === 'endTime';
  const isDatePicker = activePickerField === 'startDate' || activePickerField === 'endDate';

  const currentPickerValue = () => {
    if (activePickerField === 'startTime') return dateFromHHMM(startTime);
    if (activePickerField === 'endTime') return dateFromHHMM(endTime);
    if (activePickerField === 'startDate') return startDate;
    return endDate;
  };

  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheetContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Exam Schedule</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <X size={24} color="#94A3B8" />
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Exam Title / Subject</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. IT101 Midterm Exam" placeholderTextColor="#64748B" />
          </View>

          {/* Exam Week Block selector — only shown for students with day-of-week based exams */}
          {item.dayOfWeek != null && examWeeks.length > 0 && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Exam Period</Text>
              <Text style={[styles.label, { fontSize: 11, marginBottom: 10, marginTop: -4 }]}>
                This exam has no specific date — select which period it belongs to
              </Text>
              <View style={styles.pillRow}>
                {examWeeks.map((ew) => {
                  const isSelected = selectedBlockId === ew.id;
                  return (
                    <Pressable
                      key={ew.id}
                      style={[styles.pill, styles.pillWide, isSelected && styles.pillSelected]}
                      onPress={() => handleBlockSelect(ew.id)}
                    >
                      <Text style={[styles.pillText, isSelected && styles.pillTextSelected]} numberOfLines={1}>
                        {ew.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Date row */}
          <View style={[styles.formGroup, styles.timeRow]}>
            <View style={styles.timeField}>
              <Text style={styles.label}>Exam Date</Text>
              <Pressable style={styles.picker} onPress={() => openPicker('startDate')}>
                <Text style={styles.pickerText}>{formatDate(startDate)}</Text>
                <Calendar size={14} color="#94A3B8" />
              </Pressable>
            </View>
            <View style={styles.timeSeparator}><Text style={styles.timeSeparatorText}>—</Text></View>
            <View style={styles.timeField}>
              <Text style={styles.label}>End Date</Text>
              <Pressable style={styles.picker} onPress={() => openPicker('endDate')}>
                <Text style={styles.pickerText}>{formatDate(endDate)}</Text>
                <Calendar size={14} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          {/* Time row */}
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

          {/* iOS picker */}
          {Platform.OS === 'ios' && activePickerField && (
            <View style={styles.iosPickerWrapper}>
              <DateTimePicker
                value={currentPickerValue()}
                mode={isTimePicker ? 'time' : 'date'}
                display="spinner"
                onChange={isTimePicker ? handleTimeChange : handleDateChange}
                textColor="#ffffff"
                themeVariant="dark"
                style={styles.iosPicker}
              />
              <Pressable style={styles.iosDoneBtn} onPress={() => setActivePickerField(null)}>
                <Text style={styles.iosDoneBtnText}>Done</Text>
              </Pressable>
            </View>
          )}

          <Button style={styles.saveButton} onPress={handleSave}>
            <Text>Save Changes</Text>
          </Button>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Shared Styles ───────────────────────────────────────────────────────────────

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
  closeBtn: { padding: 4 },
  formContainer: { paddingBottom: 8 },
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


