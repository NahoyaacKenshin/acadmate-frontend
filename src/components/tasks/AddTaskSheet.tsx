import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Text,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  X,
  ChevronDown,
  Calendar,
  CheckSquare,
  AlertCircle,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { SubjectRow } from '@/src/hooks/useSubjects';
import { toPhilippineISO } from '@/src/utils/philippineTime';
import { NotificationService } from '@/src/services/notificationService';
import { useTheme } from '@/src/theme/useTheme';
import type { ThemeColors } from '@/src/theme/tokens';

interface AddTaskSheetProps {
  visible: boolean;
  subjects: SubjectRow[];
  onClose: () => void;
  onOpenScanner?: () => void;
}

type DatePickerStep = 'date' | 'time' | null;

const PRESET_COLORS = [
  '#6366F1',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#14B8A6',
  '#3B82F6',
  '#F97316',
];

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} · ${hour12}:${pad(date.getMinutes())} ${ampm}`;
}

export function AddTaskSheet({ visible, subjects, onClose, onOpenScanner }: AddTaskSheetProps) {
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [datePickerStep, setDatePickerStep] = useState<DatePickerStep>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setDueDate(null);
    setSelectedColor(PRESET_COLORS[0]);
    setSelectedSubjectId(null);
    setShowSubjectPicker(false);
    setDatePickerStep(null);
    setError(null);
    onClose();
  };

  // ── Date / Time picker handlers ────────────────────────────────────────────

  const handleOpenDatePicker = () => {
    setShowSubjectPicker(false);
    if (Platform.OS === 'android') {
      const base = dueDate ?? new Date();
      DateTimePickerAndroid.open({
        value: base,
        mode: 'date',
        minimumDate: new Date(),
        is24Hour: false,
        onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type === 'dismissed' || !selectedDate) return;
          const merged = new Date(selectedDate);
          merged.setHours(base.getHours(), base.getMinutes(), 0, 0);
          DateTimePickerAndroid.open({
            value: merged,
            mode: 'time',
            is24Hour: false,
            onChange: (timeEvent: DateTimePickerEvent, selectedTime?: Date) => {
              if (timeEvent.type === 'dismissed' || !selectedTime) {
                setDueDate(merged);
                return;
              }
              const finalDate = new Date(merged);
              finalDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
              setDueDate(finalDate);
            },
          });
        },
      });
    } else {
      setDatePickerStep('date');
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) {
      setDueDate(selected);
    }
  };

  const handleIOSDone = () => {
    setDatePickerStep(null);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!userId) {
      setError('You must be logged in.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = toPhilippineISO(new Date());
      const dueDateISO = dueDate ? toPhilippineISO(dueDate) : null;

      const taskColor = selectedSubject?.color ?? selectedColor ?? '#6366F1';

      await powerSync.execute(
        `INSERT INTO Task (id, title, description, dueDate, completed, color, subtasks, subjectId, userId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 0, ?, '[]', ?, ?, ?, ?)`,
        [id, title.trim(), description.trim() || null, dueDateISO, taskColor, selectedSubjectId, userId, now, now]
      );

      if (dueDateISO) {
        NotificationService.scheduleTaskReminders({
          id,
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDateISO,
          completed: 0,
          color: taskColor,
          subtasks: '[]',
          subject_id: selectedSubjectId,
          user_id: userId,
          created_at: now,
          updated_at: now,
          subject_name: selectedSubject?.name ?? null,
          subject_color: selectedSubject?.color ?? null,
        }).catch((e) => console.warn('[AddTask] scheduleTaskReminders error:', e));
      }

      handleClose();
    } catch (err: any) {
      console.error('[AddTask] SQLite insert failed:', err);
      setError('Failed to add task. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
                <CheckSquare size={16} color={colors.primary} />
              </View>
              <Text style={styles.headerTitle}>New Task</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner}>
              <AlertCircle size={15} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <ScrollView
            style={styles.formContainer}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Quick Scanner Shortcut */}
            {onOpenScanner && (
              <Pressable style={styles.scanBanner} onPress={onOpenScanner}>
                <View style={styles.scanBannerIcon}>
                  <Sparkles size={16} color={colors.primary} />
                </View>
                <View style={styles.scanBannerContent}>
                  <Text style={styles.scanBannerTitle}>Scan Assignment or Syllabus</Text>
                  <Text style={styles.scanBannerSubtitle}>Auto-extract task title, due dates & subjects</Text>
                </View>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </Pressable>
            )}

            {/* Title */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Task Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Platform Architecture Challenge"
                placeholderTextColor={colors.mutedForeground}
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
                placeholderTextColor={colors.mutedForeground}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                onFocus={() => setShowSubjectPicker(false)}
              />
            </View>

            {/* Due Date & Time */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Due Date & Time (Optional)</Text>
                {dueDate && (
                  <Pressable
                    onPress={() => setDueDate(null)}
                    style={styles.resetBtn}
                    hitSlop={8}
                  >
                    <X size={12} color="#EF4444" />
                    <Text style={[styles.resetBtnText, { color: '#EF4444' }]}>Clear</Text>
                  </Pressable>
                )}
              </View>
              <Pressable style={styles.picker} onPress={handleOpenDatePicker}>
                <Text style={dueDate ? styles.pickerText : styles.pickerPlaceholder}>
                  {dueDate ? formatDateTime(dueDate) : 'Select date & time...'}
                </Text>
                <Calendar size={16} color={colors.mutedForeground} />
              </Pressable>

              {/* iOS inline datetime spinner */}
              {Platform.OS === 'ios' && datePickerStep !== null && (
                <View style={styles.iosPickerWrapper}>
                  <DateTimePicker
                    value={dueDate ?? new Date()}
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

            {/* Subject */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Subject (Optional)</Text>
              <Pressable
                style={styles.picker}
                onPress={() => setShowSubjectPicker((prev) => !prev)}
              >
                <Text style={selectedSubject ? styles.pickerText : styles.pickerPlaceholder}>
                  {selectedSubject ? selectedSubject.name : 'Select a subject...'}
                </Text>
                <ChevronDown size={16} color={colors.mutedForeground} />
              </Pressable>
              {showSubjectPicker && (
                <View style={styles.pickerList}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 160 }}>
                    <Pressable
                      style={styles.pickerItem}
                      onPress={() => {
                        setSelectedSubjectId(null);
                        setShowSubjectPicker(false);
                      }}
                    >
                      <Text style={styles.pickerItemText}>None</Text>
                    </Pressable>
                    {subjects.map((s) => (
                      <Pressable
                        key={s.id}
                        style={styles.pickerItem}
                        onPress={() => {
                          setSelectedSubjectId(s.id);
                          setShowSubjectPicker(false);
                        }}
                      >
                        <View style={[styles.subjectDot, { backgroundColor: s.color || colors.primary }]} />
                        <Text style={styles.pickerItemText}>{s.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <Pressable
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleAdd}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText} numberOfLines={1}>
                  Add Task
                </Text>
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
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: colors.primary + '18',
      borderWidth: 1,
      borderColor: colors.primary + '35',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      includeFontPadding: false,
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
      includeFontPadding: false,
    },
    formContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
    },
    scanBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.primary + '12',
      borderWidth: 1,
      borderColor: colors.primary + '25',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 16,
    },
    scanBannerIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scanBannerContent: {
      flex: 1,
    },
    scanBannerTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.foreground,
      includeFontPadding: false,
    },
    scanBannerSubtitle: {
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 2,
      includeFontPadding: false,
    },
    formGroup: {
      marginBottom: 16,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 6,
      includeFontPadding: false,
    },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    resetBtnText: {
      fontSize: 12,
      fontWeight: '600',
      includeFontPadding: false,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      color: colors.foreground,
    },
    multiline: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    picker: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pickerText: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '500',
      includeFontPadding: false,
    },
    pickerPlaceholder: {
      color: colors.mutedForeground,
      fontSize: 14,
      includeFontPadding: false,
    },
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
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    pickerItemText: {
      color: colors.foreground,
      fontSize: 14,
      includeFontPadding: false,
    },
    subjectDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    iosPickerWrapper: {
      marginTop: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 8,
    },
    iosPicker: {
      height: 140,
    },
    iosDoneBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
      marginTop: 6,
    },
    iosDoneBtnText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 14,
      includeFontPadding: false,
    },
    submitBtn: {
      backgroundColor: '#6366F1',
      marginTop: 18,
      height: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      paddingHorizontal: 16,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '700',
      includeFontPadding: false,
      flexShrink: 0,
      textAlign: 'center',
    },
  });
}
