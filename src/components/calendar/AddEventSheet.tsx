import React, { useState, useMemo } from 'react';
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
  KeyboardAvoidingView,
  Text,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Button } from '../ui/button';
import { X, ChevronDown, Calendar, MapPin, Clock, RotateCcw, AlertCircle } from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { formatDateLocal, toPhilippineISO } from '@/src/utils/scheduleUtils';
import { useTheme } from '@/src/theme/useTheme';
import type { ThemeColors } from '@/src/theme/tokens';

interface AddEventSheetProps {
  visible: boolean;
  initialDate?: Date; // Pre-fill start date from selected day
  isExamMode?: boolean; // When true, customizes labels and color for Exam
  onClose: () => void;
}

type DateField = 'start' | 'end';
type DatePickerStep = 'date' | 'time' | null;

const PRESET_COLORS = [
  '#6366F1', // indigo
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#14B8A6', // teal
  '#3B82F6', // blue
  '#F97316', // orange
];

function formatDateTime(date: Date | null): string {
  if (!date) return '';
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

export function AddEventSheet({ visible, initialDate, isExamMode, onClose }: AddEventSheetProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState(isExamMode ? 'Exam Schedule' : '');
  const [startDate, setStartDate] = useState<Date>(initialDate ?? new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [allTime, setAllTime] = useState(false);
  const [location, setLocation] = useState('');

  // Picker state
  const [activeDateField, setActiveDateField] = useState<DateField | null>(null);
  const [datePickerStep, setDatePickerStep] = useState<DatePickerStep>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setDescription(isExamMode ? 'Exam Schedule' : '');
    setStartDate(initialDate ?? new Date());
    setEndDate(null);
    setAllTime(false);
    setLocation('');
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
    if (field === 'end' && !startDate) return;

    if (Platform.OS === 'android') {
      const baseDate = field === 'start' ? (startDate ?? new Date()) : (endDate ?? startDate ?? new Date());
      DateTimePickerAndroid.open({
        value: baseDate,
        mode: 'date',
        minimumDate: field === 'end' ? (startDate ?? new Date()) : new Date(),
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
                if (field === 'start') {
                  setStartDate(merged);
                  if (endDate && endDate < merged) setEndDate(merged);
                } else {
                  const safeEnd = startDate && merged < startDate ? startDate : merged;
                  setEndDate(safeEnd);
                }
                return;
              }
              const finalDate = new Date(merged);
              finalDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
              if (field === 'start') {
                setStartDate(finalDate);
                if (endDate && endDate < finalDate) setEndDate(finalDate);
              } else {
                const safeEnd = startDate && finalDate < startDate ? startDate : finalDate;
                setEndDate(safeEnd);
              }
            },
          });
        },
      });
    } else {
      setActiveDateField(field);
      setDatePickerStep('date');
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) {
      if (activeDateField === 'start') {
        setStartDate(selected);
        if (endDate && endDate < selected) setEndDate(selected);
      } else {
        const safeEnd = startDate && selected < startDate ? startDate : selected;
        setEndDate(safeEnd);
      }
    }
  };

  const handleIOSDone = () => {
    setDatePickerStep(null);
    setActiveDateField(null);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!title.trim()) {
      setError(isExamMode ? 'Please enter an exam title.' : 'Please enter an event title.');
      return;
    }
    if (!userId) {
      setError('You must be logged in.');
      return;
    }
    if (!startDate) {
      setError('Please select a start date and time.');
      return;
    }
    if (!allTime && endDate && endDate < startDate) {
      setError('End date/time must be after start date/time.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const id = generateId();
      const now = toPhilippineISO(new Date());
      const startISO = toPhilippineISO(startDate);
      const endISO = !allTime && endDate ? toPhilippineISO(endDate) : null;
      const isAllTimeVal = allTime ? 1 : 0;

      const eventColor = isExamMode ? '#F59E0B' : '#6366F1';

      await powerSync.execute(
        `INSERT INTO CalendarEvent
          (id, title, description, startDate, endDate, allDay, location, color, subjectId, userId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          title.trim(),
          description.trim() || null,
          startISO,
          endISO,
          isAllTimeVal,
          location.trim() || null,
          eventColor,
          null,
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

      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoid}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerBadge}>
                <Calendar size={16} color="#6C8EFF" />
              </View>
              <Text style={styles.headerTitle}>{isExamMode ? 'New Exam' : 'New Event'}</Text>
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

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContainer}
          >

            {/* Title */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{isExamMode ? 'Exam Title *' : 'Event Title *'}</Text>
              <TextInput
                style={styles.input}
                placeholder={isExamMode ? "e.g. Midterm Examination" : "What's the event?"}
                placeholderTextColor={colors.mutedForeground}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Optional details..."
                placeholderTextColor={colors.mutedForeground}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* All Time toggle (Only for events, omitted for exams) */}
            {!isExamMode && (
              <View style={[styles.formGroup, styles.toggleRow]}>
                <View>
                  <Text style={styles.label}>All Time</Text>
                  <Text style={styles.sublabel}>Marks all dates starting from start date</Text>
                </View>
                <Switch
                  value={allTime}
                  onValueChange={(val) => {
                    setAllTime(val);
                    if (val) setEndDate(null);
                  }}
                  trackColor={{ false: '#2A3143', true: '#6C8EFF' }}
                  thumbColor="#ffffff"
                />
              </View>
            )}

            {/* Start Date */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Start Date & Time *</Text>
                <Pressable
                  onPress={() => {
                    const d = initialDate ?? new Date();
                    setStartDate(d);
                    if (endDate && endDate < d) setEndDate(d);
                  }}
                  style={styles.resetBtn}
                  hitSlop={8}
                >
                  <RotateCcw size={12} color="#94A3B8" />
                  <Text style={styles.resetBtnText}>Reset</Text>
                </Pressable>
              </View>
              <Pressable style={styles.picker} onPress={() => openDatePicker('start')}>
                <Text style={startDate ? styles.pickerText : styles.pickerPlaceholder}>
                  {startDate ? formatDateTime(startDate) : 'Select start date & time...'}
                </Text>
                <Calendar size={16} color="#94A3B8" />
              </Pressable>
              {Platform.OS === 'ios' && activeDateField === 'start' && datePickerStep !== null && (
                <View style={styles.iosPickerWrapper}>
                  <DateTimePicker
                    value={startDate ?? new Date()}
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

            {/* End Date (hidden if All Time is ON) */}
            {!allTime && (
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>End Date & Time (Optional)</Text>
                  {endDate && (
                    <Pressable
                      onPress={() => setEndDate(null)}
                      style={styles.resetBtn}
                      hitSlop={8}
                    >
                      <X size={12} color="#EF4444" />
                      <Text style={[styles.resetBtnText, { color: '#EF4444' }]}>Clear</Text>
                    </Pressable>
                  )}
                </View>
                <Pressable
                  style={[styles.picker, !startDate && styles.pickerDisabled]}
                  onPress={() => openDatePicker('end')}
                  disabled={!startDate}
                >
                  <Text style={endDate ? styles.pickerText : styles.pickerPlaceholder}>
                    {!startDate ? 'Select start date first' : endDate ? formatDateTime(endDate) : 'Select end time...'}
                  </Text>
                  <Clock size={16} color={!startDate ? '#475569' : '#94A3B8'} />
                </Pressable>
                {Platform.OS === 'ios' && activeDateField === 'end' && datePickerStep !== null && startDate && (
                  <View style={styles.iosPickerWrapper}>
                    <DateTimePicker
                      value={endDate && endDate >= startDate ? endDate : startDate}
                      mode="datetime"
                      minimumDate={startDate}
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
            )}

            {/* Location */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Location (Optional)</Text>
              <View style={styles.inputWithIcon}>
                <MapPin size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.inputInline}
                  placeholder="Room, building, or online link..."
                  placeholderTextColor={colors.mutedForeground}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </View>

            <Pressable
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleAdd}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>{isExamMode ? 'Add Exam' : 'Add Event'}</Text>
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
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      letterSpacing: -0.3,
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
    formGroup: { marginBottom: 16 },
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
    sublabel: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, includeFontPadding: false },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
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
    multiline: { minHeight: 80, textAlignVertical: 'top' },
    inputWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.background : colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    inputInline: {
      flex: 1,
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
    pickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerItemText: { color: colors.foreground, fontSize: 14, marginLeft: 8 },
    colorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 24,
    },
    colorSwatch: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    colorSwatchSelected: {
      borderWidth: 2,
      borderColor: colors.foreground,
      transform: [{ scale: 1.15 }],
    },
    iosPickerWrapper: {
      marginTop: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: 'hidden',
    },
    iosPicker: { height: 160 },
    iosDoneBtn: {
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    iosDoneBtnText: { color: '#6366F1', fontSize: 14, fontWeight: '600' },
    addButton: { marginTop: 8, backgroundColor: '#6366F1' },
  });
}

