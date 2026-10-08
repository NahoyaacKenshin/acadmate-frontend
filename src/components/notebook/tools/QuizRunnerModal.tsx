import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Text as RNText,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/src/components/ui/text';
import { useTheme } from '@/src/theme/useTheme';
import { QuizDetail, QuizQuestion, QuizResult } from '@/src/store/notebookToolsStore';
import { EditQuizQuestionModal } from './EditQuizQuestionModal';
import {
  ArrowLeft,
  PenLine,
  Plus,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trophy,
  RotateCcw,
  Check,
} from 'lucide-react-native';

interface QuizRunnerModalProps {
  visible: boolean;
  onClose: () => void;
  quiz: QuizDetail | null;
  onSubmitAttempt: (quizId: string, answers: number[]) => Promise<QuizResult>;
  onUpdateQuestion: (quizId: string, questionId: string, data: { question?: string; options?: string[]; correctAnswer?: number; explanation?: string }) => Promise<void>;
  onAddQuestion: (quizId: string, data: { question: string; options: string[]; correctAnswer: number; explanation?: string }) => Promise<any>;
  onDeleteQuestion: (quizId: string, questionId: string) => Promise<void>;
  isOnline: boolean;
}

export function QuizRunnerModal({
  visible,
  onClose,
  quiz,
  onSubmitAttempt,
  onUpdateQuestion,
  onAddQuestion,
  onDeleteQuestion,
  isOnline,
}: QuizRunnerModalProps) {
  const { colors, isDark } = useTheme();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  // Edit / Add modal
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);

  const prevQuizIdRef = useRef<string | null>(quiz?.id ?? null);
  const prevVisibleRef = useRef<boolean>(false);

  useEffect(() => {
    // If currently submitting or results are already displayed, do not touch index or state
    if (isSubmitting || result) return;

    const isOpening = visible && !prevVisibleRef.current;
    const isNewQuiz = !!quiz?.id && quiz.id !== prevQuizIdRef.current;

    prevVisibleRef.current = visible;
    if (quiz?.id) {
      prevQuizIdRef.current = quiz.id;
    }

    if (visible && quiz?.questions) {
      if (isOpening || isNewQuiz) {
        setQuestions([...quiz.questions]);
        setCurrentIndex(0);
        setSelectedAnswers({});
        setResult(null);
      } else {
        // Sync questions without resetting current question position!
        setQuestions([...quiz.questions]);
        setCurrentIndex((prevIdx) => Math.min(prevIdx, Math.max(0, quiz.questions.length - 1)));
      }
    } else if (!visible) {
      setSelectedAnswers({});
      setResult(null);
    }
  }, [quiz, visible, isSubmitting, result]);

  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );
  const styles = createStyles(colors, isDark, topInset);

  if (!quiz || questions.length === 0) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
          <View style={styles.topHeader}>
            <Pressable onPress={onClose} style={styles.backBtn}>
              <ArrowLeft size={20} color="#6366F1" />
            </Pressable>
            <Text style={styles.headerTitle}>{quiz?.title ?? 'Quiz'}</Text>
          </View>
          <View style={styles.emptyContainer}>
            <HelpCircle size={40} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No questions in this quiz yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the button below to add your first question.
            </Text>
            <Pressable
              onPress={() => {
                setEditingQuestion(null);
                setIsEditModalVisible(true);
              }}
              style={styles.addFirstBtn}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addFirstBtnText}>Add Question</Text>
            </Pressable>
          </View>

          <EditQuizQuestionModal
            visible={isEditModalVisible}
            onClose={() => setIsEditModalVisible(false)}
            question={null}
            onSave={async (data) => {
              await onAddQuestion(quiz!.id, data);
            }}
          />
        </SafeAreaView>
      </Modal>
    );
  }

  const currentQ = questions[currentIndex];
  const total = questions.length;
  const progressRatio = (currentIndex + 1) / total;
  const currentSelected = selectedAnswers[currentIndex];
  const isAnswered = currentSelected !== undefined;

  const handleSelectOption = (optIndex: number) => {
    if (result) return; // Locked during review
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: optIndex }));
  };

  const handleNext = () => {
    if (currentIndex + 1 < total) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Check if unanswered
    const unansweredCount = questions.filter((_, idx) => selectedAnswers[idx] === undefined).length;
    if (unansweredCount > 0) {
      Alert.alert(
        'Unanswered Questions',
        `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`,
        [
          { text: 'Keep Answering', style: 'cancel' },
          { text: 'Submit Anyway', onPress: () => finalizeSubmission() },
        ]
      );
      return;
    }
    finalizeSubmission();
  };

  const finalizeSubmission = async () => {
    setIsSubmitting(true);
    const answersArray = questions.map((_, idx) => selectedAnswers[idx] ?? -1);

    try {
      if (isOnline) {
        const res = await onSubmitAttempt(quiz.id, answersArray);
        setResult(res);
      } else {
        // Offline scoring calculation
        let score = 0;
        const results = questions.map((q, idx) => {
          const selected = answersArray[idx];
          const isCorrect = selected === q.correctAnswer;
          if (isCorrect) score++;
          return {
            questionId: q.id,
            question: q.question,
            selected,
            correctAnswer: q.correctAnswer,
            isCorrect,
            explanation: q.explanation,
          };
        });

        setResult({
          attemptId: `offline_${Date.now()}`,
          score,
          total: questions.length,
          percentage: Math.round((score / questions.length) * 100),
          results,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      Alert.alert('Submission Error', err?.message || 'Failed to submit quiz attempt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setResult(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <ArrowLeft size={20} color="#6366F1" />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {quiz.title}
            </Text>
            <Text style={styles.headerSubtitle}>
              {result
                ? 'Quiz Results Review'
                : isSubmitting
                ? 'Grading Quiz...'
                : `Question ${currentIndex + 1} of ${total}`}
            </Text>
          </View>

          {!result && !isSubmitting && (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => {
                  setEditingQuestion(currentQ);
                  setIsEditModalVisible(true);
                }}
                style={styles.iconBtn}
              >
                <PenLine size={17} color={colors.foreground} />
              </Pressable>
              <Pressable
                onPress={() => {
                  setEditingQuestion(null);
                  setIsEditModalVisible(true);
                }}
                style={styles.iconBtn}
              >
                <Plus size={18} color="#6366F1" />
              </Pressable>
            </View>
          )}
        </View>

        {!result && !isSubmitting && (
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
          </View>
        )}

        {isSubmitting ? (
          <View style={styles.submittingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.submittingTitle}>Grading Quiz</Text>
            <Text style={styles.submittingSubtitle}>Calculating your score and review breakdown…</Text>
          </View>
        ) : !result ? (
          <>
            {/* Quiz Body */}
            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.questionIndexLabel}>QUESTION {currentIndex + 1}</Text>
              <Text style={styles.questionText}>{currentQ.question}</Text>

              <View style={styles.optionsWrap}>
                {currentQ.options.map((opt, idx) => {
                  const isSelected = currentSelected === idx;
                  const labels = ['A', 'B', 'C', 'D'];
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => handleSelectOption(idx)}
                      style={[
                        styles.optionCard,
                        isSelected && styles.optionCardSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.optionPill,
                          isSelected && styles.optionPillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            isSelected && styles.optionPillTextSelected,
                          ]}
                        >
                          {labels[idx]}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.optionContentText,
                          isSelected && styles.optionContentTextSelected,
                        ]}
                      >
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Bottom Stepper Bar */}
            <View style={styles.bottomBar}>
              <Pressable
                onPress={handlePrev}
                disabled={currentIndex === 0}
                style={[styles.stepperBtn, currentIndex === 0 && styles.stepperBtnDisabled]}
              >
                <Text style={styles.stepperBtnText}>Previous</Text>
              </Pressable>

              {currentIndex + 1 === total ? (
                <Pressable
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  style={styles.submitBtn}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={16} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Submit Quiz</Text>
                    </>
                  )}
                </Pressable>
              ) : (
                <Pressable onPress={handleNext} style={styles.nextBtn}>
                  <Text style={styles.nextBtnText}>Next</Text>
                </Pressable>
              )}
            </View>
          </>
        ) : (
          /* Results & Review Screen */
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.resultsContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Score Card Header */}
            <View style={styles.resultsSummaryCard}>
              <View style={styles.trophyWrap}>
                <Trophy size={40} color="#6366F1" />
              </View>
              <Text style={styles.resultsTitle}>Quiz Completed</Text>
              <RNText style={styles.scorePercentageText}>{result.percentage}%</RNText>
              <Text style={styles.scoreDetailsText}>
                {result.score} out of {result.total} questions correct
              </Text>

              <Pressable onPress={handleRetake} style={styles.retakeBtn}>
                <RotateCcw size={16} color="#FFFFFF" />
                <Text style={styles.retakeBtnText}>Retake Quiz</Text>
              </Pressable>
            </View>

            <Text style={styles.reviewSectionHeader}>DETAILED REVIEW</Text>

            {result.results.map((item, idx) => {
              const labels = ['A', 'B', 'C', 'D'];
              const originalQ = questions[idx];
              return (
                <View key={item.questionId} style={styles.reviewCard}>
                  <View style={styles.reviewCardHeader}>
                    <Text style={styles.reviewCardIndex}>Q{idx + 1}</Text>
                    <View
                      style={[
                        styles.reviewStatusBadge,
                        item.isCorrect ? styles.reviewStatusCorrect : styles.reviewStatusWrong,
                      ]}
                    >
                      {item.isCorrect ? (
                        <CheckCircle2 size={13} color="#10B981" />
                      ) : (
                        <XCircle size={13} color="#EF4444" />
                      )}
                      <Text
                        style={[
                          styles.reviewStatusText,
                          item.isCorrect ? styles.reviewStatusTextCorrect : styles.reviewStatusTextWrong,
                        ]}
                      >
                        {item.isCorrect ? 'Correct' : 'Incorrect'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reviewQuestionText}>{item.question}</Text>

                  {/* Answers breakdown */}
                  <View style={styles.reviewOptionsList}>
                    {originalQ?.options.map((opt, optIdx) => {
                      const isCorrectAnswer = optIdx === item.correctAnswer;
                      const isUserSelected = optIdx === item.selected;
                      let borderColor = colors.border;
                      let bgColor = 'transparent';

                      if (isCorrectAnswer) {
                        borderColor = '#10B981';
                        bgColor = isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5';
                      } else if (isUserSelected && !item.isCorrect) {
                        borderColor = '#EF4444';
                        bgColor = isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2';
                      }

                      return (
                        <View
                          key={optIdx}
                          style={[
                            styles.reviewOptionRow,
                            { borderColor, backgroundColor: bgColor },
                          ]}
                        >
                          <Text style={styles.reviewOptionLetter}>{labels[optIdx]}.</Text>
                          <Text style={styles.reviewOptionText}>{opt}</Text>
                          {isUserSelected && (
                            <Text style={styles.yourAnswerPill}>Your answer</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {item.explanation && (
                    <View style={styles.explanationBox}>
                      <Text style={styles.explanationTitle}>Explanation</Text>
                      <Text style={styles.explanationText}>{item.explanation}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Question Edit/Add Modal */}
        <EditQuizQuestionModal
          visible={isEditModalVisible}
          onClose={() => setIsEditModalVisible(false)}
          question={editingQuestion}
          onSave={async (data) => {
            if (editingQuestion) {
              await onUpdateQuestion(quiz.id, editingQuestion.id, data);
              setQuestions((prev) =>
                prev.map((q) => (q.id === editingQuestion.id ? { ...q, ...data } : q))
              );
            } else {
              const created = await onAddQuestion(quiz.id, data);
              setQuestions((prev) => [...prev, created]);
            }
          }}
          onDelete={async (qId) => {
            await onDeleteQuestion(quiz.id, qId);
            const remaining = questions.filter((q) => q.id !== qId);
            setQuestions(remaining);
            if (currentIndex >= remaining.length) {
              setCurrentIndex(Math.max(0, remaining.length - 1));
            }
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean, topInset: number = 0) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: topInset > 0 ? topInset + 10 : 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    backBtn: {
      padding: 6,
      marginRight: 8,
    },
    headerTitleWrap: {
      flex: 1,
    },
    headerTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 16,
      color: colors.foreground,
      letterSpacing: -0.3,
    },
    headerSubtitle: {
      fontFamily: 'Inter',
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    iconBtn: {
      padding: 8,
      borderRadius: 8,
    },
    progressBarTrack: {
      height: 4,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E4E4E7',
      width: '100%',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#6366F1',
    },
    scrollBody: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    questionIndexLabel: {
      fontFamily: 'Inter-Bold',
      fontSize: 11,
      color: colors.mutedForeground,
      letterSpacing: 1.5,
      includeFontPadding: false,
      marginBottom: 8,
    },
    questionText: {
      fontFamily: 'Inter-Bold',
      fontSize: 18,
      lineHeight: 26,
      color: colors.foreground,
      marginBottom: 24,
    },
    optionsWrap: {
      gap: 12,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: 14,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 3,
      elevation: 2,
    },
    optionCardSelected: {
      borderColor: '#6366F1',
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF',
    },
    optionPill: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? '#1C1F2E' : '#F4F4F5',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    optionPillSelected: {
      backgroundColor: '#6366F1',
    },
    optionPillText: {
      fontFamily: 'Inter-Bold',
      fontSize: 13,
      color: colors.mutedForeground,
      includeFontPadding: false,
    },
    optionPillTextSelected: {
      color: '#FFFFFF',
    },
    optionContentText: {
      flex: 1,
      fontFamily: 'Inter-Medium',
      fontSize: 14.5,
      lineHeight: 20,
      color: colors.foreground,
    },
    optionContentTextSelected: {
      color: '#6366F1',
      fontWeight: '600',
    },
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
    },
    stepperBtn: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    stepperBtnDisabled: {
      opacity: 0.35,
    },
    stepperBtnText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 13.5,
      color: colors.foreground,
    },
    nextBtn: {
      flex: 1,
      backgroundColor: '#6366F1',
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    nextBtnText: {
      fontFamily: 'Inter-Bold',
      fontSize: 14,
      color: '#FFFFFF',
    },
    submitBtn: {
      flex: 1,
      backgroundColor: '#10B981',
      paddingVertical: 12,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    submitBtnText: {
      fontFamily: 'Inter-Bold',
      fontSize: 14,
      color: '#FFFFFF',
    },
    resultsContent: {
      padding: 20,
      paddingBottom: 40,
    },
    submittingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    submittingTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 18,
      lineHeight: 24,
      color: colors.foreground,
      marginTop: 16,
      marginBottom: 6,
      includeFontPadding: false,
    },
    submittingSubtitle: {
      fontFamily: 'Inter',
      fontSize: 14,
      lineHeight: 20,
      color: colors.mutedForeground,
      textAlign: 'center',
      includeFontPadding: false,
    },
    resultsSummaryCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: 'center',
      marginBottom: 24,
    },
    trophyWrap: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    resultsTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 19,
      lineHeight: 26,
      color: colors.foreground,
      marginBottom: 4,
      includeFontPadding: false,
    },
    scorePercentageText: {
      fontFamily: 'Inter-Bold',
      fontSize: 44,
      lineHeight: 56,
      color: '#6366F1',
      letterSpacing: -1,
      textAlign: 'center',
      includeFontPadding: false,
      paddingVertical: 6,
      paddingHorizontal: 12,
      marginVertical: 4,
    },
    scoreDetailsText: {
      fontFamily: 'Inter',
      fontSize: 13.5,
      lineHeight: 20,
      color: colors.mutedForeground,
      marginBottom: 18,
      includeFontPadding: false,
    },
    retakeBtn: {
      backgroundColor: '#6366F1',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 11,
      paddingHorizontal: 22,
      borderRadius: 12,
    },
    retakeBtnText: {
      fontFamily: 'Inter-Bold',
      fontSize: 13.5,
      color: '#FFFFFF',
    },
    reviewSectionHeader: {
      fontFamily: 'Inter-Bold',
      fontSize: 12,
      color: colors.mutedForeground,
      letterSpacing: 1.2,
      marginBottom: 12,
      includeFontPadding: false,
    },
    reviewCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    reviewCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    reviewCardIndex: {
      fontFamily: 'Inter-Bold',
      fontSize: 13,
      color: colors.mutedForeground,
    },
    reviewStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    reviewStatusCorrect: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
    },
    reviewStatusWrong: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
    },
    reviewStatusText: {
      fontFamily: 'Inter-Bold',
      fontSize: 11,
      includeFontPadding: false,
    },
    reviewStatusTextCorrect: {
      color: '#10B981',
    },
    reviewStatusTextWrong: {
      color: '#EF4444',
    },
    reviewQuestionText: {
      fontFamily: 'Inter-Bold',
      fontSize: 15,
      lineHeight: 22,
      color: colors.foreground,
      marginBottom: 12,
    },
    reviewOptionsList: {
      gap: 8,
      marginBottom: 10,
    },
    reviewOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      gap: 8,
    },
    reviewOptionLetter: {
      fontFamily: 'Inter-Bold',
      fontSize: 12.5,
      color: colors.mutedForeground,
    },
    reviewOptionText: {
      flex: 1,
      fontFamily: 'Inter',
      fontSize: 13,
      color: colors.foreground,
    },
    yourAnswerPill: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 10,
      color: '#6366F1',
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    explanationBox: {
      backgroundColor: isDark ? '#181A20' : '#FAFAFA',
      borderRadius: 10,
      padding: 10,
      borderLeftWidth: 3,
      borderLeftColor: '#6366F1',
      marginTop: 4,
    },
    explanationTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 11,
      color: '#6366F1',
      letterSpacing: 0.5,
      marginBottom: 3,
    },
    explanationText: {
      fontFamily: 'Inter',
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.foreground,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 30,
    },
    emptyTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 17,
      color: colors.foreground,
      marginTop: 14,
      marginBottom: 6,
    },
    emptySubtitle: {
      fontFamily: 'Inter',
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginBottom: 20,
    },
    addFirstBtn: {
      backgroundColor: '#6366F1',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 11,
      paddingHorizontal: 18,
      borderRadius: 12,
    },
    addFirstBtnText: {
      fontFamily: 'Inter-Bold',
      fontSize: 13,
      color: '#FFFFFF',
    },
  });
