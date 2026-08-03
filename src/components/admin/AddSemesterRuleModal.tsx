import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { Calendar, X, Layers, Plus, Check } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePowerSync } from '@powersync/react';
import { AdminApiService } from '@/src/services/admin.api';
import { SemesterRuleRow } from '@/src/hooks/useSemesterRules';

interface AddSemesterRuleModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: SemesterRuleRow | null;
}

const DAYS_OF_WEEK = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

export function AddSemesterRuleModal({ visible, onClose, onSuccess, initialData }: AddSemesterRuleModalProps) {
  const powerSync = usePowerSync();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState<number>(6); // Default Saturday
  const [setType, setSetType] = useState<'A' | 'B'>('A');
  const [label, setLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      if (initialData.startDate) {
        const parts = initialData.startDate.split('T')[0].split('-');
        if (parts.length === 3) {
          setStartDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
        }
      }
      if (initialData.endDate) {
        const parts = initialData.endDate.split('T')[0].split('-');
        if (parts.length === 3) {
          setEndDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
          setHasEndDate(true);
        }
      } else {
        setEndDate(null);
        setHasEndDate(false);
      }
      setDayOfWeek(initialData.dayOfWeek);
      setSetType(initialData.setType);
      setLabel(initialData.label ?? '');
    } else {
      setStartDate(new Date());
      setEndDate(null);
      setHasEndDate(false);
      setDayOfWeek(6);
      setSetType('A');
      setLabel('');
    }
  }, [initialData, visible]);

  const formatDateString = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const startDateIso = formatDateString(startDate);
      const endDateIso = hasEndDate && endDate ? formatDateString(endDate) : null;
      const now = new Date().toISOString();

      if (initialData?.id) {
        await AdminApiService.updateSemesterRule(initialData.id, {
          startDate: startDateIso,
          endDate: endDateIso,
          dayOfWeek,
          setType,
          label: label.trim() || undefined,
        });
        await powerSync.execute(
          `UPDATE SemesterRule SET startDate = ?, endDate = ?, dayOfWeek = ?, setType = ?, label = ?, updatedAt = ? WHERE id = ?`,
          [startDateIso, endDateIso, dayOfWeek, setType, label.trim() || null, now, initialData.id]
        );
      } else {
        const res = await AdminApiService.createSemesterRule({
          startDate: startDateIso,
          endDate: endDateIso,
          dayOfWeek,
          setType,
          label: label.trim() || undefined,
        });
        const rule = res?.data;
        if (rule?.id) {
          await powerSync.execute(
            `INSERT OR REPLACE INTO SemesterRule (id, startDate, endDate, dayOfWeek, setType, label, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [rule.id, startDateIso, endDateIso, dayOfWeek, setType, label.trim() || null, rule.createdAt || now, rule.updatedAt || now]
          );
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save semester rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{initialData ? 'Edit Schedule Rule' : 'Add Schedule Rule'}</Text>
            <Pressable onPress={onClose}>
              <X size={20} color="#94A3B8" />
            </Pressable>
          </View>

          {error && <Text style={styles.errorBanner}>{error}</Text>}

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Day of Week Selector */}
            <Text style={styles.label}>Day of Week</Text>
            <View style={styles.daysRow}>
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = dayOfWeek === day.value;
                return (
                  <Pressable
                    key={day.value}
                    style={[styles.dayPill, isSelected && styles.dayPillSelected]}
                    onPress={() => setDayOfWeek(day.value)}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Set A / Set B Selector */}
            <Text style={styles.label}>Face-to-Face Set</Text>
            <View style={styles.ruleTypeRow}>
              <Pressable
                style={[styles.ruleCard, setType === 'A' && styles.ruleCardSelected]}
                onPress={() => setSetType('A')}
              >
                <Layers size={18} color={setType === 'A' ? '#6C8EFF' : '#94A3B8'} />
                <Text style={[styles.ruleTitle, setType === 'A' && styles.ruleTitleSelected]}>
                  Set A F2F
                </Text>
              </Pressable>

              <Pressable
                style={[styles.ruleCard, setType === 'B' && styles.ruleCardSelected]}
                onPress={() => setSetType('B')}
              >
                <Layers size={18} color={setType === 'B' ? '#6C8EFF' : '#94A3B8'} />
                <Text style={[styles.ruleTitle, setType === 'B' && styles.ruleTitleSelected]}>
                  Set B F2F
                </Text>
              </Pressable>
            </View>

            {/* Start Date */}
            <Text style={styles.label}>Start Date</Text>
            <Pressable style={styles.datePickerBtn} onPress={() => setShowStartDatePicker(true)}>
              <Calendar size={18} color="#6C8EFF" />
              <Text style={styles.dateText}>{formatDateString(startDate)}</Text>
            </Pressable>

            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onValueChange={(_event: any, date?: Date) => {
                  setShowStartDatePicker(Platform.OS === 'ios');
                  if (date) setStartDate(date);
                }}
              />
            )}

            {/* End Date (Optional Toggle) */}
            <View style={styles.endDateToggleRow}>
              <Text style={styles.labelNoMargin}>End Date (Optional)</Text>
              <Pressable
                style={[styles.toggleBox, hasEndDate && styles.toggleBoxActive]}
                onPress={() => {
                  if (!hasEndDate) {
                    setEndDate(endDate || new Date(startDate.getTime() + 86400000 * 30));
                  }
                  setHasEndDate(!hasEndDate);
                }}
              >
                {hasEndDate && <Check size={14} color="#ffffff" />}
              </Pressable>
            </View>

            {hasEndDate && (
              <>
                <Pressable style={styles.datePickerBtn} onPress={() => setShowEndDatePicker(true)}>
                  <Calendar size={18} color="#6C8EFF" />
                  <Text style={styles.dateText}>{endDate ? formatDateString(endDate) : 'Select End Date'}</Text>
                </Pressable>

                {showEndDatePicker && (
                  <DateTimePicker
                    value={endDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onValueChange={(_event: any, date?: Date) => {
                      setShowEndDatePicker(Platform.OS === 'ios');
                      if (date) setEndDate(date);
                    }}
                  />
                )}
              </>
            )}

            {/* Label Input */}
            <Text style={styles.label}>Label / Note (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Set A Saturday - Week 3, Special Monday"
              placeholderTextColor="#94A3B8"
              value={label}
              onChangeText={setLabel}
            />

            {/* Submit */}
            <Button style={styles.submitBtn} disabled={isSubmitting} onPress={handleSubmit}>
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.btnRow}>
                  <Plus size={18} color="#ffffff" />
                  <Text style={styles.btnText}>
                    {initialData ? 'Save Changes' : 'Create Schedule Rule'}
                  </Text>
                </View>
              )}
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#161A26',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    color: '#EF4444',
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 14,
  },
  labelNoMargin: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayPill: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillSelected: {
    backgroundColor: '#6C8EFF',
    borderColor: '#6C8EFF',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  dayTextSelected: {
    color: '#ffffff',
  },
  ruleTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ruleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10131C',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#2A3143',
    gap: 8,
  },
  ruleCardSelected: {
    borderColor: '#6C8EFF',
    backgroundColor: 'rgba(108,142,255,0.1)',
  },
  ruleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  ruleTitleSelected: {
    color: '#6C8EFF',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10131C',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A3143',
    gap: 10,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  endDateToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  toggleBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#2A3143',
    backgroundColor: '#10131C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBoxActive: {
    backgroundColor: '#6C8EFF',
    borderColor: '#6C8EFF',
  },
  input: {
    backgroundColor: '#10131C',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A3143',
    color: '#ffffff',
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: '#6C8EFF',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
