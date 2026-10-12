import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from '@/src/components/ui/text';
import { useTheme } from '@/src/theme/useTheme';
import {
  useNotebookToolsStore,
  FlashcardDeckSummary,
  QuizSummary,
} from '@/src/store/notebookToolsStore';
import { CreateDeckModal } from './tools/CreateDeckModal';
import { CreateQuizModal } from './tools/CreateQuizModal';
import { FlashcardStudyModal } from './tools/FlashcardStudyModal';
import { QuizRunnerModal } from './tools/QuizRunnerModal';
import {
  Layers,
  HelpCircle,
  Plus,
  Play,
  RotateCw,
  Trophy,
  Trash2,
  WifiOff,
  Sparkles,
} from 'lucide-react-native';

interface ToolsTabContentProps {
  notebookId: string;
  notebookTitle: string;
  isOnline: boolean;
}

export function ToolsTabContent({
  notebookId,
  notebookTitle,
  isOnline,
}: ToolsTabContentProps) {
  const { colors, isDark } = useTheme();

  const {
    decksByNotebook,
    deckDetails,
    quizzesByNotebook,
    quizDetails,
    isLoading,
    isGenerating,
    fetchDeckDetail,
    generateFlashcards,
    createDeck,
    deleteDeck,
    toggleCardMastered,
    updateCard,
    addCard,
    deleteCard,
    fetchQuizDetail,
    generateQuiz,
    createQuiz,
    deleteQuiz,
    submitQuizAttempt,
    updateQuestion,
    addQuestion,
    deleteQuestion,
  } = useNotebookToolsStore();

  const decks = decksByNotebook[notebookId] || [];
  const quizzes = quizzesByNotebook[notebookId] || [];

  // Modals
  const [isCreateDeckVisible, setIsCreateDeckVisible] = useState(false);
  const [isCreateQuizVisible, setIsCreateQuizVisible] = useState(false);

  // Active study / quiz sessions
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  const styles = createStyles(colors, isDark);

  const handleOpenDeck = async (deckId: string) => {
    setLoadingItemId(deckId);
    try {
      await fetchDeckDetail(deckId);
      setActiveDeckId(deckId);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load deck details.');
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleDeleteDeck = (deck: FlashcardDeckSummary) => {
    Alert.alert('Delete Deck', `Are you sure you want to delete "${deck.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDeck(deck.id, notebookId);
          } catch (err: any) {
            const raw = err?.message || '';
            const msg = raw.includes('Network request failed') || raw.includes('http')
              ? 'Failed to delete deck. Please check your connection.'
              : raw || 'Failed to delete deck.';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  const handleOpenQuiz = async (quizId: string) => {
    setLoadingItemId(quizId);
    try {
      await fetchQuizDetail(quizId);
      setActiveQuizId(quizId);
    } catch (err: any) {
      const raw = err?.message || '';
      const msg = raw.includes('Network request failed') || raw.includes('http')
        ? 'Could not load quiz details. Please check your connection.'
        : raw || 'Could not load quiz details.';
      Alert.alert('Error', msg);
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleDeleteQuiz = (quiz: QuizSummary) => {
    Alert.alert('Delete Quiz', `Are you sure you want to delete "${quiz.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteQuiz(quiz.id, notebookId);
          } catch (err: any) {
            const raw = err?.message || '';
            const msg = raw.includes('Network request failed') || raw.includes('http')
              ? 'Failed to delete quiz. Please check your connection.'
              : raw || 'Failed to delete quiz.';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <WifiOff size={14} color={isDark ? '#F59E0B' : '#D97706'} />
          <Text style={styles.offlineBannerText}>
            Offline Mode — You can study cached flashcards and take quizzes. AI generation requires internet.
          </Text>
        </View>
      )}

      {/* ── Section: Flashcard Decks ── */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleRow}>
          <Layers size={16} color="#6366F1" />
          <Text style={styles.sectionTitle}>FLASHCARD DECKS</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{decks.length}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => setIsCreateDeckVisible(true)}
          style={styles.addBtn}
          accessibilityLabel="Create or generate flashcards"
        >
          <Plus size={14} color="#6366F1" />
          <Text style={styles.addBtnText}>New Deck</Text>
        </Pressable>
      </View>

      {decks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Layers size={32} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>No flashcards yet</Text>
          <Text style={styles.emptySubtitle}>
            Generate key concept cards with AI or build custom decks to test your memory.
          </Text>
          <Pressable
            onPress={() => setIsCreateDeckVisible(true)}
            style={styles.emptyActionBtn}
          >
            <Sparkles size={14} color="#FFFFFF" />
            <Text style={styles.emptyActionBtnText}>Generate with AI</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.cardsList}>
          {decks.map((deck) => {
            const masteryRate = deck.totalCards > 0
              ? Math.round((deck.masteredCards / deck.totalCards) * 100)
              : 0;
            const isDeckLoading = loadingItemId === deck.id;

            return (
              <View key={deck.id} style={styles.deckCard}>
                <View style={styles.deckTopRow}>
                  <View style={styles.deckInfo}>
                    <Text style={styles.deckTitle} numberOfLines={1}>
                      {deck.title}
                    </Text>
                    {deck.description && (
                      <Text style={styles.deckDescription} numberOfLines={1}>
                        {deck.description}
                      </Text>
                    )}
                  </View>

                  <Pressable
                    onPress={() => handleDeleteDeck(deck)}
                    style={styles.deleteIconBtn}
                  >
                    <Trash2 size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${masteryRate}%` }]} />
                </View>

                <View style={styles.deckBottomRow}>
                  <View style={styles.deckMetaRow}>
                    <Text style={styles.deckMetaText}>
                      {deck.totalCards} cards
                    </Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={[styles.deckMetaText, { color: '#10B981' }]}>
                      {deck.masteredCards} mastered ({masteryRate}%)
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => handleOpenDeck(deck.id)}
                    disabled={isDeckLoading}
                    style={styles.studyBtn}
                  >
                    {isDeckLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Play size={13} color="#FFFFFF" fill="#FFFFFF" />
                        <Text style={styles.studyBtnText}>Study</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Section: Quizzes ── */}
      <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
        <View style={styles.sectionTitleRow}>
          <HelpCircle size={16} color="#6366F1" />
          <Text style={styles.sectionTitle}>PRACTICE QUIZZES</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{quizzes.length}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => setIsCreateQuizVisible(true)}
          style={styles.addBtn}
          accessibilityLabel="Create or generate practice quiz"
        >
          <Plus size={14} color="#6366F1" />
          <Text style={styles.addBtnText}>New Quiz</Text>
        </Pressable>
      </View>

      {quizzes.length === 0 ? (
        <View style={styles.emptyCard}>
          <HelpCircle size={32} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>No quizzes yet</Text>
          <Text style={styles.emptySubtitle}>
            Create multiple-choice practice exams based on your uploaded lectures.
          </Text>
          <Pressable
            onPress={() => setIsCreateQuizVisible(true)}
            style={styles.emptyActionBtn}
          >
            <Sparkles size={14} color="#FFFFFF" />
            <Text style={styles.emptyActionBtnText}>Generate with AI</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.cardsList}>
          {quizzes.map((quiz) => {
            const isQuizLoading = loadingItemId === quiz.id;
            const bestScore = quiz.bestAttempt;

            return (
              <View key={quiz.id} style={styles.deckCard}>
                <View style={styles.deckTopRow}>
                  <View style={styles.deckInfo}>
                    <Text style={styles.deckTitle} numberOfLines={1}>
                      {quiz.title}
                    </Text>
                    {quiz.description && (
                      <Text style={styles.deckDescription} numberOfLines={1}>
                        {quiz.description}
                      </Text>
                    )}
                  </View>

                  <Pressable
                    onPress={() => handleDeleteQuiz(quiz)}
                    style={styles.deleteIconBtn}
                  >
                    <Trash2 size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>

                <View style={styles.deckBottomRow}>
                  <View style={styles.deckMetaRow}>
                    <Text style={styles.deckMetaText}>
                      {quiz.totalQuestions} questions
                    </Text>
                    {bestScore && (
                      <>
                        <Text style={styles.metaDot}>•</Text>
                        <View style={styles.scorePill}>
                          <Trophy size={11} color="#6366F1" />
                          <Text style={styles.scorePillText}>
                            Best: {bestScore.score}/{bestScore.total}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>

                  <Pressable
                    onPress={() => handleOpenQuiz(quiz.id)}
                    disabled={isQuizLoading}
                    style={styles.studyBtn}
                  >
                    {isQuizLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Play size={13} color="#FFFFFF" fill="#FFFFFF" />
                        <Text style={styles.studyBtnText}>Start</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Modals ── */}
      <CreateDeckModal
        visible={isCreateDeckVisible}
        onClose={() => setIsCreateDeckVisible(false)}
        notebookTitle={notebookTitle}
        isOnline={isOnline}
        isGenerating={isGenerating}
        onGenerate={async (count, title) => {
          await generateFlashcards(notebookId, { count, title });
        }}
        onCreateManual={async (title, desc) => {
          await createDeck(notebookId, { title, description: desc });
        }}
      />

      <CreateQuizModal
        visible={isCreateQuizVisible}
        onClose={() => setIsCreateQuizVisible(false)}
        notebookTitle={notebookTitle}
        isOnline={isOnline}
        isGenerating={isGenerating}
        onGenerate={async (count, title) => {
          await generateQuiz(notebookId, { count, title });
        }}
        onCreateManual={async (title, desc) => {
          await createQuiz(notebookId, { title, description: desc });
        }}
      />

      {/* Flashcard Study Modal */}
      {activeDeckId && deckDetails[activeDeckId] && (
        <FlashcardStudyModal
          visible={!!activeDeckId}
          onClose={() => setActiveDeckId(null)}
          deck={deckDetails[activeDeckId]}
          onToggleMastered={toggleCardMastered}
          onUpdateCard={updateCard}
          onAddCard={addCard}
          onDeleteCard={deleteCard}
        />
      )}

      {/* Quiz Runner Modal */}
      {activeQuizId && quizDetails[activeQuizId] && (
        <QuizRunnerModal
          visible={!!activeQuizId}
          onClose={() => setActiveQuizId(null)}
          quiz={quizDetails[activeQuizId]}
          onSubmitAttempt={submitQuizAttempt}
          onUpdateQuestion={updateQuestion}
          onAddQuestion={addQuestion}
          onDeleteQuestion={deleteQuestion}
          isOnline={isOnline}
        />
      )}
    </ScrollView>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      padding: 16,
      paddingBottom: 110, // Avoid bottom nav & floating FAB overlap
    },
    offlineBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A',
    },
    offlineBannerText: {
      fontFamily: 'Inter',
      fontSize: 12,
      color: isDark ? '#FCD34D' : '#B45309',
      flex: 1,
      lineHeight: 16,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    sectionTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 11.5,
      color: colors.mutedForeground,
      letterSpacing: 1.2,
      includeFontPadding: false,
    },
    countBadge: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E4E4E7',
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 8,
    },
    countBadgeText: {
      fontFamily: 'Inter-Bold',
      fontSize: 10.5,
      color: colors.foreground,
      includeFontPadding: false,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF',
    },
    addBtnText: {
      fontFamily: 'Inter-Bold',
      fontSize: 12,
      color: '#6366F1',
      includeFontPadding: false,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 15,
      color: colors.foreground,
      marginTop: 10,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontFamily: 'Inter',
      fontSize: 12.5,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    emptyActionBtn: {
      backgroundColor: '#6366F1',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    emptyActionBtnText: {
      fontFamily: 'Inter-Bold',
      fontSize: 12.5,
      color: '#FFFFFF',
      includeFontPadding: false,
    },
    cardsList: {
      gap: 10,
    },
    deckCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.25 : 0.04,
      shadowRadius: 3,
      elevation: 2,
    },
    deckTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    deckInfo: {
      flex: 1,
      marginRight: 8,
    },
    deckTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 15,
      color: colors.foreground,
      letterSpacing: -0.2,
      marginBottom: 2,
    },
    deckDescription: {
      fontFamily: 'Inter',
      fontSize: 12,
      color: colors.mutedForeground,
    },
    deleteIconBtn: {
      padding: 5,
      borderRadius: 6,
    },
    progressBarTrack: {
      height: 3.5,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E4E4E7',
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 12,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#10B981',
      borderRadius: 2,
    },
    deckBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    deckMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    deckMetaText: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      color: colors.mutedForeground,
    },
    metaDot: {
      fontFamily: 'Inter',
      fontSize: 11,
      color: colors.mutedForeground,
    },
    scorePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    scorePillText: {
      fontFamily: 'Inter-Bold',
      fontSize: 11,
      color: '#6366F1',
      includeFontPadding: false,
    },
    studyBtn: {
      backgroundColor: '#6366F1',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 8,
    },
    studyBtnText: {
      fontFamily: 'Inter-Bold',
      fontSize: 12.5,
      color: '#FFFFFF',
      includeFontPadding: false,
    },
  });
