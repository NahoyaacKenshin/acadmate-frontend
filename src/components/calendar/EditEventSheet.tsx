import React, { useState, useEffect, useMemo } from 'react';
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
  KeyboardAvoidingView,
  Text,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { X, ChevronDown, Calendar, MapPin, Clock, Trash2, RotateCcw, AlertCircle } from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import { toPhilippineISO, parseDateLocal, parseToPHTDate } from '@/src/utils/scheduleUtils';
import { isExamEvent } from '@/src/services/notificationService';
import { useTheme } from '@/src/theme/useTheme';
import type { ThemeColors } from '@/src/theme/tokens';

interface EditEventSheetProps {
  visible: boolean;
  event: CalendarEventRow | null;
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
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const powerSync = usePowerSync();

  const isExam =
    event?.color === '#F59E0B' ||
    Boolean(event?.description?.startsWith('🎓')) ||
    Boolean(event?.title?.startsWith('🎓')) ||
    Boolean(event?.description?.toLowerCase().includes('exam')) ||
    Boolean(event?.title?.toLowerCase().includes('exam')) ||
    (event ? isExamEvent(event) : false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [allTime, setAllTime] = useState(false);
  const [location, setLocation] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);
  const [activeDateField, setActiveDateField] = useState<DateField | null>(null);
  const [datePickerStep, setDatePickerStep] = useState<DatePickerStep>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when event changes without date drifting
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? '');
      const parsedStart = parseToPHTDate(event.start_date) ?? parseDateLocal(event.start_date) ?? new Date();
      const parsedEnd = event.end_date ? (parseToPHTDate(event.end_date) ?? parseDateLocal(event.end_date)) : null;
      setStartDate(parsedStart);
      setEndDate(parsedEnd);
      setAllTime(event.all_day === 1);
      setLocation(event.location ?? '');
      setSelectedColor(event.color ?? PRESET_COLORS[0]);
      setActiveDateField(null);
      setDatePickerStep(null);
      setError(null);
    }
  }, [event]);

  const handleClose = () => {
    setActiveDateField(null);
    setDatePickerStep(null);
    setError(null);
    onClose();
  };

  const openDatePicker = (field: DateField) => {
    if (field === 'end' && !startDate) return;

    if (Platform.OS === 'android') {
      const baseDate = field === 'start' ? startDate : (endDate ?? startDate);
      DateTimePickerAndroid.open({
        value: baseDate,
        mode: 'date',
        minimumDate: field === 'end' ? startDate : new Date(),
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

  const handleIOSDone = () => { setDatePickerStep(null); setActiveDateField(null); };

  const handleSave = async () => {
    if (!event) return;
    if (!title.trim()) {
      setError(isExam ? 'Exam title is required.' : 'Event title is required.');
      return;
    }
    if (!allTime && endDate && endDate < startDate) {
      setError('End date/time must be after start date/time.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const now = toPhilippineISO(new Date());
      const startISO = toPhilippineISO(startDate);
      const endISO = !allTime && endDate ? toPhilippineISO(endDate) : null;
      const isAllTimeVal = allTime ? 1 : 0;
      const finalColor = event.color ?? (isExam ? '#F59E0B' : '#6366F1');

      await powerSync.execute(
        `UPDATE CalendarEvent SET
          title = ?, description = ?, startDate = ?, endDate = ?,
          allDay = ?, location = ?, color = ?, subjectId = ?, updatedAt = ?
         WHERE id = ?`,
        [
          title.trim(),
          description.trim() || null,
          startISO,
          endISO,
          isAllTimeVal,
          location.trim() || null,
          finalColor,
          null,
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
      isExam ? 'Delete Exam' : 'Delete Event',
      `Are you sure you want to delete this ${isExam ? 'exam' : 'event'}? This cannot be undone.`,
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
              setError('Failed to delete.');
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

      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoid}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerBadge}>
                <Calendar size={16} color="#6366F1" />
              </View>
              <Text style={styles.headerTitle}>{isExam ? 'Edit Exam' : 'Edit Event'}</Text>
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

            {/* Title */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{isExam ? 'Exam Title *' : 'Event Title *'}</Text>
              <TextInput
                style={styles.input}
                placeholder={isExam ? "e.g. Midterm Examination" : "What's the event?"}
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
            {!isExam && (
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
                  trackColor={{ false: colors.border, true: '#6366F1' }}
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
                    if (event) {
                      const orig = parseToPHTDate(event.start_date) ?? new Date();
                      setStartDate(orig);
                      if (endDate && endDate < orig) setEndDate(orig);
                    }
                  }}
                  style={styles.resetBtn}
                  hitSlop={8}
                >
                  <RotateCcw size={12} color={colors.mutedForeground} />
                  <Text style={styles.resetBtnText}>Reset</Text>
                </Pressable>
              </View>
              <Pressable style={styles.picker} onPress={() => openDatePicker('start')}>
                <Text style={styles.pickerText}>{formatDateTime(startDate)}</Text>
                <Calendar size={16} color={colors.mutedForeground} />
              </Pressable>
              {Platform.OS === 'ios' && activeDateField === 'start' && datePickerStep !== null && (
                <View style={styles.iosPickerWrapper}>
                  <DateTimePicker
                    value={startDate}
                    mode="datetime"
                    minimumDate={new Date()}
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
                  <Clock size={16} color={colors.mutedForeground} />
                </Pressable>
                {Platform.OS === 'ios' && activeDateField === 'end' && datePickerStep !== null && (
                  <View style={styles.iosPickerWrapper}>
                    <DateTimePicker
                      value={endDate && endDate >= startDate ? endDate : startDate}
                      mode="datetime"
                      minimumDate={startDate}
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
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>{isExam ? 'Save Exam' : 'Save Changes'}</Text>
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
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    keyboardAvoid: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
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
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      letterSpacing: -0.4,
      includeFontPadding: false,
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deleteBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
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
      includeFontPadding: false,
    },
    formContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
    },
    submitBtn: {
      backgroundColor: '#6366F1',
      marginTop: 16,
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
      backgroundColor: isDark ? colors.background : colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resetBtnText: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontWeight: '500',
      includeFontPadding: false,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.mutedForeground,
      marginBottom: 8,
      includeFontPadding: false,
    },
    sublabel: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
      includeFontPadding: false,
    },
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
      paddingHorizontal: 16,
      paddingVertical: 12,
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
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    inputInline: { flex: 1, color: colors.foreground, fontSize: 15 },
    picker: {
      backgroundColor: isDark ? colors.background : colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pickerText: {
      color: colors.foreground,
      fontSize: 15,
      flex: 1,
      includeFontPadding: false,
    },
    pickerPlaceholder: {
      color: colors.mutedForeground,
      fontSize: 15,
      flex: 1,
      includeFontPadding: false,
    },
    pickerDisabled: {
      opacity: 0.5,
    },
    subjectPickerInner: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
    subjectDot: { width: 10, height: 10, borderRadius: 5 },
    pickerList: {
      backgroundColor: isDark ? colors.background : colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      marginTop: 4,
      overflow: 'hidden',
    },
    pickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerItemText: {
      color: colors.foreground,
      fontSize: 14,
      marginLeft: 8,
      includeFontPadding: false,
    },
    iosPickerWrapper: {
      marginTop: 8,
      backgroundColor: isDark ? colors.background : colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: 'hidden',
    },
    iosPicker: { height: 180 },
    iosDoneBtn: {
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    iosDoneBtnText: {
      color: '#6366F1',
      fontSize: 15,
      fontWeight: '600',
      includeFontPadding: false,
    },
  });
}


