import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/src/components/ui/text';
import { useTheme } from '@/src/theme/useTheme';
import { Flashcard, FlashcardDeckDetail } from '@/src/store/notebookToolsStore';
import { EditFlashcardModal } from './EditFlashcardModal';
import {
  ArrowLeft,
  RotateCw,
  Shuffle,
  PenLine,
  Plus,
  CheckCircle2,
  HelpCircle,
  Trophy,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface FlashcardStudyModalProps {
  visible: boolean;
  onClose: () => void;
  deck: FlashcardDeckDetail | null;
  onToggleMastered: (deckId: string, cardId: string) => Promise<boolean>;
  onUpdateCard: (deckId: string, cardId: string, data: { front?: string; back?: string; isMastered?: boolean }) => Promise<void>;
  onAddCard: (deckId: string, data: { front: string; back: string }) => Promise<any>;
  onDeleteCard: (deckId: string, cardId: string) => Promise<void>;
}

export function FlashcardStudyModal({
  visible,
  onClose,
  deck,
  onToggleMastered,
  onUpdateCard,
  onAddCard,
  onDeleteCard,
}: FlashcardStudyModalProps) {
  const { colors, isDark } = useTheme();

  const [cards, setCards] = useState<Flashcard[]>(() => (deck?.cards ? [...deck.cards] : []));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Edit/Add modal state
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);

  const prevDeckIdRef = useRef<string | null>(deck?.id ?? null);
  const prevVisibleRef = useRef<boolean>(false);

  useEffect(() => {
    const isOpening = visible && !prevVisibleRef.current;
    const isNewDeck = !!deck?.id && deck.id !== prevDeckIdRef.current;

    prevVisibleRef.current = visible;
    if (deck?.id) {
      prevDeckIdRef.current = deck.id;
    }

    if (visible && deck?.cards) {
      if (isOpening || isNewDeck) {
        setCards([...deck.cards]);
        setCurrentIndex(0);
        setIsFlipped(false);
        setIsCompleted(false);
      } else {
        // Sync cards data without resetting user's study position!
        setCards([...deck.cards]);
        setCurrentIndex((prevIdx) => Math.min(prevIdx, Math.max(0, deck.cards.length - 1)));
      }
    } else if (!visible) {
      setIsFlipped(false);
      setIsCompleted(false);
    }
  }, [deck, visible]);

  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );
  const styles = createStyles(colors, isDark, topInset);

  const total = cards.length;
  const currentCard = cards[currentIndex] ?? null;
  const progressRatio = total > 0 ? (currentIndex + 1) / total : 0;
  const masteredCount = cards.filter((c) => c.isMastered).length;

  // Swipe animation & tracking refs
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipingRef = useRef(false);

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const totalRef = useRef(total);
  totalRef.current = total;

  const goToNextCard = () => {
    const idx = currentIndexRef.current;
    const tot = totalRef.current;
    if (idx + 1 < tot) {
      Animated.timing(translateX, {
        toValue: -SCREEN_WIDTH * 0.75,
        duration: 160,
        useNativeDriver: true,
      }).start(() => {
        translateX.setValue(SCREEN_WIDTH * 0.5);
        setIsFlipped(false);
        setCurrentIndex(idx + 1);
        Animated.spring(translateX, {
          toValue: 0,
          damping: 18,
          stiffness: 140,
          useNativeDriver: true,
        }).start();
      });
    } else if (tot > 0) {
      Animated.timing(translateX, {
        toValue: -SCREEN_WIDTH * 0.75,
        duration: 160,
        useNativeDriver: true,
      }).start(() => {
        translateX.setValue(0);
        setIsCompleted(true);
      });
    }
  };

  const goToPrevCard = () => {
    const idx = currentIndexRef.current;
    if (idx > 0) {
      Animated.timing(translateX, {
        toValue: SCREEN_WIDTH * 0.75,
        duration: 160,
        useNativeDriver: true,
      }).start(() => {
        translateX.setValue(-SCREEN_WIDTH * 0.5);
        setIsFlipped(false);
        setCurrentIndex(idx - 1);
        Animated.spring(translateX, {
          toValue: 0,
          damping: 18,
          stiffness: 140,
          useNativeDriver: true,
        }).start();
      });
    } else {
      Animated.spring(translateX, {
        toValue: 0,
        damping: 16,
        stiffness: 140,
        useNativeDriver: true,
      }).start();
    }
  };

  const goToNextCardRef = useRef(goToNextCard);
  goToNextCardRef.current = goToNextCard;
  const goToPrevCardRef = useRef(goToPrevCard);
  goToPrevCardRef.current = goToPrevCard;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2
        );
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2
        );
      },
      onPanResponderGrant: () => {
        isSwipingRef.current = true;
      },
      onPanResponderMove: (_evt, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const swipeThreshold = 55;
        const velocityThreshold = 0.35;

        if (
          gestureState.dx < -swipeThreshold ||
          (gestureState.dx < -25 && gestureState.vx < -velocityThreshold)
        ) {
          goToNextCardRef.current();
        } else if (
          gestureState.dx > swipeThreshold ||
          (gestureState.dx > 25 && gestureState.vx > velocityThreshold)
        ) {
          goToPrevCardRef.current();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            damping: 16,
            stiffness: 140,
            useNativeDriver: true,
          }).start();
        }

        setTimeout(() => {
          isSwipingRef.current = false;
        }, 150);
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          damping: 16,
          stiffness: 140,
          useNativeDriver: true,
        }).start();
        isSwipingRef.current = false;
      },
    })
  ).current;

  const cardRotate = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const cardOpacity = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH, -SCREEN_WIDTH * 0.45, 0, SCREEN_WIDTH * 0.45, SCREEN_WIDTH],
    outputRange: [0.35, 0.9, 1, 0.9, 0.35],
    extrapolate: 'clamp',
  });

  const handleCardPress = () => {
    if (isSwipingRef.current) return;
    setIsFlipped((prev) => !prev);
  };

  // Mark only — does NOT advance to next card
  const handleMarkStillLearning = () => {
    if (!currentCard || !deck) return;
    if (currentCard.isMastered) {
      onUpdateCard(deck.id, currentCard.id, { isMastered: false });
      setCards((prev) =>
        prev.map((c) => (c.id === currentCard.id ? { ...c, isMastered: false } : c))
      );
    }
  };

  // Mark only — does NOT advance to next card
  const handleMarkMastered = () => {
    if (!currentCard || !deck) return;
    if (!currentCard.isMastered) {
      onUpdateCard(deck.id, currentCard.id, { isMastered: true });
      setCards((prev) =>
        prev.map((c) => (c.id === currentCard.id ? { ...c, isMastered: true } : c))
      );
    }
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
    translateX.setValue(0);
  };

  const handleRestart = (onlyUnmastered = false) => {
    if (!deck) return;
    if (onlyUnmastered) {
      const unmastered = deck.cards.filter((c) => !c.isMastered);
      if (unmastered.length === 0) {
        Alert.alert('All Mastered!', 'You have mastered all cards in this deck!');
        return;
      }
      setCards(unmastered);
    } else {
      setCards([...deck.cards]);
    }
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
    translateX.setValue(0);
  };

  if (!deck || cards.length === 0) {
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
            <Text style={styles.headerTitle}>{deck?.title ?? 'Flashcards'}</Text>
          </View>
          <View style={styles.emptyContainer}>
            <HelpCircle size={40} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No cards in this deck yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the button below to add your first flashcard.
            </Text>
            <Pressable
              onPress={() => {
                setEditingCard(null);
                setIsEditModalVisible(true);
              }}
              style={styles.addFirstBtn}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addFirstBtnText}>Add Flashcard</Text>
            </Pressable>
          </View>

          <EditFlashcardModal
            visible={isEditModalVisible}
            onClose={() => setIsEditModalVisible(false)}
            card={null}
            onSave={async (data) => {
              await onAddCard(deck!.id, data);
            }}
          />
        </SafeAreaView>
      </Modal>
    );
  }

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
              {deck.title}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isCompleted ? 'Session Complete' : `${currentIndex + 1} of ${total} Cards`}
            </Text>
          </View>

          {!isCompleted && (
            <View style={styles.headerActions}>
              <Pressable
                onPress={handleShuffle}
                style={({ pressed }) => [
                  styles.shuffleBtn,
                  pressed && { opacity: 0.75 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Randomize flashcards order"
              >
                <Shuffle size={14} color="#6366F1" strokeWidth={2.3} />
                <Text style={styles.shuffleBtnText}>Shuffle</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setEditingCard(currentCard);
                  setIsEditModalVisible(true);
                }}
                style={styles.iconBtn}
                accessibilityLabel="Edit current flashcard"
              >
                <PenLine size={17} color={colors.foreground} />
              </Pressable>

              <Pressable
                onPress={() => {
                  setEditingCard(null);
                  setIsEditModalVisible(true);
                }}
                style={styles.iconBtn}
                accessibilityLabel="Add new flashcard"
              >
                <Plus size={18} color="#6366F1" />
              </Pressable>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        {!isCompleted && (
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
          </View>
        )}

        {!isCompleted ? (
          <View style={styles.studyBody}>
            {/* Mastered Status Pill */}
            <View style={styles.statusBar}>
              <View style={[styles.statusPill, currentCard.isMastered ? styles.statusPillMastered : styles.statusPillLearning]}>
                <Text style={[styles.statusPillText, currentCard.isMastered ? styles.statusPillTextMastered : styles.statusPillTextLearning]}>
                  {currentCard.isMastered ? 'Mastered' : 'Still Learning'}
                </Text>
              </View>

              <Text style={styles.masteryCounterText}>
                {masteredCount} / {total} Mastered
              </Text>
            </View>

            {/* Swipable & Flippable Card Area */}
            <View style={styles.cardArea}>
              <Animated.View
                style={[
                  styles.cardAnimatedWrap,
                  {
                    transform: [{ translateX }, { rotate: cardRotate }],
                    opacity: cardOpacity,
                  },
                ]}
                {...panResponder.panHandlers}
              >
                <Pressable
                  onPress={handleCardPress}
                  style={[styles.card, isFlipped && styles.cardFlipped]}
                  accessibilityRole="button"
                  accessibilityLabel={isFlipped ? "Card flipped. Tap to view question" : "Card question. Tap to view answer"}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardSideLabel}>
                      {isFlipped ? 'ANSWER / DEFINITION' : 'QUESTION / TERM'}
                    </Text>
                    <RotateCw size={15} color={colors.mutedForeground} />
                  </View>

                  <ScrollView
                    style={styles.cardScroll}
                    contentContainerStyle={styles.cardScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={[styles.cardContentText, isFlipped && styles.cardContentTextBack]}>
                      {isFlipped ? currentCard.back : currentCard.front}
                    </Text>
                  </ScrollView>

                  <View style={styles.cardFooter}>
                    <Text style={styles.tapToFlipHint}>
                      {isFlipped ? 'Tap card to view front' : 'Tap card to flip answer'}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            </View>

            {/* Card Stepper Navigation Row */}
            <View style={styles.navRow}>
              <Pressable
                onPress={goToPrevCard}
                disabled={currentIndex === 0}
                style={[
                  styles.navStepBtn,
                  currentIndex === 0 && styles.navStepBtnDisabled,
                ]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Previous flashcard"
              >
                <ChevronLeft
                  size={18}
                  color={currentIndex === 0 ? colors.border : colors.foreground}
                />
                <Text
                  style={[
                    styles.navStepBtnText,
                    currentIndex === 0 && { color: colors.mutedForeground, opacity: 0.5 },
                  ]}
                >
                  Prev
                </Text>
              </Pressable>

              <Text style={styles.swipeHintText}>
                Swipe card or tap to move
              </Text>

              <Pressable
                onPress={goToNextCard}
                style={styles.navStepBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={currentIndex + 1 === total ? "Finish deck" : "Next flashcard"}
              >
                <Text style={[styles.navStepBtnText, { color: '#6366F1' }]}>
                  {currentIndex + 1 === total ? 'Finish' : 'Next'}
                </Text>
                <ChevronRight size={18} color="#6366F1" />
              </Pressable>
            </View>

            {/* Action Buttons: Mark status only, never advances card */}
            <View style={styles.actionsRow}>
              <Pressable
                onPress={handleMarkStillLearning}
                style={[
                  styles.learningBtn,
                  !currentCard.isMastered ? styles.learningBtnActive : styles.learningBtnInactive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Mark card as Still Learning"
              >
                <RotateCcw
                  size={16}
                  color={!currentCard.isMastered ? '#F59E0B' : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    {
                      color: !currentCard.isMastered ? '#F59E0B' : colors.mutedForeground,
                    },
                  ]}
                >
                  Still Learning
                </Text>
              </Pressable>

              <Pressable
                onPress={handleMarkMastered}
                style={[
                  styles.masteredBtn,
                  currentCard.isMastered ? styles.masteredBtnActive : styles.masteredBtnInactive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Mark card as Mastered"
              >
                <CheckCircle2
                  size={16}
                  color={currentCard.isMastered ? '#FFFFFF' : '#10B981'}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    {
                      color: currentCard.isMastered ? '#FFFFFF' : '#10B981',
                    },
                  ]}
                >
                  {currentCard.isMastered ? 'Mastered' : 'Mark Mastered'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Completion Screen */
          <View style={styles.completionBody}>
            <View style={styles.trophyWrap}>
              <Trophy size={48} color="#6366F1" />
            </View>

            <Text style={styles.completionTitle}>Deck Complete</Text>
            <Text style={styles.completionSubtitle}>
              Great session! Here is your mastery summary for this deck.
            </Text>

            <View style={styles.scoreCard}>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Total Cards Studied</Text>
                <Text style={styles.scoreVal}>{total}</Text>
              </View>
              <View style={styles.scoreDivider} />
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Cards Mastered</Text>
                <Text style={[styles.scoreVal, { color: '#10B981' }]}>{masteredCount}</Text>
              </View>
              <View style={styles.scoreDivider} />
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Still Learning</Text>
                <Text style={[styles.scoreVal, { color: '#F59E0B' }]}>{total - masteredCount}</Text>
              </View>
            </View>

            <View style={styles.completionActions}>
              <Pressable
                onPress={() => handleRestart(false)}
                style={styles.restartAllBtn}
              >
                <Text style={styles.restartAllBtnText}>Study All Cards Again</Text>
              </Pressable>

              {total - masteredCount > 0 && (
                <Pressable
                  onPress={() => handleRestart(true)}
                  style={styles.restartUnmasteredBtn}
                >
                  <Text style={styles.restartUnmasteredBtnText}>Review Still Learning ({total - masteredCount})</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Edit or Add Card Modal */}
        <EditFlashcardModal
          visible={isEditModalVisible}
          onClose={() => setIsEditModalVisible(false)}
          card={editingCard}
          onSave={async (data) => {
            if (editingCard) {
              await onUpdateCard(deck.id, editingCard.id, data);
              setCards((prev) =>
                prev.map((c) => (c.id === editingCard.id ? { ...c, ...data } : c))
              );
            } else {
              const created = await onAddCard(deck.id, data);
              setCards((prev) => [...prev, created]);
            }
          }}
          onDelete={async (cardId) => {
            await onDeleteCard(deck.id, cardId);
            const remaining = cards.filter((c) => c.id !== cardId);
            setCards(remaining);
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
    studyBody: {
      flex: 1,
      padding: 16,
      justifyContent: 'space-between',
    },
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      flexShrink: 0,
    },
    statusPillMastered: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
    },
    statusPillLearning: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
    },
    statusPillText: {
      fontFamily: 'Inter-Bold',
      fontSize: 11,
      includeFontPadding: false,
      flexShrink: 0,
    },
    statusPillTextMastered: {
      color: '#10B981',
    },
    statusPillTextLearning: {
      color: '#D97706',
    },
    masteryCounterText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 12,
      color: colors.mutedForeground,
    },
    card: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: 20,
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.35 : 0.06,
      shadowRadius: 10,
      elevation: 4,
    },
    cardFlipped: {
      borderColor: '#6366F1',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 12,
    },
    cardSideLabel: {
      fontFamily: 'Inter-Bold',
      fontSize: 11,
      color: colors.mutedForeground,
      letterSpacing: 1.5,
      includeFontPadding: false,
    },
    cardScroll: {
      flex: 1,
      marginVertical: 16,
    },
    cardScrollContent: {
      justifyContent: 'center',
      minHeight: '100%',
    },
    cardContentText: {
      fontFamily: 'Inter-Bold',
      fontSize: 21,
      lineHeight: 30,
      color: colors.foreground,
      textAlign: 'center',
    },
    cardContentTextBack: {
      fontFamily: 'Inter',
      fontSize: 17,
      lineHeight: 26,
      color: colors.foreground,
      textAlign: 'left',
    },
    cardFooter: {
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    tapToFlipHint: {
      fontFamily: 'Inter',
      fontSize: 12,
      color: colors.mutedForeground,
    },
    shuffleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#E0E7FF',
    },
    shuffleBtnText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 12,
      color: '#6366F1',
      includeFontPadding: false,
      flexShrink: 0,
    },
    cardArea: {
      flex: 1,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardAnimatedWrap: {
      width: '100%',
      flex: 1,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 4,
    },
    navStepBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F4F4F5',
    },
    navStepBtnDisabled: {
      opacity: 0.35,
    },
    navStepBtnText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 12.5,
      color: colors.foreground,
      includeFontPadding: false,
      flexShrink: 0,
    },
    swipeHintText: {
      fontFamily: 'Inter',
      fontSize: 11.5,
      color: colors.mutedForeground,
      includeFontPadding: false,
      flexShrink: 0,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 2,
    },
    learningBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    learningBtnActive: {
      borderColor: '#F59E0B',
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.18)' : '#FEF3C7',
    },
    learningBtnInactive: {
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    masteredBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    masteredBtnActive: {
      borderColor: '#10B981',
      backgroundColor: '#10B981',
    },
    masteredBtnInactive: {
      borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5',
    },
    actionBtnText: {
      fontFamily: 'Inter-Bold',
      fontSize: 14,
      includeFontPadding: false,
      flexShrink: 0,
    },
    completionBody: {
      flex: 1,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trophyWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    completionTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 22,
      color: colors.foreground,
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    completionSubtitle: {
      fontFamily: 'Inter',
      fontSize: 13.5,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginBottom: 24,
      paddingHorizontal: 20,
    },
    scoreCard: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 24,
    },
    scoreRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
    },
    scoreLabel: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.foreground,
    },
    scoreVal: {
      fontFamily: 'Inter-Bold',
      fontSize: 16,
      color: colors.foreground,
    },
    scoreDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    completionActions: {
      width: '100%',
      gap: 10,
    },
    restartAllBtn: {
      backgroundColor: '#6366F1',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    restartAllBtnText: {
      fontFamily: 'Inter-Bold',
      fontSize: 14,
      color: '#FFFFFF',
    },
    restartUnmasteredBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    restartUnmasteredBtnText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
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
