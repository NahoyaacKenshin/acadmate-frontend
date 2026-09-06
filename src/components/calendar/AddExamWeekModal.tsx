import React, { useState } from 'react';
import { View, Modal, Pressable, StyleSheet, TextInput, Platform, ActivityIndicator } from 'react-native';
import { Text } from '../ui/text';
import { X, Calendar as CalendarIcon } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { Button } from '../ui/button';
import { formatDateLocal, parseDateLocal, toPhilippineISO } from '@/src/utils/scheduleUtils';

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
      setTitle(initialData.title);
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

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openPicker = (field: 'startDate' | 'endDate') => {
    if (Platform.OS === 'android') {
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
    } else {
      setActivePickerField(field);
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate) return;
    if (activePickerField === 'startDate') setStartDate(selectedDate);
    else if (activePickerField === 'endDate') setEndDate(selectedDate);
  };

  const handleSave = async () => {
    if (!title.trim() || !userId) {
      setError('Please provide a title for the entry.');
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
      const sd = formatDateLocal(startDate);
      const ed = formatDateLocal(endDate);

      // Format clean title with category tag prefix if not already present
      let formattedTitle = title.trim();
      if (category === 'HOLIDAY' && !formattedTitle.toLowerCase().includes('holiday')) {
        formattedTitle = `🏖️ ${formattedTitle}`;
      } else if (category === 'SUSPENSION' && !formattedTitle.toLowerCase().includes('suspension')) {
        formattedTitle = `⚠️ ${formattedTitle}`;
      } else if (category === 'EXAM' && !formattedTitle.toLowerCase().includes('exam')) {
        formattedTitle = `🎓 ${formattedTitle}`;
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

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centeredView}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{initialData ? 'Edit Period / Holiday' : 'Add Period / Holiday'}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94A3B8" />
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Type Selector */}
          {!initialData && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category Type</Text>
              <View style={styles.categoryRow}>
                <Pressable
                  style={[styles.categoryPill, category === 'EXAM' && styles.categoryPillExam]}
                  onPress={() => setCategory('EXAM')}
                >
                  <Text style={[styles.categoryText, category === 'EXAM' && styles.categoryTextActive]}>🎓 Exam</Text>
                </Pressable>
                <Pressable
                  style={[styles.categoryPill, category === 'HOLIDAY' && styles.categoryPillHoliday]}
                  onPress={() => setCategory('HOLIDAY')}
                >
                  <Text style={[styles.categoryText, category === 'HOLIDAY' && styles.categoryTextActive]}>🏖️ Holiday</Text>
                </Pressable>
                <Pressable
                  style={[styles.categoryPill, category === 'SUSPENSION' && styles.categoryPillSuspension]}
                  onPress={() => setCategory('SUSPENSION')}
                >
                  <Text style={[styles.categoryText, category === 'SUSPENSION' && styles.categoryTextActive]}>⚠️ Suspension</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Title / Event Name</Text>
            <TextInput
              style={styles.input}
              placeholder={category === 'EXAM' ? 'e.g. Midterms Week' : category === 'HOLIDAY' ? 'e.g. Foundation Day' : 'e.g. Weather Suspension'}
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={[styles.formGroup, styles.row]}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Start Date</Text>
              <Pressable style={styles.picker} onPress={() => openPicker('startDate')}>
                <Text style={styles.pickerText}>{formatDate(startDate)}</Text>
                <CalendarIcon size={14} color="#94A3B8" />
              </Pressable>
            </View>

            <View style={styles.separator}><Text style={styles.separatorText}>—</Text></View>

            <View style={styles.flex1}>
              <Text style={styles.label}>End Date</Text>
              <Pressable style={styles.picker} onPress={() => openPicker('endDate')}>
                <Text style={styles.pickerText}>{formatDate(endDate)}</Text>
                <CalendarIcon size={14} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          {Platform.OS === 'ios' && activePickerField !== null && (
             <View style={{ marginBottom: 16 }}>
               <DateTimePicker
                 value={activePickerField === 'startDate' ? startDate : endDate}
                 mode="date"
                 display="spinner"
                 onChange={handleDateChange}
                 textColor="#ffffff"
                 themeVariant="dark"
               />
               <Button style={{ marginTop: 8 }} onPress={() => setActivePickerField(null)}>
                 <Text>Done</Text>
               </Button>
             </View>
          )}

          <View style={initialData ? styles.btnRow : null}>
            {initialData ? (
              <Pressable style={styles.deleteButton} onPress={handleDelete} disabled={isLoading}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            ) : null}
            <Button
              style={[styles.addButton, initialData ? { flex: 1, marginTop: 0 } : null]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text>{initialData ? 'Save Changes' : 'Save Exam Week'}</Text>}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1A1F2E',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: { padding: 4 },
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
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillExam: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  categoryPillHoliday: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  categoryPillSuspension: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  categoryTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  label: { fontSize: 13, color: '#94A3B8', marginBottom: 8 },
  input: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 15,
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  flex1: { flex: 1 },
  separator: { paddingBottom: 10 },
  separatorText: { color: '#94A3B8' },
  picker: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: { color: '#ffffff', fontSize: 14 },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 18,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 14,
  },
  addButton: { marginTop: 8 },
  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 12 },
});

