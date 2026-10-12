import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  BackHandler,
  Animated,
  Platform,
  Image,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/src/components/ui/text';
import {
  ArrowLeft,
  History,
  BookOpen,
  Zap,
  ChevronDown,
  WifiOff,
} from 'lucide-react-native';

import { ChatMessageBubble, ChatMessage } from '@/src/components/notebook/chat/ChatMessageBubble';
import { ChatTypingIndicator } from '@/src/components/notebook/chat/ChatTypingIndicator';
import { ChatInputBar } from '@/src/components/notebook/chat/ChatInputBar';
import { ChatHistoryDrawer } from '@/src/components/notebook/chat/ChatHistoryDrawer';
import { useSystemStore } from '@/src/store/systemStore';
import { useChatStore } from '@/src/store/chatStore';
import { useTheme } from '@/src/theme/useTheme';

// ── Prompt chip suggestion data ─────────────────────────────────────────────
const SUGGESTION_CHIPS = [
  'Summarize this notebook',
  'What are the key concepts?',
  'List all important dates or deadlines',
  'Explain the main topic simply',
];

export default function NotebookChatScreen() {
  const router = useRouter();
  const { id: notebookId, title: notebookTitle } =
    useLocalSearchParams<{ id: string; title: string }>();
  const { colors, isDark } = useTheme();
  const { isOnline } = useSystemStore();

  const {
    messages,
    sessionId,
    sessions,
    isLoading,
    initForNotebook,
    sendMessage,
    retryLastMessage,
    fetchSessions,
    loadSession,
    deleteSession,
    clearMessages,
  } = useChatStore();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const scrollBtnOpacity = useRef(new Animated.Value(0)).current;

  // ── Keyboard height & visibility tracking (fixes Android input covering) ──
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      if (Platform.OS === 'android') {
        setAndroidKeyboardHeight(e.endCoordinates.height);
      }
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 60);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      if (Platform.OS === 'android') {
        setAndroidKeyboardHeight(0);
      }
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ── Init per notebook (clears stale state) ────────────────────────────────
  useEffect(() => {
    if (notebookId) {
      initForNotebook(notebookId);
      fetchSessions(notebookId);
    }
  }, [notebookId]);

  // ── Scroll-to-bottom button fade ──────────────────────────────────────────
  useEffect(() => {
    Animated.timing(scrollBtnOpacity, {
      toValue: showScrollBtn ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showScrollBtn, scrollBtnOpacity]);

  const handleOpenHistory = useCallback(() => {
    if (notebookId) fetchSessions(notebookId);
    setIsHistoryOpen(true);
  }, [notebookId, fetchSessions]);

  const handleSelectSession = useCallback(
    async (session: any) => {
      if (!notebookId || !session?.id) return;
      await loadSession(notebookId, session.id);
    },
    [notebookId, loadSession]
  );

  const handleDeleteSession = useCallback(
    (session: any) => {
      if (!notebookId || !session?.id) return;
      Alert.alert('Delete Conversation', 'Are you sure you want to delete this session?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSession(notebookId, session.id),
        },
      ]);
    },
    [notebookId, deleteSession]
  );

  // Format sessions for drawer
  const formattedSessions = sessions.map((s: any) => ({
    id: s.id,
    preview: s.title || 'Chat Session',
    messageCount: s.messageCount ?? s._count?.messages ?? s.messages?.length ?? 0,
    createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
  }));

  // Auto-scroll to bottom on new messages or typing indicator
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages, isLoading]);

  // ── Handle Back Navigation ────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (isHistoryOpen) {
      setIsHistoryOpen(false);
      return true;
    }
    router.back();
    return true;
  }, [router, isHistoryOpen]);

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBack
    );
    return () => backSubscription.remove();
  }, [handleBack]);

  // ── Send a message ────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text: string) => {
      if (!notebookId || isLoading) return;
      await sendMessage(notebookId, text);
    },
    [notebookId, isLoading, sendMessage]
  );

  const handleRetry = useCallback(async () => {
    if (!notebookId) return;
    await retryLastMessage(notebookId);
  }, [notebookId, retryLastMessage]);

  // ── New chat ──────────────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    if (messages.length === 0 && !sessionId) return;
    Alert.alert(
      'Start New Topic?',
      'Your current conversation is automatically saved in your Chat History.',
      [
        { text: 'Keep Chatting', style: 'cancel' },
        {
          text: 'Start New',
          onPress: () => clearMessages(),
        },
      ]
    );
  }, [messages, sessionId, clearMessages]);

  // ── Suggestion chip handler ───────────────────────────────────────────────
  const handleChipPress = (chip: string) => {
    handleSend(chip);
  };

  // ── Scroll tracking ───────────────────────────────────────────────────────
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height;
    setShowScrollBtn(distanceFromBottom > 120);
  }, []);

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollBtn(false);
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const EmptyState = () => (
    <View style={styles.emptyState}>
      {/* AcadMate Logo */}
      <View
        style={[
          styles.emptyLogoWrap,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Image
          source={require('../../assets/images/new-splash-favicon-icon.png')}
          style={styles.emptyLogoImage}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>AI Study Assistant</Text>
      <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
        Ask anything about your uploaded sources. The AI will search your notebook and answer with
        citations pointing to exact document chunks.
      </Text>

      {/* Suggestion chips */}
      <View style={styles.chips}>
        {SUGGESTION_CHIPS.map((chip) => (
          <Pressable
            key={chip}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
              pressed && styles.chipPressed,
            ]}
            onPress={() => handleChipPress(chip)}
            disabled={!isOnline}
          >
            <Zap size={12} color="#6366F1" />
            <Text style={[styles.chipText, { color: colors.foreground }]}>{chip}</Text>
          </Pressable>
        ))}
      </View>

      {!isOnline && (
        <View
          style={[
            styles.offlineHint,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
            },
          ]}
        >
          <Text style={styles.offlineHintText}>
            Connect to the internet to use AI Chat.
          </Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <ChatMessageBubble
      message={item}
      onRetry={item.isError ? handleRetry : undefined}
    />
  );

  const ListFooter = () =>
    isLoading ? (
      <View style={styles.typingWrapper}>
        <ChatTypingIndicator />
      </View>
    ) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          style={[
            styles.backBtn,
            { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF' },
          ]}
          onPress={handleBack}
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#6366F1" />
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <BookOpen size={14} color={colors.mutedForeground} />
            <Text style={[styles.headerSub, { color: colors.foreground }]} numberOfLines={1}>
              {notebookTitle ?? 'Notebook'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            {/* Online indicator */}
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.onlineLabel, { color: colors.mutedForeground }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.historyBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleOpenHistory}
          hitSlop={8}
        >
          <History size={18} color="#6366F1" />
        </Pressable>
      </View>

      {/* ── Offline Notice Bar ── */}
      {!isOnline && (
        <View
          style={[
            styles.offlineNoticeBar,
            {
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FEF3C7',
              borderBottomColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A',
            },
          ]}
        >
          <WifiOff size={13} color={isDark ? '#F59E0B' : '#D97706'} />
          <Text
            style={[
              styles.offlineNoticeText,
              { color: isDark ? '#F59E0B' : '#D97706' },
            ]}
          >
            Offline Mode — Viewing saved conversation history.
          </Text>
        </View>
      )}

      {/* ── Chat Body (Header remains firmly fixed on top) ── */}
      <KeyboardAvoidingView
        style={[
          styles.chatBody,
          Platform.OS === 'android' && {
            paddingBottom: androidKeyboardHeight > 0 ? androidKeyboardHeight + 24 : 0,
          },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        {/* ── Message list ── */}
        <View style={styles.listContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            ListEmptyComponent={<EmptyState />}
            ListFooterComponent={<ListFooter />}
            contentContainerStyle={[
              styles.listContent,
              messages.length === 0 && styles.listContentEmpty,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            windowSize={7}
            maxToRenderPerBatch={10}
            initialNumToRender={8}
            removeClippedSubviews={Platform.OS === 'android'}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            onContentSizeChange={() =>
              messages.length > 0 &&
              flatListRef.current?.scrollToEnd({ animated: false })
            }
          />

          {/* Scroll-to-bottom floating button */}
          <Animated.View style={[styles.scrollBtnWrap, { opacity: scrollBtnOpacity }]}>
            <Pressable
              style={({ pressed }) => [
                styles.scrollBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
                pressed && { opacity: 0.8 },
              ]}
              onPress={scrollToBottom}
            >
              <ChevronDown size={18} color="#6366F1" />
            </Pressable>
          </Animated.View>
        </View>

        {/* ── Input bar ── */}
        <ChatInputBar
          onSend={handleSend}
          isLoading={isLoading}
          isOnline={isOnline}
          isKeyboardVisible={isKeyboardVisible}
        />
      </KeyboardAvoidingView>

      {/* ── History drawer ── */}
      <ChatHistoryDrawer
        visible={isHistoryOpen}
        sessions={formattedSessions}
        currentMessages={messages}
        currentSessionId={sessionId}
        onClose={() => setIsHistoryOpen(false)}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
    zIndex: 100,
    flexShrink: 0,
  },
  chatBody: {
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    gap: 3,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerSub: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    includeFontPadding: false,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineLabel: {
    fontSize: 10,
    fontWeight: '600',
    includeFontPadding: false,
  },
  historyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Message list ──────────────────────────────────────────────────────────
  listContainer: {
    flex: 1,
    position: 'relative',
  },
  listContent: {
    paddingVertical: 12,
    paddingBottom: 8,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  typingWrapper: {
    marginTop: 4,
    marginBottom: 8,
  },
  // ── Scroll-to-bottom button ───────────────────────────────────────────────
  scrollBtnWrap: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  scrollBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 20,
    gap: 12,
  },
  emptyLogoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyLogoImage: {
    width: 44,
    height: 44,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
    includeFontPadding: false,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    includeFontPadding: false,
  },
  offlineHint: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
  },
  offlineHintText: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    fontWeight: '500',
    includeFontPadding: false,
  },
  offlineNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineNoticeText: {
    fontSize: 12,
    includeFontPadding: false,
  },
});
