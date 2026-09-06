import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Text } from '@/src/components/ui/text';
import { Button } from '@/src/components/ui/button';
import { X, Calendar as CalendarIcon, Clock } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NotificationService } from '../../services/notificationService';
import { useNotificationStore } from '../../store/notificationStore';
import { formatDatePHT, formatTime12PHT } from '@/src/utils/philippineTime';

interface StudySchedulerModalProps {
  visible: boolean;
  onClose: () => void;
  notebookId: string;
  notebookTitle: string;
}

export function StudySchedulerModal({
  visible,
  onClose,
  notebookId,
  notebookTitle,
}: StudySchedulerModalProps) {
  const { prefs } = useNotificationStore();
  const [date, setDate] = useState<Date>(new Date());
  const [leadMinutes, setLeadMinutes] = useState<number>(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [focusText, setFocusText] = useState(`Review study material for ${notebookTitle}`);

  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        minimumDate: new Date(),
        onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type === 'dismissed' || !selectedDate) return;
          const updated = new Date(date);
          updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
          setDate(updated);
        },
      });
    } else {
      setShowTimePicker(false);
      setShowDatePicker(true);
    }
  };

  const openTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'time',
        is24Hour: false,
        onChange: (event: DateTimePickerEvent, selectedTime?: Date) => {
          if (event.type === 'dismissed' || !selectedTime) return;
          const updated = new Date(date);
          updated.setHours(selectedTime.getHours(), selectedTime.getMinutes());
          setDate(updated);
        },
      });
    } else {
      setShowDatePicker(false);
      setShowTimePicker(true);
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      const updated = new Date(date);
      updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDate(updated);
    }
  };

  const handleTimeChange = (_event: DateTimePickerEvent, selectedTime?: Date) => {
    if (selectedTime) {
      const updated = new Date(date);
      updated.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setDate(updated);
    }
  };

  const handleSchedule = async () => {
    if (!prefs.studyReminders) {
      Alert.alert(
        'Notifications Disabled',
        'Please enable Notebook Study Reminders in Settings first.'
      );
      return;
    }

    const alertTime = new Date(date.getTime() - leadMinutes * 60 * 1000);
    if (alertTime.getTime() <= Date.now()) {
      Alert.alert('Invalid Time', 'The scheduled reminder time must be in the future.');
      return;
    }

    await NotificationService.scheduleStudyReminder({
      notebookId,
      notebookTitle,
      focusText,
      dateTime: date,
      leadMinutes,
    });

    const leadText = leadMinutes > 0 ? ` (${leadMinutes} mins lead time)` : '';
    Alert.alert(
      'Reminder Scheduled',
      `Study reminder set for ${formatDatePHT(date)} at ${formatTime12PHT(date)}${leadText}`,
      [{ text: 'OK', onPress: onClose }]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Schedule Study Session</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94A3B8" />
            </Pressable>
          </View>

          {/* Form */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Notebook</Text>
            <Text style={styles.notebookName} numberOfLines={1}>{notebookTitle}</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Focus Area / Note</Text>
            <TextInput
              style={styles.input}
              value={focusText}
              onChangeText={setFocusText}
              placeholder="e.g. Focus on Chapter 3 & 4 summaries"
              placeholderTextColor="#4A5568"
              maxLength={80}
            />
          </View>

          {/* Date & Time selectors */}
          <View style={styles.row}>
            <Pressable
              style={styles.pickerButton}
              onPress={openDatePicker}
            >
              <CalendarIcon size={18} color="#6C8EFF" />
              <View>
                <Text style={styles.pickerLabel}>Date</Text>
                <Text style={styles.pickerValue}>{formatDatePHT(date)}</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.pickerButton}
              onPress={openTimePicker}
            >
              <Clock size={18} color="#6C8EFF" />
              <View>
                <Text style={styles.pickerLabel}>Time</Text>
                <Text style={styles.pickerValue}>
                  {formatTime12PHT(date)}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Lead Time Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Reminder Lead Time</Text>
            <View style={styles.leadTimeRow}>
              {[
                { label: 'At start', mins: 0 },
                { label: '15m before', mins: 15 },
                { label: '30m before', mins: 30 },
                { label: '1h before', mins: 60 },
              ].map((item) => {
                const isSelected = leadMinutes === item.mins;
                return (
                  <Pressable
                    key={item.mins}
                    style={[styles.leadPill, isSelected && styles.leadPillActive]}
                    onPress={() => setLeadMinutes(item.mins)}
                  >
                    <Text style={[styles.leadPillText, isSelected && styles.leadPillTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* iOS inline spinners */}
          {Platform.OS === 'ios' && showDatePicker && (
            <View style={{ marginBottom: 12 }}>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={handleDateChange}
                textColor="#ffffff"
                themeVariant="dark"
              />
              <Button style={{ marginTop: 8 }} onPress={() => setShowDatePicker(false)}>
                <Text>Done</Text>
              </Button>
            </View>
          )}

          {Platform.OS === 'ios' && showTimePicker && (
            <View style={{ marginBottom: 12 }}>
              <DateTimePicker
                value={date}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                textColor="#ffffff"
                themeVariant="dark"
              />
              <Button style={{ marginTop: 8 }} onPress={() => setShowTimePicker(false)}>
                <Text>Done</Text>
              </Button>
            </View>
          )}

          {/* CTA */}
          <Button style={styles.ctaBtn} onPress={handleSchedule}>
            <Text style={styles.ctaText}>Set Study Alert</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161A26',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A3143',
    gap: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  notebookName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: '#10131C',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  input: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 10,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 10,
    padding: 12,
  },
  pickerLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  pickerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  leadTimeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  leadPill: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadPillActive: {
    backgroundColor: 'rgba(108, 142, 255, 0.15)',
    borderColor: '#6C8EFF',
  },
  leadPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  leadPillTextActive: {
    color: '#6C8EFF',
  },
  ctaBtn: {
    backgroundColor: '#6C8EFF',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});

