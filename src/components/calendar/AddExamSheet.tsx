import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import {
  X,
  Calendar,
  Clock,
  GraduationCap,
  BookOpen,
  ChevronDown,
  Check,
  Plus,
  AlertCircle,
} from 'lucide-react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useSubjects } from '@/src/hooks/useSubjects';
import { useExamWeeks, ExamWeekRow } from '@/src/hooks/useExamWeeks';
import { parseDateLocal, formatDateLocal, toPhilippineISO, getPeriodCategory, getCleanPeriodTitle } from '@/src/utils/scheduleUtils';

export interface AddExamSheetProps {
  visible: boolean;
  initialDate?: Date;
  onClose: () => void;
  onOpenAddExamWeek?: () => void;
}

type DateField = 'start' | 'end';
type DatePickerStep = 'date' | 'time' | null;

const PRESET_COLORS = [
  '#6C8EFF',
  '#8B5CF6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#14B8A6',
  '#6366F1',
  '#F97316',
];

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function formatDateTime(date: Date | null): string {
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = date.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} · ${h12}:${pad(date.getMinutes())} ${ampm}`;
}

function formatDateShort(dateStr: string): string {
  const d = parseDateLocal(dateStr);
  if (!d) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export function AddExamSheet({
  visible,
  initialDate,
  onClose,
  onOpenAddExamWeek,
}: AddExamSheetProps) {
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);
  const { subjects } = useSubjects();
  const { examWeeks = [] } = useExamWeeks();

  // Form State
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [showTermPicker, setShowTermPicker] = useState(false);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  const [startDate, setStartDate] = useState<Date>(initialDate ?? new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // Inline Subject Creation State
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#8B5CF6');
  const [isSavingSubject, setIsSavingSubject] = useState(false);

  // Picker State
  const [activeDateField, setActiveDateField] = useState<DateField | null>(null);
  const [datePickerStep, setDatePickerStep] = useState<DatePickerStep>(null);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only EXAM-category ExamWeek rows are valid exam terms
  const examTerms = examWeeks.filter((ew) => getPeriodCategory(ew) === 'EXAM');

  const selectedTerm = examTerms.find((ew) => ew.id === selectedTermId) ?? null;
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? null;

  // Auto-select first exam term if available and none selected yet
  useEffect(() => {
    if (visible) {
      if (examTerms.length > 0 && !selectedTermId) {
        handleSelectTerm(examTerms[0]);
      } else if (initialDate) {
        setStartDate(initialDate);
      }
    }
  }, [visible, examTerms.length]);

  const handleSelectTerm = (term: ExamWeekRow) => {
    setSelectedTermId(term.id);
    setShowTermPicker(false);
    setError(null);

    const termStart = parseDateLocal(term.startDate);
    const termEnd = parseDateLocal(term.endDate);

    if (termStart && termEnd) {
      // Set termEnd boundary to end of day
      const endOfDay = new Date(termEnd);
      endOfDay.setHours(23, 59, 59, 999);

      const base = initialDate ?? new Date();
      if (base >= termStart && base <= endOfDay) {
        setStartDate(base);
      } else {
        const defaultStart = new Date(termStart);
        defaultStart.setHours(9, 0, 0, 0);
        setStartDate(defaultStart);
      }
      setEndDate(null);
    }
  };

  const getTermDateBounds = () => {
    if (!selectedTerm) return { min: undefined, max: undefined };
    const min = parseDateLocal(selectedTerm.startDate) ?? undefined;
    const max = parseDateLocal(selectedTerm.endDate);
    if (max) {
      max.setHours(23, 59, 59, 999);
    }
    return { min, max: max ?? undefined };
  };

  const resetForm = () => {
    setSelectedTermId(examWeeks.length > 0 ? examWeeks[0].id : null);
    setShowTermPicker(false);
    setSelectedSubjectId(null);
    setShowSubjectPicker(false);
    setStartDate(initialDate ?? new Date());
    setEndDate(null);
    setLocation('');
    setDescription('');
    setIsCreatingSubject(false);
    setNewSubjectName('');
    setActiveDateField(null);
    setDatePickerStep(null);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ── Date Picker Handlers ───────────────────────────────────────────────────

  const openDatePicker = (field: DateField) => {
    setShowTermPicker(false);
    setShowSubjectPicker(false);

    if (field === 'end' && !startDate) return;

    const { min: termMin, max: termMax } = getTermDateBounds();

    if (Platform.OS === 'android') {
      const baseDate = field === 'start' ? startDate : (endDate ?? startDate);
      const minDate = field === 'start' ? (termMin ?? new Date()) : startDate;
      const maxDate = termMax;

      DateTimePickerAndroid.open({
        value: baseDate,
        mode: 'date',
        minimumDate: minDate,
        maximumDate: maxDate,
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
                  const safeEnd = merged < startDate ? startDate : merged;
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
                const safeEnd = finalDate < startDate ? startDate : finalDate;
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
        const safeEnd = selected < startDate ? startDate : selected;
        setEndDate(safeEnd);
      }
    }
  };

  const handleIOSDone = () => {
    setDatePickerStep(null);
    setActiveDateField(null);
  };

  // ── Subject Creation Handler ───────────────────────────────────────────────

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim() || !userId) return;
    setIsSavingSubject(true);
    try {
      const id = generateId();
      const now = toPhilippineISO(new Date());
      await powerSync.execute(
        `INSERT INTO Subject (id, name, color, userId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, newSubjectName.trim(), newSubjectColor, userId, now, now]
      );
      setSelectedSubjectId(id);
      setNewSubjectName('');
      setIsCreatingSubject(false);
      setShowSubjectPicker(false);
    } catch (err) {
      console.error('[AddExam] Subject insert failed:', err);
      setError('Failed to create subject.');
    } finally {
      setIsSavingSubject(false);
    }
  };

  // ── Submit Exam ────────────────────────────────────────────────────────────

  const handleAddExam = async () => {
    if (!userId) {
      setError('You must be logged in.');
      return;
    }
    if (!selectedTerm) {
      setError('Please select an Exam Term.');
      return;
    }
    if (!selectedSubject) {
      setError('Please select a subject for this exam.');
      return;
    }
    if (!startDate) {
      setError('Please select an exam date and time.');
      return;
    }
    if (endDate && endDate < startDate) {
      setError('End date/time cannot be before start date/time.');
      return;
    }

    const { min: termMin, max: termMax } = getTermDateBounds();
    if (termMin && startDate < termMin) {
      setError(`Exam date cannot be before ${selectedTerm.title}'s start date.`);
      return;
    }
    if (termMax && startDate > termMax) {
      setError(`Exam date cannot be after ${selectedTerm.title}'s end date.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const id = generateId();
      const now = toPhilippineISO(new Date());
      const startISO = toPhilippineISO(startDate);
      const endISO = endDate ? toPhilippineISO(endDate) : null;

      // Auto-generate title combining subject and term
      const examTitle = `${selectedSubject.name} - ${selectedTerm.title}`;
      const examDesc = description.trim()
        ? `🎓 ${selectedTerm.title} · ${description.trim()}`
        : `🎓 Exam Session · ${selectedTerm.title}`;

      await powerSync.execute(
        `INSERT INTO CalendarEvent
          (id, title, description, startDate, endDate, allDay, location, color, subjectId, userId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          examTitle,
          examDesc,
          startISO,
          endISO,
          0,
          location.trim() || null,
          '#8B5CF6',
          selectedSubject.id,
          userId,
          now,
          now,
        ]
      );

      handleClose();
    } catch (err) {
      console.error('[AddExam] Failed to save exam:', err);
      setError('Failed to save exam schedule. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const { min: termMin, max: termMax } = getTermDateBounds();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoid}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.examBadge}>
                <GraduationCap size={16} color="#8B5CF6" />
              </View>
              <Text style={styles.headerTitle}>New Exam Schedule</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color="#94A3B8" />
            </Pressable>
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
            {/* ── 1. EXAM TERM SELECTOR ── */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Exam Term *</Text>
                {selectedTerm && (
                  <Text style={styles.termRangeBadge}>
                    {formatDateShort(selectedTerm.startDate)} – {formatDateShort(selectedTerm.endDate)}
                  </Text>
                )}
              </View>

              {examTerms.length === 0 ? (
                <View style={styles.noTermsBox}>
                  <Text style={styles.noTermsText}>No Exam Periods set yet.</Text>
                  <Pressable
                    style={styles.createTermBtn}
                    onPress={() => {
                      handleClose();
                      onOpenAddExamWeek?.();
                    }}
                  >
                    <Plus size={14} color="#8B5CF6" />
                    <Text style={styles.createTermBtnText}>Add Exam Period</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[styles.picker, showTermPicker && styles.pickerActive]}
                  onPress={() => {
                    setShowTermPicker((v) => !v);
                    setShowSubjectPicker(false);
                  }}
                >
                  <View style={styles.pickerLeft}>
                    <GraduationCap size={16} color="#8B5CF6" />
                    <Text style={selectedTerm ? styles.pickerText : styles.pickerPlaceholder}>
                      {selectedTerm ? getCleanPeriodTitle(selectedTerm.title) : 'Select Exam Term...'}
                    </Text>
                  </View>
                  <ChevronDown
                    size={16}
                    color="#94A3B8"
                    style={{ transform: [{ rotate: showTermPicker ? '180deg' : '0deg' }] }}
                  />
                </Pressable>
              )}

              {/* Term Dropdown List */}
              {showTermPicker && examTerms.length > 0 && (
                <View style={styles.dropdownList}>
                  {examTerms.map((ew) => {
                    const isSelected = ew.id === selectedTermId;
                    return (
                      <Pressable
                        key={ew.id}
                        style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                        onPress={() => handleSelectTerm(ew)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                            {getCleanPeriodTitle(ew.title)}
                          </Text>
                          <Text style={styles.dropdownItemSub}>
                            {formatDateShort(ew.startDate)} – {formatDateShort(ew.endDate)}
                          </Text>
                        </View>
                        {isSelected && <Check size={16} color="#8B5CF6" />}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ── 2. SUBJECT (REQUIRED, RELOCATED BELOW TERM) ── */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Subject *</Text>
              <Pressable
                style={[styles.picker, showSubjectPicker && styles.pickerActive]}
                onPress={() => {
                  setShowSubjectPicker((v) => !v);
                  setShowTermPicker(false);
                }}
              >
                {selectedSubject ? (
                  <View style={styles.pickerLeft}>
                    <View style={[styles.subjectDot, { backgroundColor: selectedSubject.color || '#6C8EFF' }]} />
                    <Text style={styles.pickerText}>{selectedSubject.name}</Text>
                  </View>
                ) : (
                  <View style={styles.pickerLeft}>
                    <BookOpen size={16} color="#94A3B8" />
                    <Text style={styles.pickerPlaceholder}>Select subject for this exam...</Text>
                  </View>
                )}
                <ChevronDown
                  size={16}
                  color="#94A3B8"
                  style={{ transform: [{ rotate: showSubjectPicker ? '180deg' : '0deg' }] }}
                />
              </Pressable>

              {/* Subject Dropdown */}
              {showSubjectPicker && (
                <View style={styles.dropdownList}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {subjects.map((sub) => {
                      const isSelected = sub.id === selectedSubjectId;
                      return (
                        <Pressable
                          key={sub.id}
                          style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                          onPress={() => {
                            setSelectedSubjectId(sub.id);
                            setShowSubjectPicker(false);
                            setError(null);
                          }}
                        >
                          <View style={[styles.subjectDot, { backgroundColor: sub.color || '#6C8EFF' }]} />
                          <Text
                            style={[
                              styles.dropdownItemText,
                              isSelected && styles.dropdownItemTextSelected,
                              { flex: 1 },
                            ]}
                          >
                            {sub.name}
                          </Text>
                          {isSelected && <Check size={16} color="#6C8EFF" />}
                        </Pressable>
                      );
                    })}

                    {/* Inline Create Subject Option */}
                    {!isCreatingSubject ? (
                      <Pressable
                        style={styles.addSubjectRow}
                        onPress={() => setIsCreatingSubject(true)}
                      >
                        <Plus size={16} color="#6C8EFF" />
                        <Text style={styles.addSubjectText}>+ Create New Subject</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.newSubjectBox}>
                        <Text style={styles.newSubjectTitle}>New Subject</Text>
                        <TextInput
                          style={styles.newSubjectInput}
                          placeholder="e.g. Physics 101"
                          placeholderTextColor="#64748B"
                          value={newSubjectName}
                          onChangeText={setNewSubjectName}
                          autoFocus
                        />
                        <View style={styles.colorRow}>
                          {PRESET_COLORS.slice(0, 5).map((c) => (
                            <Pressable
                              key={c}
                              style={[
                                styles.colorSwatch,
                                { backgroundColor: c },
                                newSubjectColor === c && styles.colorSwatchActive,
                              ]}
                              onPress={() => setNewSubjectColor(c)}
                            />
                          ))}
                        </View>
                        <View style={styles.newSubjectActions}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onPress={() => setIsCreatingSubject(false)}
                          >
                            <Text style={{ color: '#94A3B8' }}>Cancel</Text>
                          </Button>
                          <Button
                            size="sm"
                            onPress={handleCreateSubject}
                            disabled={isSavingSubject || !newSubjectName.trim()}
                          >
                            {isSavingSubject ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text>Save</Text>
                            )}
                          </Button>
                        </View>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* ── 3. DATE & TIME (BOUNDED TO EXAM TERM) ── */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Start Date & Time *</Text>
                {selectedTerm && (
                  <Text style={styles.boundHint}>
                    Limited to {selectedTerm.title}
                  </Text>
                )}
              </View>
              <Pressable style={styles.picker} onPress={() => openDatePicker('start')}>
                <Text style={styles.pickerText}>{formatDateTime(startDate)}</Text>
                <Calendar size={16} color="#94A3B8" />
              </Pressable>

              {Platform.OS === 'ios' && activeDateField === 'start' && datePickerStep !== null && (
                <View style={styles.iosPickerWrapper}>
                  <DateTimePicker
                    value={startDate}
                    mode="datetime"
                    minimumDate={termMin ?? new Date()}
                    maximumDate={termMax}
                    display="spinner"
                    onChange={handleDateChange}
                    textColor="#ffffff"
                    themeVariant="dark"
                    style={styles.iosPicker}
                  />
                  <Pressable style={styles.iosDoneBtn} onPress={handleIOSDone}>
                    <Text style={styles.iosDoneBtnText}>Done</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* End Date & Time */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>End Date & Time (Optional)</Text>
                {endDate && (
                  <Pressable onPress={() => setEndDate(null)} style={styles.clearBtn} hitSlop={8}>
                    <X size={12} color="#EF4444" />
                    <Text style={styles.clearBtnText}>Clear</Text>
                  </Pressable>
                )}
              </View>
              <Pressable
                style={[styles.picker, !startDate && styles.pickerDisabled]}
                onPress={() => openDatePicker('end')}
                disabled={!startDate}
              >
                <Text style={endDate ? styles.pickerText : styles.pickerPlaceholder}>
                  {!startDate
                    ? 'Select start date first'
                    : endDate
                    ? formatDateTime(endDate)
                    : 'Select exam end time...'}
                </Text>
                <Clock size={16} color={!startDate ? '#475569' : '#94A3B8'} />
              </Pressable>

              {Platform.OS === 'ios' && activeDateField === 'end' && datePickerStep !== null && startDate && (
                <View style={styles.iosPickerWrapper}>
                  <DateTimePicker
                    value={endDate && endDate >= startDate ? endDate : startDate}
                    mode="datetime"
                    minimumDate={startDate}
                    maximumDate={termMax}
                    display="spinner"
                    onChange={handleDateChange}
                    textColor="#ffffff"
                    themeVariant="dark"
                    style={styles.iosPicker}
                  />
                  <Pressable style={styles.iosDoneBtn} onPress={handleIOSDone}>
                    <Text style={styles.iosDoneBtnText}>Done</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* ── 4. ROOM / VENUE ── */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Room / Venue (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Room 402, Science Hall / Online"
                placeholderTextColor="#64748B"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            {/* ── 5. COVERAGE / NOTES ── */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Exam Coverage / Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="e.g. Chapters 1–4, formula sheet allowed"
                placeholderTextColor="#64748B"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Submit Button */}
            <Button
              style={styles.submitBtn}
              onPress={handleAddExam}
              disabled={isLoading || !selectedSubjectId || !selectedTermId}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Add Exam Schedule</Text>
              )}
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
  sheet: {
    backgroundColor: '#161B26',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: '#2A3143',
    maxHeight: '92%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3143',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  examBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 6,
  },
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
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  termRangeBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  boundHint: {
    fontSize: 11,
    color: '#64748B',
  },
  picker: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerActive: {
    borderColor: '#8B5CF6',
  },
  pickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pickerText: {
    color: '#ffffff',
    fontSize: 14,
  },
  pickerPlaceholder: {
    color: '#64748B',
    fontSize: 14,
  },
  pickerDisabled: {
    opacity: 0.45,
    backgroundColor: '#0F131D',
    borderColor: '#1E2433',
  },
  dropdownList: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 10,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2433',
    gap: 10,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  dropdownItemText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownItemTextSelected: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  dropdownItemSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  subjectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  addSubjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addSubjectText: {
    color: '#6C8EFF',
    fontSize: 13,
    fontWeight: '600',
  },
  newSubjectBox: {
    padding: 12,
    backgroundColor: '#161B26',
    borderTopWidth: 1,
    borderTopColor: '#2A3143',
  },
  newSubjectTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  newSubjectInput: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  colorSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  colorSwatchActive: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  newSubjectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  noTermsBox: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  noTermsText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  createTermBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  createTermBtnText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#ffffff',
    fontSize: 14,
  },
  multiline: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
  iosPickerWrapper: {
    marginTop: 8,
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 10,
    overflow: 'hidden',
  },
  iosPicker: {
    height: 150,
  },
  iosDoneBtn: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#2A3143',
  },
  iosDoneBtnText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#8B5CF6',
    marginTop: 8,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
