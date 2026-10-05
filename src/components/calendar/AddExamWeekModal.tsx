import React, { useState, useMemo } from 'react';
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Text,
} from 'react-native';
import { X, Calendar as CalendarIcon, RotateCcw, GraduationCap, AlertCircle } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { parseDateLocal, toPhilippineISO, getPeriodCategory, getCleanPeriodTitle } from '@/src/utils/scheduleUtils';
import { useTheme } from '@/src/theme/useTheme';
import type { ThemeColors } from '@/src/theme/tokens';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function AddExamWeekModal({
  visible,
  onClose,
  initialData,
}: {
  visible: boolean;
  onClose: () => void;
  initialData?: { id: string; title: string; startDate: string; endDate: string } | null;
}) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'EXAM' | 'HOLIDAY' | 'SUSPENSION'>('EXAM');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [activePickerField, setActivePickerField] = useState<'startDate' | 'endDate' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const powerSync = usePowerSync();
  const userId = useAuthStore((s: any) => s.user?.id);

  React.useEffect(() => {
    if (initialData) {
      setCategory(getPeriodCategory(initialData));
      setTitle(getCleanPeriodTitle(initialData.title));
      if (initialData.startDate) {
        const parsed = parseDateLocal(initialData.startDate);
        if (parsed) setStartDate(parsed);
      }
      if (initialData.endDate) {
        const parsed = parseDateLocal(initialData.endDate);
        if (parsed) setEndDate(parsed);
      }
    } else {
      setTitle('');
      setCategory('EXAM');
      setStartDate(new Date());
      setEndDate(new Date());
    }
  }, [initialData, visible]);

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openPicker = (field: 'startDate' | 'endDate') => {
    if (field === 'endDate' && !startDate) return;

    if (Platform.OS === 'android') {
      const val = field === 'startDate' ? (startDate ?? new Date()) : (endDate ?? startDate ?? new Date());
      DateTimePickerAndroid.open({
        value: val,
        mode: 'date',
        minimumDate: field === 'startDate' ? new Date() : (startDate ?? new Date()),
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

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate) return;
    if (activePickerField === 'startDate') {
      setStartDate(selectedDate);
      if (endDate && endDate < selectedDate) setEndDate(selectedDate);
    } else if (activePickerField === 'endDate') {
      const safeEnd = startDate && selectedDate < startDate ? startDate : selectedDate;
      setEndDate(safeEnd);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !userId) {
      setError('Please provide a title for the entry.');
      return;
    }
    if (!startDate) {
      setError('Please select a start date.');
      return;
    }
    if (!endDate) {
      setError('Please select an end date.');
      return;
    }
    if (endDate < startDate) {
      setError('End date must be after start date.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const now = toPhilippineISO(new Date());
      const sd = toPhilippineISO(startDate, '00:00');
      const ed = toPhilippineISO(endDate, '00:00');

      // Keep clean title with clean category distinction
      const clean = getCleanPeriodTitle(title.trim());
      let formattedTitle = clean;
      if (category === 'HOLIDAY') {
        formattedTitle = clean.toLowerCase().includes('holiday') ? clean : `${clean} (Holiday)`;
      } else if (category === 'SUSPENSION') {
        formattedTitle = clean.toLowerCase().includes('suspension') ? clean : `${clean} (Suspension)`;
      } else {
        formattedTitle = clean;
      }

      if (initialData?.id) {
        await powerSync.execute(
          `UPDATE ExamWeek SET title = ?, startDate = ?, endDate = ?, updatedAt = ? WHERE id = ?`,
          [formattedTitle, sd, ed, now, initialData.id]
        );
      } else {
        const id = generateId();
        await powerSync.execute(
          `INSERT INTO ExamWeek (id, title, startDate, endDate, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, formattedTitle, sd, ed, now, now, userId]
        );
      }

      setTitle('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save event period.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      await powerSync.execute(`DELETE FROM ExamWeek WHERE id = ?`, [initialData.id]);
      setTitle('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete period.');
    } finally {
      setIsLoading(false);
    }
  };

  const getHeaderTitle = () => {
    if (initialData) {
      if (category === 'EXAM') return 'Edit Exam Period';
      if (category === 'HOLIDAY') return 'Edit Holiday';
      return 'Edit Class Suspension';
    }
    if (category === 'EXAM') return 'Add Exam Period';
    if (category === 'HOLIDAY') return 'Add Holiday';
    return 'Add Suspension';
  };

  const getSubmitButtonText = () => {
    if (initialData) return 'Save Changes';
    if (category === 'EXAM') return 'Add Exam Period';
    if (category === 'HOLIDAY') return 'Add Holiday';
    return 'Add Suspension';
  };

  const getBadgeIcon = () => {
    if (category === 'HOLIDAY' || category === 'SUSPENSION') return <CalendarIcon size={16} color="#6366F1" />;
    return <GraduationCap size={16} color="#6366F1" />;
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.centeredView}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerBadge}>
                {getBadgeIcon()}
              </View>
              <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <AlertCircle size={15} color="#EF4444" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Type Selector */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category Type</Text>
            <View style={styles.categoryRow}>
              <Pressable
                style={[styles.categoryPill, category === 'EXAM' && styles.categoryPillExam]}
                onPress={() => setCategory('EXAM')}
              >
                <Text style={[styles.categoryText, category === 'EXAM' && styles.categoryTextExam]}>Exam</Text>
              </Pressable>
              <Pressable
                style={[styles.categoryPill, category === 'HOLIDAY' && styles.categoryPillHoliday]}
                onPress={() => setCategory('HOLIDAY')}
              >
                <Text style={[styles.categoryText, category === 'HOLIDAY' && styles.categoryTextHoliday]}>Holiday</Text>
              </Pressable>
              <Pressable
                style={[styles.categoryPill, category === 'SUSPENSION' && styles.categoryPillSuspension]}
                onPress={() => setCategory('SUSPENSION')}
              >
                <Text style={[styles.categoryText, category === 'SUSPENSION' && styles.categoryTextSuspension]}>Suspension</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Title / Event Name</Text>
            <TextInput
              style={styles.input}
              placeholder={category === 'EXAM' ? 'e.g. Midterms Week' : category === 'HOLIDAY' ? 'e.g. Foundation Day' : 'e.g. Weather Suspension'}
              placeholderTextColor={colors.mutedForeground}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={[styles.formGroup, styles.row]}>
            <View style={styles.flex1}>
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
                <Text style={startDate ? styles.pickerText : styles.pickerPlaceholder}>
                  {startDate ? formatDate(startDate) : 'Select start date...'}
                </Text>
                <CalendarIcon size={14} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={styles.separator}><Text style={styles.separatorText}>—</Text></View>

            <View style={styles.flex1}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>End Date</Text>
                {startDate && (
                  <Pressable
                    onPress={() => setEndDate(startDate)}
                    style={styles.resetBtn}
                    hitSlop={8}
                  >
                    <RotateCcw size={10} color={colors.mutedForeground} />
                    <Text style={styles.resetBtnText}>Same</Text>
                  </Pressable>
                )}
              </View>
              <Pressable
                style={[styles.picker, !startDate && styles.pickerDisabled]}
                onPress={() => openPicker('endDate')}
                disabled={!startDate}
              >
                <Text style={endDate ? styles.pickerText : styles.pickerPlaceholder}>
                  {!startDate ? 'Select start date first' : endDate ? formatDate(endDate) : 'Select end date...'}
                </Text>
                <CalendarIcon size={14} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {Platform.OS === 'ios' && activePickerField !== null && (
             <View style={{ marginBottom: 16 }}>
               <DateTimePicker
                 value={
                   activePickerField === 'startDate'
                     ? (startDate ?? new Date())
                     : (endDate && startDate && endDate >= startDate ? endDate : (startDate ?? new Date()))
                 }
                 mode="date"
                 minimumDate={activePickerField === 'startDate' ? new Date() : (startDate ?? new Date())}
                 display="spinner"
                 onChange={handleDateChange}
                 textColor={colors.foreground}
                 themeVariant={isDark ? 'dark' : 'light'}
               />
               <Pressable style={styles.iosDoneBtn} onPress={() => setActivePickerField(null)}>
                 <Text style={styles.iosDoneBtnText}>Done</Text>
               </Pressable>
             </View>
          )}

          <View style={initialData ? styles.btnRow : null}>
            {initialData ? (
              <Pressable style={styles.deleteButton} onPress={handleDelete} disabled={isLoading}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.addButton, initialData ? { flex: 1, marginTop: 0 } : null, isLoading && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.addButtonText}>{getSubmitButtonText()}</Text>
              )}
            </Pressable>
          </View>
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
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
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
      backgroundColor: isDark ? colors.background : colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resetBtnText: {
      fontSize: 10,
      color: colors.mutedForeground,
      fontWeight: '500',
      includeFontPadding: false,
    },
    modalContent: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
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
      borderWidth: 1,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
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
    closeBtn: {
      width: 32,
      height: 32,
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
      marginBottom: 16,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 8,
    },
    errorBannerText: {
      color: '#EF4444',
      fontSize: 13,
      flex: 1,
      includeFontPadding: false,
    },
    formGroup: { marginBottom: 16 },
    categoryRow: {
      flexDirection: 'row',
      gap: 8,
    },
    categoryPill: {
      flex: 1,
      paddingVertical: 9,
      paddingHorizontal: 6,
      borderRadius: 10,
      backgroundColor: isDark ? colors.background : colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryPillExam: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
      borderColor: '#F59E0B',
    },
    categoryPillHoliday: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
      borderColor: '#EF4444',
    },
    categoryPillSuspension: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
      borderColor: '#EF4444',
    },
    categoryText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.mutedForeground,
      includeFontPadding: false,
      flexShrink: 0,
    },
    categoryTextExam: {
      color: '#F59E0B',
      fontWeight: '700',
    },
    categoryTextHoliday: {
      color: '#EF4444',
      fontWeight: '700',
    },
    categoryTextSuspension: {
      color: '#EF4444',
      fontWeight: '700',
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.mutedForeground,
      marginBottom: 8,
      includeFontPadding: false,
    },
    input: {
      backgroundColor: isDark ? colors.background : colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      color: colors.foreground,
      fontSize: 15,
    },
    row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    flex1: { flex: 1 },
    separator: { paddingBottom: 10 },
    separatorText: { color: colors.mutedForeground },
    picker: {
      backgroundColor: isDark ? colors.background : colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pickerText: {
      color: colors.foreground,
      fontSize: 14,
      includeFontPadding: false,
    },
    pickerPlaceholder: {
      color: colors.mutedForeground,
      fontSize: 14,
      includeFontPadding: false,
    },
    pickerDisabled: {
      opacity: 0.5,
    },
    btnRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
      alignItems: 'center',
    },
    deleteButton: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FCA5A5',
      borderRadius: 10,
      paddingHorizontal: 18,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteButtonText: {
      color: '#EF4444',
      fontWeight: '700',
      fontSize: 14,
      includeFontPadding: false,
    },
    addButton: {
      marginTop: 8,
      backgroundColor: '#6366F1',
      height: 48,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addButtonText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 15,
      includeFontPadding: false,
    },
    iosDoneBtn: {
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    iosDoneBtnText: {
      color: '#6366F1',
      fontSize: 14,
      fontWeight: '600',
      includeFontPadding: false,
    },
  });
}


