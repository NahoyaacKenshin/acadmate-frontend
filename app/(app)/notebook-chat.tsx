import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/src/components/ui/text';
import {
  ArrowLeft,
  History,
  Sparkles,
  BookOpen,
  Zap,
} from 'lucide-react-native';

import { ChatMessageBubble, ChatMessage } from '@/src/components/notebook/chat/ChatMessageBubble';
import { ChatTypingIndicator } from '@/src/components/notebook/chat/ChatTypingIndicator';
import { ChatInputBar } from '@/src/components/notebook/chat/ChatInputBar';
import { ChatHistoryDrawer } from '@/src/components/notebook/chat/ChatHistoryDrawer';
import { ApiService } from '@/src/services/api';
import { useSystemStore } from '@/src/store/systemStore';
import { useChatStore } from '@/src/store/chatStore';

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
  const { isOnline } = useSystemStore();

  const { messages, sessionId, sessions, isLoading, sendMessage, fetchSessions, loadSession, deleteSession, clearMessages } = useChatStore();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Fetch session history when drawer opens or screen mounts
  useEffect(() => {
    if (notebookId) {
      fetchSessions(notebookId);
    }
  }, [notebookId, fetchSessions]);

  const handleOpenHistory = useCallback(() => {
    if (notebookId) {
      fetchSessions(notebookId);
    }
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
    preview: s.title || s.messages?.[0]?.content || 'Chat Session',
    messageCount: s._count?.messages || s.messages?.length || 0,
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
    if (notebookId) {
      router.replace({
        pathname: '/(app)/notebook/[id]' as any,
        params: { id: notebookId, title: notebookTitle ?? 'Notebook' },
      });
    } else {
      router.replace('/(app)/notebook' as any);
    }
    return true;
  }, [router, notebookId, notebookTitle, isHistoryOpen]);

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

  // ── New chat ──────────────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    if (messages.length === 0 && !sessionId) return;
    Alert.alert(
      'Start New Conversation',
      'This will clear the active conversation in view. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearMessages(),
        },
      ]
    );
  }, [messages, sessionId, clearMessages]);

  // ── Suggestion chip handler ───────────────────────────────────────────────
  const handleChipPress = (chip: string) => {
    handleSend(chip);
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const EmptyState = () => (
    <View style={styles.emptyState}>
      {/* Hero icon */}
      <View style={styles.emptyIconWrap}>
        <Sparkles size={36} color="#6C8EFF" />
      </View>
      <Text style={styles.emptyTitle}>AI Study Assistant</Text>
      <Text style={styles.emptySub}>
        Ask anything about your uploaded sources. The AI will search your notebook and answer with
        citations pointing to exact document chunks.
      </Text>

      {/* Suggestion chips */}
      <View style={styles.chips}>
        {SUGGESTION_CHIPS.map((chip) => (
          <Pressable
            key={chip}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            onPress={() => handleChipPress(chip)}
            disabled={!isOnline}
          >
            <Zap size={12} color="#6C8EFF" />
            <Text style={styles.chipText}>{chip}</Text>
          </Pressable>
        ))}
      </View>

      {!isOnline && (
        <View style={styles.offlineHint}>
          <Text style={styles.offlineHintText}>
            Connect to the internet to use AI Chat.
          </Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <ChatMessageBubble message={item} />
  );

  const ListFooter = () =>
    isLoading ? (
      <View style={styles.typingWrapper}>
        <ChatTypingIndicator />
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={8}>
          <ArrowLeft size={20} color="#6C8EFF" />
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <BookOpen size={14} color="#4A5568" />
            <Text style={styles.headerSub} numberOfLines={1}>
              {notebookTitle ?? 'Notebook'}
            </Text>
          </View>
          <View style={styles.aiBadgeRow}>
            <View style={styles.aiBadge}>
              <Sparkles size={10} color="#6C8EFF" />
              <Text style={styles.aiBadgeText}>AI Chat · RAG</Text>
            </View>
            {/* Online indicator */}
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#22C55E' : '#EF4444' }]} />
            <Text style={styles.onlineLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.historyBtn, pressed && { opacity: 0.7 }]}
          onPress={handleOpenHistory}
          hitSlop={8}
        >
          <History size={18} color="#6C8EFF" />
        </Pressable>
      </View>

      {/* ── Message list ── */}
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
        onContentSizeChange={() =>
          messages.length > 0 &&
          flatListRef.current?.scrollToEnd({ animated: false })
        }
      />

      {/* ── Input bar ── */}
      <ChatInputBar
        onSend={handleSend}
        isLoading={isLoading}
        isOnline={isOnline}
      />

      {/* ── History drawer ── */}
      <ChatHistoryDrawer
        visible={isHistoryOpen}
        sessions={formattedSessions}
        currentMessages={messages}
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
    backgroundColor: '#10131C',
  },
  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1F2E',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(108,142,255,0.12)',
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
    gap: 5,
  },
  headerSub: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(108,142,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6C8EFF',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineLabel: {
    fontSize: 10,
    color: '#4A5568',
    fontWeight: '600',
  },
  historyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#2A3143',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Message list ──────────────────────────────────────────────────────────
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
  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 20,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(108,142,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
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
    gap: 5,
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#2A3143',
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
    color: '#94A3B8',
    fontWeight: '500',
  },
  offlineHint: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
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
  },
});
