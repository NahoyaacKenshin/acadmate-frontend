import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text } from '@/src/components/ui/text';
import { Button } from '@/src/components/ui/button';
import { X, Calendar as CalendarIcon, Clock } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NotificationService } from '../../services/notificationService';
import { useNotificationStore } from '../../store/notificationStore';
import { formatDatePHT, formatTime12PHT, toPhilippineISO } from '@/src/utils/philippineTime';
import { useTheme } from '@/src/theme/useTheme';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';

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
  const { colors, isDark } = useTheme();
  const { prefs } = useNotificationStore();
  const powerSync = usePowerSync();
  const { user } = useAuthStore();
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

    const reminderId = await NotificationService.scheduleStudyReminder({
      notebookId,
      notebookTitle,
      focusText,
      dateTime: date,
      leadMinutes,
    });

    // Also persist into CalendarEvent SQLite table so it reflects on the Calendar screen
    const eventId = reminderId || `study_${notebookId}_${date.getTime()}`;
    const startISO = toPhilippineISO(date);
    const endISO = toPhilippineISO(new Date(date.getTime() + 60 * 60 * 1000));
    const now = toPhilippineISO(new Date());

    try {
      await powerSync.execute(
        `INSERT OR REPLACE INTO CalendarEvent
          (id, title, description, startDate, endDate, allDay, location, color, subjectId, userId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventId,
          `Study Session: ${notebookTitle}`,
          focusText.trim() || `Study session for ${notebookTitle}`,
          startISO,
          endISO,
          0,
          `study_session:${notebookId}`,
          '#6366F1',
          null,
          user?.id ?? '',
          now,
          now,
        ]
      );
    } catch (dbErr) {
      console.error('[StudyScheduler] Failed to insert CalendarEvent:', dbErr);
    }

    const leadText = leadMinutes > 0 ? ` (${leadMinutes} mins lead time)` : '';
    Alert.alert(
      'Reminder Scheduled',
      `Study reminder set for ${formatDatePHT(date)} at ${formatTime12PHT(date)}${leadText}`,
      [{ text: 'OK', onPress: onClose }]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoid}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Schedule Study Session</Text>
            <Pressable
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F4F4F5' },
              ]}
              hitSlop={8}
            >
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Form */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>NOTEBOOK</Text>
              <Text
                style={[
                  styles.notebookName,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                numberOfLines={1}
              >
                {notebookTitle}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>FOCUS AREA / NOTE</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textAreaInput,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                value={focusText}
                onChangeText={setFocusText}
                placeholder="Write study notes or focus topics for this session…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                maxLength={250}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
                {focusText.length}/250
              </Text>
            </View>

            {/* Date & Time selectors */}
            <View style={styles.row}>
              <Pressable
                style={[
                  styles.pickerButton,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
                    borderColor: colors.border,
                  },
                ]}
                onPress={openDatePicker}
              >
                <CalendarIcon size={18} color="#6366F1" />
                <View>
                  <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>Date</Text>
                  <Text style={[styles.pickerValue, { color: colors.foreground }]}>{formatDatePHT(date)}</Text>
                </View>
              </Pressable>

              <Pressable
                style={[
                  styles.pickerButton,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
                    borderColor: colors.border,
                  },
                ]}
                onPress={openTimePicker}
              >
                <Clock size={18} color="#6366F1" />
                <View>
                  <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>Time</Text>
                  <Text style={[styles.pickerValue, { color: colors.foreground }]}>
                    {formatTime12PHT(date)}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Lead Time Selection */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>REMINDER LEAD TIME</Text>
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
                      style={[
                        styles.leadPill,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF')
                            : (isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'),
                          borderColor: isSelected ? '#6366F1' : colors.border,
                        },
                      ]}
                      onPress={() => setLeadMinutes(item.mins)}
                    >
                      <Text
                        style={[
                          styles.leadPillText,
                          {
                            color: isSelected ? '#6366F1' : colors.mutedForeground,
                          },
                        ]}
                      >
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
                  textColor={colors.foreground}
                  themeVariant={isDark ? 'dark' : 'light'}
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
                  textColor={colors.foreground}
                  themeVariant={isDark ? 'dark' : 'light'}
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
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    includeFontPadding: false,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flexShrink: 1,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 8,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    includeFontPadding: false,
  },
  notebookName: {
    fontSize: 14,
    fontWeight: '600',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    includeFontPadding: false,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    includeFontPadding: false,
  },
  textAreaInput: {
    minHeight: 84,
    lineHeight: 20,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 2,
    includeFontPadding: false,
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
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  pickerLabel: {
    fontSize: 10,
    fontWeight: '600',
    includeFontPadding: false,
  },
  pickerValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    includeFontPadding: false,
  },
  leadTimeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  leadPill: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  leadPillText: {
    fontSize: 11,
    fontWeight: '700',
    includeFontPadding: false,
  },
  ctaBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 6,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    includeFontPadding: false,
  },
});
