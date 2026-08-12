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
import DateTimePicker from '@react-native-community/datetimepicker';
import { NotificationService } from '../../services/notificationService';
import { useNotificationStore } from '../../store/notificationStore';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [focusText, setFocusText] = useState(`Review study material for ${notebookTitle}`);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const updated = new Date(date);
      updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDate(updated);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
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

    if (date.getTime() <= Date.now()) {
      Alert.alert('Invalid Time', 'Please choose a future date and time.');
      return;
    }

    await NotificationService.scheduleStudyReminder({
      notebookId,
      notebookTitle,
      focusText,
      dateTime: date,
    });

    Alert.alert(
      'Reminder Scheduled',
      `Study reminder set for ${date.toLocaleString()}`,
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
              onPress={() => setShowDatePicker(true)}
            >
              <CalendarIcon size={18} color="#6C8EFF" />
              <View>
                <Text style={styles.pickerLabel}>Date</Text>
                <Text style={styles.pickerValue}>{date.toLocaleDateString()}</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.pickerButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Clock size={18} color="#6C8EFF" />
              <View>
                <Text style={styles.pickerLabel}>Time</Text>
                <Text style={styles.pickerValue}>
                  {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* DateTime Pickers (Android popup/iOS inline spinner) */}
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
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
