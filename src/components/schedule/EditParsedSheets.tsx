import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { X, Clock, Calendar, RotateCcw, GraduationCap, CalendarDays, AlertTriangle, BookOpen, CalendarCheck } from 'lucide-react-native';
import {
  ParsedClassSchedule,
  ParsedCalendarEvent,
  ParsedExamWeek,
  ParsedExamWeekBlocker,
  ParsedExamEvent,
} from './ParsedItemRow';
import { useSubjects } from '@/src/hooks/useSubjects';
import { formatDateLocal, toPhilippineISO, getPeriodCategory, getCleanPeriodTitle } from '@/src/utils/scheduleUtils';

// ── Helpers ───────────────────────────────────────────────────────────────────

type PickerField = 'startTime' | 'endTime' | 'startDate' | 'endDate';
type Modality = 'F2F' | 'ONLINE';
type SetType = 'A' | 'B' | null;

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

function formatDate(date: Date | string | undefined | null): string {
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
  const [selectedDays, setSelectedDays] = useState<number[]>([1]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [modality, setModality] = useState<Modality>('F2F');
  const [setType, setSetType] = useState<SetType>(null);
  const [room, setRoom] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const [activePickerField, setActivePickerField] = useState<PickerField | null>(null);

  useEffect(() => {
    if (item) {
      setSubjectName(item.subjectName || '');
      let days = [item.dayOfWeek];
      if (item.daysOfWeek && item.daysOfWeek.length > 0) {
        days = item.daysOfWeek;
      }
      setSelectedDays(days);
      setStartTime(item.startTime || '08:00');
      setEndTime(item.endTime || '09:30');
      setModality(item.modality === 'ONLINE' ? 'ONLINE' : 'F2F');
      const st = item.setType === 'A' ? 'A' : item.setType === 'B' ? 'B' : null;
      setSetType(st);
      setRoom(item.room || '');
      setStartDate(item.startDate ? new Date(item.startDate) : new Date());
      const parsedEnd = item.endDate ? new Date(item.endDate) : null;
      setEndDate(parsedEnd ?? (item.startDate ? new Date(item.startDate) : new Date()));
    }
  }, [item]);

  const handleClose = () => {
    setActivePickerField(null);
    onClose();
  };

  const handleSave = () => {
    if (!item) return;
    if (!endDate) return;
    onSave({
      ...item,
      subjectName,
      dayOfWeek: selectedDays[0] ?? 1,
      daysOfWeek: selectedDays,
      startTime,
      endTime,
      modality,
      setType,
      room: room.trim() || null,
      startDate: toISODate(startDate),
      endDate: endDate ? toISODate(endDate) : null,
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
            const hhmm = toHHMM(selectedDate);
            if (field === 'startTime') setStartTime(hhmm);
            else if (field === 'endTime') setEndTime(hhmm);
          },
        });
      } else {
        if (field === 'endDate' && !startDate) return;
        const val = field === 'startDate' ? startDate : (endDate ?? startDate);
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

  const handleTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    const hhmm = toHHMM(selected);
    if (activePickerField === 'startTime') setStartTime(hhmm);
    else if (activePickerField === 'endTime') setEndTime(hhmm);
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    if (activePickerField === 'startDate') {
      setStartDate(selected);
      if (endDate && endDate < selected) setEndDate(selected);
    } else if (activePickerField === 'endDate') {
      const safeEnd = startDate && selected < startDate ? startDate : selected;
      setEndDate(safeEnd);
    }
  };

  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoid}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerBadge}>
                <BookOpen size={16} color="#6C8EFF" />
              </View>
              <Text style={styles.headerTitle}>Edit Parsed Class</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color="#94A3B8" />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
          {/* Subject Name */}
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

          {/* Days of Week */}
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
                    <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>{d.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Date Fields — side by side */}
          <View style={[styles.formGroup, styles.timeRow]}>
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

          {/* Time Fields */}
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

          {/* iOS Pickers */}
          {Platform.OS === 'ios' && activePickerField && (
            <View style={styles.iosPickerWrapper}>
              <DateTimePicker
                value={
                  activePickerField === 'startTime' || activePickerField === 'endTime'
                    ? dateFromHHMM(activePickerField === 'startTime' ? startTime : endTime)
                    : activePickerField === 'startDate'
                      ? startDate
                      : (endDate && endDate >= startDate ? endDate : startDate)
                }
                mode={activePickerField.includes('Time') ? 'time' : 'date'}
                minimumDate={activePickerField === 'endDate' ? startDate : undefined}
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

          {/* Modality */}
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
              {SET_OPTIONS.map((opt) => (
                <Pressable
                  key={String(opt.value)}
                  style={[styles.pill, styles.pillWide, setType === opt.value && styles.pillSelected]}
                  onPress={() => setSetType(opt.value)}
                >
                  <Text style={[styles.pillText, setType === opt.value && styles.pillTextSelected]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Room / Location (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder={setType ? `e.g. Room for Set ${setType}` : 'e.g. Room 416, Tech Hall'}
              placeholderTextColor="#94A3B8"
              value={room}
              onChangeText={setRoom}
            />
          </View>

          <Button style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </Button>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  const [endDate, setEndDate] = useState<Date>(new Date());

  const [activePickerField, setActivePickerField] = useState<'startDate' | 'endDate' | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setLocation(item.location || '');
      setStartDate(item.startDate ? new Date(item.startDate) : new Date());
      const parsedEnd = item.endDate ? new Date(item.endDate) : null;
      setEndDate(parsedEnd ?? (item.startDate ? new Date(item.startDate) : new Date()));
    }
  }, [item]);

  const handleClose = () => {
    setActivePickerField(null);
    onClose();
  };

  const handleSave = () => {
    if (!item) return;
    if (!endDate) return;
    onSave({
      ...item,
      title,
      location: location.trim() || null,
      startDate: toISODate(startDate),
      endDate: endDate ? toISODate(endDate) : null,
    });
    handleClose();
  };

  const openPicker = (field: 'startDate' | 'endDate') => {
    if (field === 'endDate' && !startDate) return;
    if (Platform.OS === 'android') {
      const val = field === 'startDate' ? startDate : (endDate ?? startDate);
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
    } else {
      setActivePickerField(field);
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    if (activePickerField === 'startDate') {
      setStartDate(selected);
      if (endDate && endDate < selected) setEndDate(selected);
    } else if (activePickerField === 'endDate') {
      const safeEnd = startDate && selected < startDate ? startDate : selected;
      setEndDate(safeEnd);
    }
  };

  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoid}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerBadge}>
                <CalendarCheck size={16} color="#6C8EFF" />
              </View>
              <Text style={styles.headerTitle}>Edit Parsed Event</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color="#94A3B8" />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Event Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Independence Day" placeholderTextColor="#64748B" />
          </View>

          <View style={[styles.formGroup, styles.timeRow]}>
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

          {Platform.OS === 'ios' && activePickerField && (
            <View style={styles.iosPickerWrapper}>
              <DateTimePicker
                value={
                  activePickerField === 'startDate'
                    ? startDate
                    : (endDate && endDate >= startDate ? endDate : startDate)
                }
                mode="date"
                minimumDate={activePickerField === 'endDate' ? startDate : undefined}
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
            <Text style={styles.label}>Location (Optional)</Text>
            <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#94A3B8" value={location} onChangeText={setLocation} />
          </View>

          <Button style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </Button>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── EditParsedBlockerSheet ───────────────────────────────────────────────────

export interface EditParsedBlockerSheetProps {
  visible: boolean;
  item: ParsedExamWeekBlocker | null;
  onClose: () => void;
  onSave: (updated: ParsedExamWeekBlocker) => void;
}

export function EditParsedBlockerSheet({ visible, item, onClose, onSave }: EditParsedBlockerSheetProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'EXAM' | 'HOLIDAY' | 'SUSPENSION'>('EXAM');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [activePickerField, setActivePickerField] = useState<'startDate' | 'endDate' | null>(null);

  useEffect(() => {
    if (item) {
      setCategory(getPeriodCategory(item));
      setTitle(getCleanPeriodTitle(item.title));
      setStartDate(item.startDate ? new Date(item.startDate) : new Date());
      setEndDate(item.endDate ? new Date(item.endDate) : (item.startDate ? new Date(item.startDate) : new Date()));
    }
  }, [item]);

  const handleClose = () => {
    setActivePickerField(null);
    onClose();
  };

  const handleSave = () => {
    if (!item) return;
    const clean = title.trim() || getCleanPeriodTitle(item.title) || 'Blocker';
    const tag = category === 'EXAM' ? '🎓 ' : category === 'HOLIDAY' ? '🏖️ ' : '⚠️ ';
    onSave({
      ...item,
      title: `${tag}${clean}`,
      startDate: toISODate(startDate),
      endDate: toISODate(endDate),
    });
    handleClose();
  };

  const openPicker = (field: 'startDate' | 'endDate') => {
    if (field === 'endDate' && !startDate) return;
    if (Platform.OS === 'android') {
      const val = field === 'startDate' ? startDate : endDate;
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
    } else {
      setActivePickerField(field);
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    if (activePickerField === 'startDate') {
      setStartDate(selected);
      if (endDate && endDate < selected) setEndDate(selected);
    } else if (activePickerField === 'endDate') {
      const safeEnd = startDate && selected < startDate ? startDate : selected;
      setEndDate(safeEnd);
    }
  };

  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoid}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerBadge, { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.35)' }]}>
                <AlertTriangle size={16} color="#F59E0B" />
              </View>
              <Text style={styles.headerTitle}>Edit Calendar Blocker</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color="#94A3B8" />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
          {/* Category Selector */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Blocker Type</Text>
            <View style={styles.pillRow}>
              <Pressable
                style={[
                  styles.pill,
                  styles.pillWide,
                  category === 'EXAM' && { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B' },
                ]}
                onPress={() => setCategory('EXAM')}
              >
                <Text style={[styles.pillText, category === 'EXAM' && { color: '#F59E0B' }]}>
                  🎓 Exam Week
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pill,
                  styles.pillWide,
                  category === 'HOLIDAY' && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' },
                ]}
                onPress={() => setCategory('HOLIDAY')}
              >
                <Text style={[styles.pillText, category === 'HOLIDAY' && { color: '#10B981' }]}>
                  🏖️ Holiday
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pill,
                  styles.pillWide,
                  category === 'SUSPENSION' && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444' },
                ]}
                onPress={() => setCategory('SUSPENSION')}
              >
                <Text style={[styles.pillText, category === 'SUSPENSION' && { color: '#EF4444' }]}>
                  ⚠️ Suspension
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Blocker Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Midterm Exam Week"
              placeholderTextColor="#64748B"
            />
          </View>

          {/* Dates row */}
          <View style={[styles.formGroup, styles.timeRow]}>
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
            <View style={styles.timeField}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>End Date</Text>
              </View>
              <Pressable
                style={[styles.picker, !startDate && styles.pickerDisabled]}
                onPress={() => openPicker('endDate')}
                disabled={!startDate}
              >
                <Text style={endDate ? styles.pickerText : styles.pickerPlaceholder}>
                  {!startDate ? 'Select start date first' : endDate ? formatDate(endDate) : 'Select end date...'}
                </Text>
                <Calendar size={14} color={!startDate ? '#475569' : '#94A3B8'} />
              </Pressable>
            </View>
          </View>

          {/* iOS picker */}
          {Platform.OS === 'ios' && activePickerField && (
            <View style={styles.iosPickerWrapper}>
              <DateTimePicker
                value={
                  activePickerField === 'startDate'
                    ? startDate
                    : (endDate && endDate >= startDate ? endDate : startDate)
                }
                mode="date"
                minimumDate={activePickerField === 'endDate' ? startDate : undefined}
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

          <Button style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </Button>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── EditParsedExamSheet ───────────────────────────────────────────────────────

export interface EditParsedExamSheetProps {
  visible: boolean;
  item: ParsedExamEvent | null;
  examWeeks?: import('@/src/hooks/useExamWeeks').ExamWeekRow[];
  onClose: () => void;
  onSave: (updated: ParsedExamEvent) => void;
}

function toHHMMFromDate(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function combineDateAndTime(date: Date, hhmm: string): Date {
  const result = new Date(date);
  const [h, m] = hhmm.split(':').map(Number);
  result.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
  return result;
}

function toISODateTime(d: Date): string {
  return toPhilippineISO(d);
}

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

export function EditParsedExamSheet({ visible, item, examWeeks = [], onClose, onSave }: EditParsedExamSheetProps) {
  const [title, setTitle] = useState('');
  const [room, setRoom] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [activePickerField, setActivePickerField] = useState<ExamPickerField | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setRoom(item.room || '');
      const sd = item.startDate ? new Date(item.startDate) : new Date();
      const ed = item.endDate ? new Date(item.endDate) : sd;
      setStartDate(sd);
      setEndDate(ed);
      if (item.startTime) {
        setStartTime(item.startTime);
      } else if (item.startDate) {
        setStartTime(toHHMMFromDate(sd));
      }
      if (item.endTime) {
        setEndTime(item.endTime);
      } else if (item.endDate) {
        setEndTime(toHHMMFromDate(ed));
      }
    }
  }, [item]);

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
      title: title.trim() || item.title,
      room: room.trim() || null,
      startDate: toISODateTime(finalStart),
      endDate: toISODateTime(finalEnd),
      startTime,
      endTime,
    });
    handleClose();
  };

  const openPicker = (field: ExamPickerField) => {
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
        if (field === 'endDate' && !startDate) return;
        const val = field === 'startDate' ? startDate : endDate;
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

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    if (activePickerField === 'startDate') {
      setStartDate(selected);
      if (endDate && endDate < selected) setEndDate(selected);
    } else if (activePickerField === 'endDate') {
      const safeEnd = startDate && selected < startDate ? startDate : selected;
      setEndDate(safeEnd);
    }
  };

  const handleTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    const hhmm = toHHMMFromDate(selected);
    if (activePickerField === 'startTime') setStartTime(hhmm);
    else if (activePickerField === 'endTime') setEndTime(hhmm);
  };

  const isTimePicker = activePickerField === 'startTime' || activePickerField === 'endTime';

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
      <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoid}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerBadge, { backgroundColor: 'rgba(139,92,246,0.18)', borderColor: 'rgba(139,92,246,0.35)' }]}>
                <GraduationCap size={16} color="#8B5CF6" />
              </View>
              <Text style={styles.headerTitle}>Edit Exam Schedule</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color="#94A3B8" />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Exam Title / Subject</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. IT101 Midterm Exam" placeholderTextColor="#64748B" />
          </View>

          {/* Room */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Room / Location (Optional)</Text>
            <TextInput style={styles.input} value={room} onChangeText={setRoom} placeholder="e.g. Room 402 / Online" placeholderTextColor="#64748B" />
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
              <View style={styles.labelRow}>
                <Text style={styles.label}>Exam Date</Text>
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
            <View style={styles.timeField}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>End Date</Text>
              </View>
              <Pressable
                style={[styles.picker, !startDate && styles.pickerDisabled]}
                onPress={() => openPicker('endDate')}
                disabled={!startDate}
              >
                <Text style={endDate ? styles.pickerText : styles.pickerPlaceholder}>
                  {!startDate ? 'Select start date first' : endDate ? formatDate(endDate) : 'Select end date...'}
                </Text>
                <Calendar size={14} color={!startDate ? '#475569' : '#94A3B8'} />
              </Pressable>
            </View>
          </View>

          {/* Time row */}
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
                {endTime !== '10:00' && (
                  <Pressable
                    onPress={() => setEndTime('10:00')}
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

          {/* iOS picker */}
          {Platform.OS === 'ios' && activePickerField && (
            <View style={styles.iosPickerWrapper}>
              <DateTimePicker
                value={currentPickerValue()}
                mode={isTimePicker ? 'time' : 'date'}
                minimumDate={activePickerField === 'endDate' ? startDate : undefined}
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
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </Button>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Shared Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
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
  formGroup: { marginBottom: 18 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
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
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#ffffff',
    fontSize: 14,
  },
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
  pickerText: { color: '#ffffff', fontSize: 14, flex: 1 },
  pickerPlaceholder: { color: '#64748B', fontSize: 14, flex: 1 },
  pickerDisabled: {
    opacity: 0.45,
    backgroundColor: '#0F131D',
    borderColor: '#1E2433',
  },
  iosPickerWrapper: {
    marginTop: -10,
    marginBottom: 12,
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 10,
    overflow: 'hidden',
  },
  iosPicker: { height: 150 },
  iosDoneBtn: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#2A3143',
  },
  iosDoneBtnText: { color: '#6C8EFF', fontSize: 14, fontWeight: '600' },
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
});
