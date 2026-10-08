import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  Trash2,
  AlertCircle,
  ChevronDown,
  Check,
} from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { useTheme } from '@/src/theme/useTheme';
import type { ThemeColors } from '@/src/theme/tokens';
import { useNotificationStore } from '@/src/store/notificationStore';
import { useNotebookStore } from '@/src/store/notebookStore';
import { NotificationService } from '@/src/services/notificationService';
import { CalendarEventRow } from '@/src/hooks/useCalendarEvents';
import {
  formatDatePHT,
  formatTime12PHT,
  toPhilippineISO,
  parseToPHTDate,
} from '@/src/utils/philippineTime';
import { parseDateLocal } from '@/src/utils/scheduleUtils';

export interface EditStudySessionSheetProps {
  visible: boolean;
  session: CalendarEventRow | null;
  onClose: () => void;
  onDelete?: (session: CalendarEventRow) => void;
}

const DURATION_OPTIONS = [
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1.5h', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: 'Custom', minutes: -1 },
];

const LEAD_TIME_OPTIONS = [
  { label: 'At start', mins: 0 },
  { label: '15m before', mins: 15 },
  { label: '30m before', mins: 30 },
  { label: '1h before', mins: 60 },
  { label: 'No alert', mins: -1 },
];

export function EditStudySessionSheet({
  visible,
  session,
  onClose,
  onDelete,
}: EditStudySessionSheetProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const powerSync = usePowerSync();
  const { prefs } = useNotificationStore();
  const { notebooks, fetchNotebooks } = useNotebookStore();

  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date(Date.now() + 60 * 60 * 1000));
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>('');
  const [selectedNotebookTitle, setSelectedNotebookTitle] = useState<string>('Notebook');
  const [focusText, setFocusText] = useState<string>('');
  const [leadMinutes, setLeadMinutes] = useState<number>(0);
  const [isNotebookPickerOpen, setIsNotebookPickerOpen] = useState(false);

  // iOS date/time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load notebooks if empty
  useEffect(() => {
    if (visible && notebooks.length === 0) {
      fetchNotebooks(true).catch(() => {});
    }
  }, [visible, notebooks.length, fetchNotebooks]);

  // Populate from active session
  useEffect(() => {
    if (session) {
      const parsedStart =
        parseToPHTDate(session.start_date) ??
        parseDateLocal(session.start_date) ??
        new Date(session.start_date);
      setStartDate(parsedStart);

      const parsedEnd = session.end_date
        ? parseToPHTDate(session.end_date) ??
          parseDateLocal(session.end_date) ??
          new Date(session.end_date)
        : new Date(parsedStart.getTime() + 60 * 60 * 1000);
      setEndDate(parsedEnd);

      const diffMins = Math.round((parsedEnd.getTime() - parsedStart.getTime()) / (60 * 1000));
      const matchedPreset = DURATION_OPTIONS.find((opt) => opt.minutes === diffMins);
      if (matchedPreset) {
        setDurationMinutes(matchedPreset.minutes);
      } else {
        setDurationMinutes(-1); // Custom
      }

      const extractedNotebookId = session.location?.startsWith('study_session:')
        ? session.location.replace(/^study_session:/, '')
        : '';
      const extractedTitle =
        session.title.replace(/^Study Session:\s*/i, '').trim() || 'Notebook';

      setSelectedNotebookId(extractedNotebookId);
      setSelectedNotebookTitle(extractedTitle);
      setFocusText(session.description ?? '');
      setLeadMinutes(0);
      setIsNotebookPickerOpen(false);
      setShowDatePicker(false);
      setShowTimePicker(false);
      setShowEndTimePicker(false);
      setError(null);
    }
  }, [session]);

  const handleClose = () => {
    setIsNotebookPickerOpen(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowEndTimePicker(false);
    setError(null);
    onClose();
  };

  const handleDurationSelect = (mins: number) => {
    setDurationMinutes(mins);
    if (mins > 0) {
      const updatedEnd = new Date(startDate.getTime() + mins * 60 * 1000);
      setEndDate(updatedEnd);
      setShowEndTimePicker(false);
    } else {
      // Custom: ensure end is at least start + 15m
      if (endDate <= startDate) {
        setEndDate(new Date(startDate.getTime() + 60 * 60 * 1000));
      }
    }
  };

  const openStartDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: startDate,
        mode: 'date',
        minimumDate: new Date(),
        onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type === 'dismissed' || !selectedDate) return;
          const updated = new Date(startDate);
          updated.setFullYear(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate()
          );
          setStartDate(updated);

          // Shift end date accordingly
          const currentDuration =
            durationMinutes > 0
              ? durationMinutes * 60 * 1000
              : Math.max(endDate.getTime() - startDate.getTime(), 15 * 60 * 1000);
          setEndDate(new Date(updated.getTime() + currentDuration));
        },
      });
    } else {
      setShowTimePicker(false);
      setShowEndTimePicker(false);
      setShowDatePicker((prev) => !prev);
    }
  };

  const openStartTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: startDate,
        mode: 'time',
        is24Hour: false,
        onChange: (event: DateTimePickerEvent, selectedTime?: Date) => {
          if (event.type === 'dismissed' || !selectedTime) return;
          const updated = new Date(startDate);
          updated.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
          setStartDate(updated);

          // Shift end date accordingly
          const currentDuration =
            durationMinutes > 0
              ? durationMinutes * 60 * 1000
              : Math.max(endDate.getTime() - startDate.getTime(), 15 * 60 * 1000);
          setEndDate(new Date(updated.getTime() + currentDuration));
        },
      });
    } else {
      setShowDatePicker(false);
      setShowEndTimePicker(false);
      setShowTimePicker((prev) => !prev);
    }
  };

  const openCustomEndTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: endDate,
        mode: 'time',
        is24Hour: false,
        onChange: (event: DateTimePickerEvent, selectedTime?: Date) => {
          if (event.type === 'dismissed' || !selectedTime) return;
          const updated = new Date(endDate);
          updated.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
          if (updated <= startDate) {
            Alert.alert('Invalid End Time', 'End time must be after the start time.');
            return;
          }
          setEndDate(updated);
        },
      });
    } else {
      setShowDatePicker(false);
      setShowTimePicker(false);
      setShowEndTimePicker((prev) => !prev);
    }
  };

  const handleSave = async () => {
    if (!session) return;

    if (endDate <= startDate) {
      setError('End time must be after start time.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const now = toPhilippineISO(new Date());
    const startISO = toPhilippineISO(startDate);
    const endISO = toPhilippineISO(endDate);
    const updatedTitle = `Study Session: ${selectedNotebookTitle.trim() || 'Notebook'}`;
    const updatedLocation = selectedNotebookId
      ? `study_session:${selectedNotebookId}`
      : session.location;

    try {
      // 1. Update SQLite CalendarEvent table
      await powerSync.execute(
        `UPDATE CalendarEvent
         SET title = ?,
             description = ?,
             startDate = ?,
             endDate = ?,
             location = ?,
             updatedAt = ?
         WHERE id = ?`,
        [
          updatedTitle,
          focusText.trim() || `Study session for ${selectedNotebookTitle}`,
          startISO,
          endISO,
          updatedLocation,
          now,
          session.id,
        ]
      );

      // 2. Reschedule or cancel notification
      try {
        await NotificationService.cancelNotification(session.id);
        const oldNotebookId = session.location?.replace(/^study_session:/, '');
        if (oldNotebookId) {
          const oldStartEpoch = parseToPHTDate(session.start_date)?.getTime();
          if (oldStartEpoch) {
            await NotificationService.cancelNotification(`study_${oldNotebookId}_${oldStartEpoch}`);
          }
        }

        // Only schedule if notifications preference is active and leadMinutes >= 0
        if (prefs.studyReminders && leadMinutes >= 0) {
          const alertTime = new Date(startDate.getTime() - leadMinutes * 60 * 1000);
          if (alertTime.getTime() > Date.now()) {
            await NotificationService.scheduleStudyReminder({
              notebookId: selectedNotebookId || 'general',
              notebookTitle: selectedNotebookTitle,
              focusText: focusText.trim() || `Study session for ${selectedNotebookTitle}`,
              dateTime: startDate,
              leadMinutes,
            });
          }
        }
      } catch (notifErr) {
        console.warn('[EditStudySession] Notification update skipped:', notifErr);
      }

      handleClose();
    } catch (err) {
      console.error('[EditStudySession] Failed to update study session:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!session) return;

    Alert.alert(
      'Delete Study Session',
      'Are you sure you want to delete this study session? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await powerSync.execute('DELETE FROM CalendarEvent WHERE id = ?', [session.id]);
              await NotificationService.cancelNotification(session.id);

              const oldNotebookId = session.location?.replace(/^study_session:/, '');
              if (oldNotebookId) {
                const oldStartEpoch = parseToPHTDate(session.start_date)?.getTime();
                if (oldStartEpoch) {
                  await NotificationService.cancelNotification(
                    `study_${oldNotebookId}_${oldStartEpoch}`
                  );
                }
              }

              onDelete?.(session);
              handleClose();
            } catch (err) {
              console.error('[EditStudySession] Failed to delete session:', err);
              setError('Failed to delete study session.');
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

      <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoid}>
        <View style={styles.sheet}>
          {/* Header pill handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerBadge}>
                <BookOpen size={16} color="#6366F1" />
              </View>
              <Text style={styles.headerTitle}>Edit Study Session</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={handleDelete}
                style={styles.deleteBtn}
                hitSlop={8}
                disabled={isDeleting || isLoading}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Trash2 size={18} color="#EF4444" />
                )}
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
            {/* Linked Notebook */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>LINKED NOTEBOOK</Text>
              <Pressable
                style={[
                  styles.notebookSelector,
                  isNotebookPickerOpen && styles.notebookSelectorActive,
                ]}
                onPress={() => setIsNotebookPickerOpen((prev) => !prev)}
              >
                <View style={styles.notebookInfo}>
                  <BookOpen size={16} color="#6366F1" />
                  <Text style={styles.notebookName} numberOfLines={1}>
                    {selectedNotebookTitle}
                  </Text>
                </View>
                {notebooks.length > 1 && (
                  <ChevronDown
                    size={16}
                    color={colors.mutedForeground}
                    style={{
                      transform: [{ rotate: isNotebookPickerOpen ? '180deg' : '0deg' }],
                    }}
                  />
                )}
              </Pressable>

              {/* Notebook Picker Dropdown */}
              {isNotebookPickerOpen && notebooks.length > 0 && (
                <View style={styles.notebookDropdown}>
                  {notebooks.map((nb) => {
                    const isSelected = nb.id === selectedNotebookId;
                    return (
                      <Pressable
                        key={nb.id}
                        style={[
                          styles.notebookOption,
                          isSelected && styles.notebookOptionSelected,
                        ]}
                        onPress={() => {
                          setSelectedNotebookId(nb.id);
                          setSelectedNotebookTitle(nb.title);
                          setIsNotebookPickerOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.notebookOptionText,
                            isSelected && styles.notebookOptionTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {nb.title}
                        </Text>
                        {isSelected && <Check size={16} color="#6366F1" />}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Focus Area / Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>FOCUS AREA / NOTES</Text>
              <TextInput
                style={[styles.input, styles.textAreaInput]}
                value={focusText}
                onChangeText={setFocusText}
                placeholder="Write study notes or focus topics for this session…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                maxLength={250}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{focusText.length}/250</Text>
            </View>

            {/* Date & Start Time */}
            <View style={styles.dateTimeRow}>
              <Pressable style={styles.pickerButton} onPress={openStartDatePicker}>
                <CalendarIcon size={18} color="#6366F1" />
                <View style={styles.pickerTextContainer}>
                  <Text style={styles.pickerLabel}>Date</Text>
                  <Text style={styles.pickerValue}>{formatDatePHT(startDate)}</Text>
                </View>
              </Pressable>

              <Pressable style={styles.pickerButton} onPress={openStartTimePicker}>
                <Clock size={18} color="#6366F1" />
                <View style={styles.pickerTextContainer}>
                  <Text style={styles.pickerLabel}>Start Time</Text>
                  <Text style={styles.pickerValue}>{formatTime12PHT(startDate)}</Text>
                </View>
              </Pressable>
            </View>

            {/* iOS inline Date Picker */}
            {Platform.OS === 'ios' && showDatePicker && (
              <View style={styles.iosPickerCard}>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="spinner"
                  onChange={(_event, date) => {
                    if (date) {
                      const updated = new Date(startDate);
                      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                      setStartDate(updated);

                      const currentDuration =
                        durationMinutes > 0
                          ? durationMinutes * 60 * 1000
                          : Math.max(endDate.getTime() - startDate.getTime(), 15 * 60 * 1000);
                      setEndDate(new Date(updated.getTime() + currentDuration));
                    }
                  }}
                  textColor={colors.foreground}
                  themeVariant={isDark ? 'dark' : 'light'}
                />
                <Pressable style={styles.iosDoneBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.iosDoneBtnText}>Done</Text>
                </Pressable>
              </View>
            )}

            {/* iOS inline Start Time Picker */}
            {Platform.OS === 'ios' && showTimePicker && (
              <View style={styles.iosPickerCard}>
                <DateTimePicker
                  value={startDate}
                  mode="time"
                  display="spinner"
                  onChange={(_event, time) => {
                    if (time) {
                      const updated = new Date(startDate);
                      updated.setHours(time.getHours(), time.getMinutes(), 0, 0);
                      setStartDate(updated);

                      const currentDuration =
                        durationMinutes > 0
                          ? durationMinutes * 60 * 1000
                          : Math.max(endDate.getTime() - startDate.getTime(), 15 * 60 * 1000);
                      setEndDate(new Date(updated.getTime() + currentDuration));
                    }
                  }}
                  textColor={colors.foreground}
                  themeVariant={isDark ? 'dark' : 'light'}
                />
                <Pressable style={styles.iosDoneBtn} onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.iosDoneBtnText}>Done</Text>
                </Pressable>
              </View>
            )}

            {/* Session Duration */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>DURATION</Text>
                <Text style={styles.endInfoText}>Ends at {formatTime12PHT(endDate)}</Text>
              </View>
              <View style={styles.durationRow}>
                {DURATION_OPTIONS.map((item) => {
                  const isSelected = durationMinutes === item.minutes;
                  return (
                    <Pressable
                      key={item.label}
                      style={[styles.durationPill, isSelected && styles.durationPillSelected]}
                      onPress={() => handleDurationSelect(item.minutes)}
                    >
                      <Text
                        style={[
                          styles.durationPillText,
                          isSelected && styles.durationPillTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Custom End Time button if selected */}
              {durationMinutes === -1 && (
                <Pressable style={styles.customEndButton} onPress={openCustomEndTimePicker}>
                  <Clock size={16} color="#6366F1" />
                  <Text style={styles.customEndLabel}>Custom End Time:</Text>
                  <Text style={styles.customEndValue}>{formatTime12PHT(endDate)}</Text>
                </Pressable>
              )}

              {/* iOS inline Custom End Time Picker */}
              {Platform.OS === 'ios' && showEndTimePicker && durationMinutes === -1 && (
                <View style={styles.iosPickerCard}>
                  <DateTimePicker
                    value={endDate}
                    mode="time"
                    display="spinner"
                    onChange={(_event, time) => {
                      if (time) {
                        const updated = new Date(endDate);
                        updated.setHours(time.getHours(), time.getMinutes(), 0, 0);
                        if (updated > startDate) {
                          setEndDate(updated);
                        }
                      }
                    }}
                    textColor={colors.foreground}
                    themeVariant={isDark ? 'dark' : 'light'}
                  />
                  <Pressable
                    style={styles.iosDoneBtn}
                    onPress={() => setShowEndTimePicker(false)}
                  >
                    <Text style={styles.iosDoneBtnText}>Done</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Reminder Lead Time */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>REMINDER LEAD TIME</Text>
              <View style={styles.leadTimeRow}>
                {LEAD_TIME_OPTIONS.map((item) => {
                  const isSelected = leadMinutes === item.mins;
                  return (
                    <Pressable
                      key={item.mins}
                      style={[styles.leadPill, isSelected && styles.leadPillSelected]}
                      onPress={() => setLeadMinutes(item.mins)}
                    >
                      <Text
                        style={[
                          styles.leadPillText,
                          isSelected && styles.leadPillTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleSave}
              disabled={isLoading || isDeleting}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Save Changes</Text>
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
      maxHeight: '90%',
      paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
      marginTop: 8,
      marginBottom: 6,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderColor: colors.border,
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
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    deleteBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F4F4F5',
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FCA5A5',
    },
    errorText: {
      fontSize: 13,
      color: '#EF4444',
      flex: 1,
      fontWeight: '500',
      includeFontPadding: false,
    },
    formContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
      gap: 16,
    },
    formGroup: {
      gap: 6,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.mutedForeground,
      letterSpacing: 1.5,
      includeFontPadding: false,
    },
    endInfoText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#6366F1',
      includeFontPadding: false,
    },
    notebookSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
    },
    notebookSelectorActive: {
      borderColor: '#6366F1',
    },
    notebookInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    notebookName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      includeFontPadding: false,
      flex: 1,
    },
    notebookDropdown: {
      marginTop: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    notebookOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    notebookOptionSelected: {
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF',
    },
    notebookOptionText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
      includeFontPadding: false,
      flex: 1,
    },
    notebookOptionTextSelected: {
      fontWeight: '700',
      color: '#6366F1',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.foreground,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
      includeFontPadding: false,
    },
    textAreaInput: {
      minHeight: 84,
      lineHeight: 20,
      paddingTop: 12,
    },
    charCount: {
      fontSize: 11,
      color: colors.mutedForeground,
      textAlign: 'right',
      marginTop: 2,
      includeFontPadding: false,
    },
    dateTimeRow: {
      flexDirection: 'row',
      gap: 12,
    },
    pickerButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
    },
    pickerTextContainer: {
      flex: 1,
    },
    pickerLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.mutedForeground,
      includeFontPadding: false,
    },
    pickerValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.foreground,
      marginTop: 2,
      includeFontPadding: false,
    },
    durationRow: {
      flexDirection: 'row',
      gap: 6,
    },
    durationPill: {
      flex: 1,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    durationPillSelected: {
      borderColor: '#6366F1',
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : '#EEF2FF',
    },
    durationPillText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedForeground,
      includeFontPadding: false,
      flexShrink: 0,
    },
    durationPillTextSelected: {
      color: '#6366F1',
      fontWeight: '700',
    },
    customEndButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
      marginTop: 4,
    },
    customEndLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.mutedForeground,
      includeFontPadding: false,
    },
    customEndValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.foreground,
      includeFontPadding: false,
    },
    leadTimeRow: {
      flexDirection: 'row',
      gap: 6,
    },
    leadPill: {
      flex: 1,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    leadPillSelected: {
      borderColor: '#6366F1',
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : '#EEF2FF',
    },
    leadPillText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.mutedForeground,
      includeFontPadding: false,
      flexShrink: 0,
    },
    leadPillTextSelected: {
      color: '#6366F1',
      fontWeight: '700',
    },
    iosPickerCard: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 8,
      alignItems: 'center',
    },
    iosDoneBtn: {
      alignSelf: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginTop: 4,
    },
    iosDoneBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#6366F1',
      includeFontPadding: false,
    },
    submitBtn: {
      backgroundColor: '#6366F1',
      borderRadius: 12,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffffff',
      includeFontPadding: false,
      letterSpacing: -0.2,
    },
  });
}
