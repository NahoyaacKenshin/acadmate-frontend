import React from 'react';
import {
  View,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import { Text } from '@/src/components/ui/text';
import { X, MessageSquare, Plus, Clock } from 'lucide-react-native';
import { ChatMessage } from './ChatMessageBubble';

export interface ChatSession {
  id: string;
  preview: string; // first user message
  messageCount: number;
  createdAt: Date;
}

interface ChatHistoryDrawerProps {
  visible: boolean;
  sessions: ChatSession[];
  currentMessages: ChatMessage[];
  onClose: () => void;
  onNewChat: () => void;
  onSelectSession?: (session: ChatSession) => void;
}

function formatRelativeDate(date: Date): string {
  // Use Date.now() for true absolute epoch comparison (PHT-independent)
  const nowMs = Date.now();
  const diffMs = nowMs - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function SessionRow({
  session,
  isActive,
  onPress,
  onDelete,
}: {
  session: ChatSession;
  isActive?: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.sessionRowContainer}>
      <Pressable
        style={({ pressed }) => [styles.sessionRow, isActive && styles.sessionRowActive, pressed && styles.sessionRowPressed]}
        onPress={onPress}
      >
        <View style={[styles.sessionIcon, isActive && styles.sessionIconActive]}>
          <MessageSquare size={15} color={isActive ? '#10131C' : '#6C8EFF'} />
        </View>
        <View style={styles.sessionContent}>
          <Text style={styles.sessionPreview} numberOfLines={2}>
            {session.preview}
          </Text>
          <View style={styles.sessionMeta}>
            <Clock size={10} color="#3A4455" />
            <Text style={styles.sessionDate}>{formatRelativeDate(session.createdAt)}</Text>
            <Text style={styles.sessionCount}>{session.messageCount} messages</Text>
            {isActive && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>Viewing</Text>
              </View>
            )}
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          hitSlop={8}
        >
          <X size={14} color="#64748B" />
        </Pressable>
      </Pressable>
    </View>
  );
}

export function ChatHistoryDrawer({
  visible,
  sessions,
  currentMessages,
  currentSessionId,
  onClose,
  onNewChat,
  onSelectSession,
  onDeleteSession,
}: ChatHistoryDrawerProps & {
  currentSessionId?: string | null;
  onDeleteSession?: (session: ChatSession) => void;
}) {
  // Only show "This Session" for a genuinely NEW, unsaved conversation
  // (i.e. messages exist but sessionId is null, meaning it hasn't been saved to the server yet)
  const isNewUnsavedSession = currentMessages.length > 0 && !currentSessionId;
  const currentUserMessages = isNewUnsavedSession
    ? currentMessages.filter((m) => m.role === 'user')
    : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.drawer}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Chat History</Text>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <X size={18} color="#64748B" />
          </Pressable>
        </View>

        {/* New chat CTA */}
        <Pressable
          style={({ pressed }) => [styles.newChatBtn, pressed && { opacity: 0.8 }]}
          onPress={() => {
            // Always close the drawer first, then trigger new chat logic
            onClose();
            onNewChat();
          }}
        >
          <Plus size={16} color="#6C8EFF" />
          <Text style={styles.newChatText}>New Conversation</Text>
        </Pressable>

        <View style={styles.divider} />

        {/* Current session (ephemeral) */}
        {currentUserMessages.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>This Session</Text>
            <View style={[styles.sessionRow, styles.sessionRowActive]}>
              <View style={[styles.sessionIcon, styles.sessionIconActive]}>
                <MessageSquare size={15} color="#10131C" />
              </View>
              <View style={styles.sessionContent}>
                <Text style={styles.sessionPreview} numberOfLines={2}>
                  {currentUserMessages[0].content}
                </Text>
                <Text style={styles.sessionCount}>{currentMessages.length} messages · Active</Text>
              </View>
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* Past sessions */}
        {sessions.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Your Conversations ({sessions.length})</Text>
            <FlatList
              data={sessions}
              keyExtractor={(s) => s.id}
              renderItem={({ item }) => (
                <SessionRow
                  session={item}
                  isActive={item.id === currentSessionId}
                  onPress={() => {
                    onSelectSession?.(item);
                    onClose();
                  }}
                  onDelete={() => onDeleteSession?.(item)}
                />
              )}
              showsVerticalScrollIndicator={false}
              windowSize={7}
              maxToRenderPerBatch={10}
              initialNumToRender={8}
              removeClippedSubviews={Platform.OS === 'android'}
              contentContainerStyle={styles.listContent}
            />
          </>
        ) : (
          <View style={styles.emptyState}>
            <MessageSquare size={32} color="#2A3143" />
            <Text style={styles.emptyTitle}>No past conversations</Text>
            <Text style={styles.emptySub}>
              Start a conversation with AI to build history.
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    backgroundColor: '#10131C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#2A3143',
    padding: 20,
    paddingBottom: 40,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A3143',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#161A26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(108,142,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.25)',
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 16,
  },
  newChatText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C8EFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#1A1F2E',
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4A5568',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sessionRowContainer: {
    marginBottom: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#161A26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 12,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sessionRowPressed: {
    opacity: 0.75,
  },
  sessionRowActive: {
    borderColor: 'rgba(108,142,255,0.35)',
    backgroundColor: 'rgba(108,142,255,0.08)',
  },
  sessionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(108,142,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sessionIconActive: {
    backgroundColor: '#6C8EFF',
  },
  sessionContent: {
    flex: 1,
    gap: 5,
  },
  sessionPreview: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sessionDate: {
    fontSize: 11,
    color: '#3A4455',
  },
  sessionCount: {
    fontSize: 11,
    color: '#3A4455',
  },
  listContent: {
    paddingBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A5568',
    marginTop: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#2A3143',
    textAlign: 'center',
    lineHeight: 18,
  },
  activePill: {
    backgroundColor: 'rgba(108,142,255,0.18)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6C8EFF',
    letterSpacing: 0.4,
  },
});
