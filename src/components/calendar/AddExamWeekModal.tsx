import React, { useState } from 'react';
import { View, Modal, Pressable, StyleSheet, TextInput, Platform, ActivityIndicator } from 'react-native';
import { Text } from '../ui/text';
import { X, Calendar as CalendarIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { Button } from '../ui/button';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function AddExamWeekModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [activePickerField, setActivePickerField] = useState<'startDate' | 'endDate' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const powerSync = usePowerSync();
  const userId = useAuthStore((s: any) => s.user?.id);

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setActivePickerField(null);
    if (!selectedDate) return;
    if (activePickerField === 'startDate') setStartDate(selectedDate);
    if (activePickerField === 'endDate') setEndDate(selectedDate);
  };

  const handleSave = async () => {
    if (!title.trim() || !userId) {
      setError('Please provide a title for the exam week.');
      return;
    }
    if (endDate < startDate) {
      setError('End date must be after start date.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const id = generateId();
      const now = new Date().toISOString();
      const sd = startDate.toISOString().split('T')[0];
      const ed = endDate.toISOString().split('T')[0];

      await powerSync.execute(
        `INSERT INTO ExamWeek (id, title, startDate, endDate, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, title.trim(), sd, ed, now, now, userId]
      );
      
      setTitle('');
      setStartDate(new Date());
      setEndDate(new Date());
      onClose();
    } catch (err) {
      console.error('[AddExamWeek] SQLite insert failed:', err);
      setError('Failed to add exam week.');
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
            <Text style={styles.headerTitle}>Add Exam Week</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94A3B8" />
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Midterms, Finals Week"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={[styles.formGroup, styles.row]}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Start Date</Text>
              <Pressable style={styles.picker} onPress={() => setActivePickerField('startDate')}>
                <Text style={styles.pickerText}>{formatDate(startDate)}</Text>
                <CalendarIcon size={14} color="#94A3B8" />
              </Pressable>
            </View>

            <View style={styles.separator}><Text style={styles.separatorText}>—</Text></View>

            <View style={styles.flex1}>
              <Text style={styles.label}>End Date</Text>
              <Pressable style={styles.picker} onPress={() => setActivePickerField('endDate')}>
                <Text style={styles.pickerText}>{formatDate(endDate)}</Text>
                <CalendarIcon size={14} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          {Platform.OS === 'android' && activePickerField !== null && (
            <DateTimePicker
              value={activePickerField === 'startDate' ? startDate : endDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}

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

          <Button style={styles.addButton} onPress={handleSave} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text>Save Exam Week</Text>}
          </Button>
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
  addButton: { marginTop: 8 },
  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 12 },
});
