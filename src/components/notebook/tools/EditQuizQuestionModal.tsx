import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/src/components/ui/text';
import { useTheme } from '@/src/theme/useTheme';
import { QuizQuestion } from '@/src/store/notebookToolsStore';
import { X, Trash2, Check, CheckCircle2 } from 'lucide-react-native';

interface EditQuizQuestionModalProps {
  visible: boolean;
  onClose: () => void;
  question?: QuizQuestion | null;
  onSave: (data: { question: string; options: string[]; correctAnswer: number; explanation?: string }) => Promise<void>;
  onDelete?: (questionId: string) => Promise<void>;
}

export function EditQuizQuestionModal({
  visible,
  onClose,
  question,
  onSave,
  onDelete,
}: EditQuizQuestionModalProps) {
  const { colors, isDark } = useTheme();
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (question) {
      setQuestionText(question.question);
      setOptions(question.options.length === 4 ? [...question.options] : [...question.options, '', '', ''].slice(0, 4));
      setCorrectAnswer(question.correctAnswer ?? 0);
      setExplanation(question.explanation ?? '');
    } else {
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrectAnswer(0);
      setExplanation('');
    }
  }, [question, visible]);

  const styles = createStyles(colors, isDark);

  const handleSave = async () => {
    if (!questionText.trim()) {
      Alert.alert('Required', 'Please enter a question.');
      return;
    }
    if (options.some((opt) => !opt.trim())) {
      Alert.alert('Required', 'Please provide text for all 4 choices.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        question: questionText.trim(),
        options: options.map((o) => o.trim()),
        correctAnswer,
        explanation: explanation.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save question.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!question || !onDelete) return;
    Alert.alert('Delete Question', 'Are you sure you want to delete this question?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await onDelete(question.id);
            onClose();
          } catch (err: any) {
            const raw = err?.message || '';
            const msg = raw.includes('Network request failed') || raw.includes('http')
              ? 'Failed to delete question. Please check your connection.'
              : raw || 'Failed to delete question.';
            Alert.alert('Error', msg);
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  const isEditing = !!question;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={isSaving ? undefined : onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{isEditing ? 'Edit Question' : 'Add Quiz Question'}</Text>
            <View style={styles.headerActions}>
              {isEditing && onDelete && (
                <Pressable onPress={handleDelete} disabled={isDeleting} style={styles.deleteBtn}>
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Trash2 size={18} color="#EF4444" />
                  )}
                </Pressable>
              )}
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.scrollBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Text style={styles.fieldLabel}>QUESTION</Text>
            <TextInput
              value={questionText}
              onChangeText={setQuestionText}
              placeholder="e.g. Which scheduling algorithm guarantees minimum average waiting time?"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.fieldLabel}>ANSWER CHOICES (TAP RADIO TO MARK CORRECT)</Text>
            {options.map((opt, idx) => {
              const isSelected = correctAnswer === idx;
              const labels = ['A', 'B', 'C', 'D'];
              return (
                <View key={idx} style={[styles.optionRow, isSelected && styles.optionRowSelected]}>
                  <Pressable
                    onPress={() => setCorrectAnswer(idx)}
                    style={[styles.radioBtn, isSelected && styles.radioBtnSelected]}
                  >
                    {isSelected ? (
                      <CheckCircle2 size={18} color="#10B981" />
                    ) : (
                      <Text style={styles.radioLabel}>{labels[idx]}</Text>
                    )}
                  </Pressable>
                  <TextInput
                    value={opt}
                    onChangeText={(val) => {
                      const updated = [...options];
                      updated[idx] = val;
                      setOptions(updated);
                    }}
                    placeholder={`Option ${labels[idx]}`}
                    placeholderTextColor={colors.mutedForeground}
                    style={styles.optionInput}
                  />
                </View>
              );
            })}

            <Text style={styles.fieldLabel}>EXPLANATION (OPTIONAL)</Text>
            <TextInput
              value={explanation}
              onChangeText={setExplanation}
              placeholder="Why is this answer correct? Explanations help when reviewing."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={3}
            />

            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={16} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Add Question'}</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    keyboardAvoid: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '88%',
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 17,
      color: colors.foreground,
      letterSpacing: -0.4,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    deleteBtn: {
      padding: 8,
      borderRadius: 8,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
    },
    scrollBody: {
      maxHeight: 520,
    },
    fieldLabel: {
      fontFamily: 'Inter-Bold',
      fontSize: 11,
      color: colors.mutedForeground,
      letterSpacing: 1.2,
      includeFontPadding: false,
      marginTop: 10,
      marginBottom: 6,
    },
    input: {
      backgroundColor: isDark ? '#181A20' : '#FAFAFA',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontFamily: 'Inter',
      fontSize: 14,
      color: colors.foreground,
    },
    textArea: {
      minHeight: 65,
      textAlignVertical: 'top',
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#181A20' : '#FAFAFA',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 8,
    },
    optionRowSelected: {
      borderColor: '#10B981',
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5',
    },
    radioBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    radioBtnSelected: {
      borderColor: '#10B981',
    },
    radioLabel: {
      fontFamily: 'Inter-Bold',
      fontSize: 12,
      color: colors.mutedForeground,
      includeFontPadding: false,
    },
    optionInput: {
      flex: 1,
      fontFamily: 'Inter',
      fontSize: 13.5,
      color: colors.foreground,
      paddingVertical: 8,
    },
    saveBtn: {
      backgroundColor: '#6366F1',
      paddingVertical: 13,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
      marginBottom: 10,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      fontFamily: 'Inter-Bold',
      fontSize: 14,
      color: '#FFFFFF',
      letterSpacing: -0.2,
      includeFontPadding: false,
    },
  });
