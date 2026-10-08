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
import { useTheme } from '@/src/theme/useTheme';

export interface ChatSession {
  id: string;
  preview: string;
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
  colors,
  isDark,
}: {
  session: ChatSession;
  isActive?: boolean;
  onPress: () => void;
  onDelete: () => void;
  colors: any;
  isDark: boolean;
}) {
  return (
    <View style={styles.sessionRowContainer}>
      <Pressable
        style={({ pressed }) => [
          styles.sessionRow,
          {
            backgroundColor: isActive
              ? isDark
                ? 'rgba(99, 102, 241, 0.12)'
                : '#EEF2FF'
              : isDark
              ? 'rgba(255, 255, 255, 0.03)'
              : '#F9FAFB',
            borderColor: isActive ? '#6366F1' : colors.border,
          },
          pressed && styles.sessionRowPressed,
        ]}
        onPress={onPress}
      >
        <View
          style={[
            styles.sessionIcon,
            {
              backgroundColor: isActive
                ? '#6366F1'
                : isDark
                ? 'rgba(99, 102, 241, 0.15)'
                : '#EEF2FF',
            },
          ]}
        >
          <MessageSquare size={15} color={isActive ? '#ffffff' : '#6366F1'} />
        </View>
        <View style={styles.sessionContent}>
          <Text style={[styles.sessionPreview, { color: colors.foreground }]} numberOfLines={2}>
            {session.preview}
          </Text>
          <View style={styles.sessionMeta}>
            <Clock size={10} color={colors.mutedForeground} />
            <Text style={[styles.sessionDate, { color: colors.mutedForeground }]}>
              {formatRelativeDate(session.createdAt)}
            </Text>
            <Text style={[styles.sessionCount, { color: colors.mutedForeground }]}>
              {session.messageCount} messages
            </Text>
            {isActive && (
              <View
                style={[
                  styles.activePill,
                  {
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#E0E7FF',
                  },
                ]}
              >
                <Text style={styles.activePillText}>Viewing</Text>
              </View>
            )}
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.deleteBtn,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F4F4F5' },
            pressed && { opacity: 0.6 },
          ]}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          hitSlop={8}
        >
          <X size={14} color={colors.mutedForeground} />
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
  const { colors, isDark } = useTheme();

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

      <View
        style={[
          styles.drawer,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Chat History</Text>
          <Pressable
            style={[
              styles.closeBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F4F4F5' },
            ]}
            onPress={onClose}
            hitSlop={8}
          >
            <X size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* New chat CTA */}
        <Pressable
          style={({ pressed }) => [
            styles.newChatBtn,
            {
              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
              borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE',
            },
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => {
            onClose();
            onNewChat();
          }}
        >
          <Plus size={16} color="#6366F1" />
          <Text style={styles.newChatText}>New Conversation</Text>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Current session (ephemeral) */}
        {currentUserMessages.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>THIS SESSION</Text>
            <View
              style={[
                styles.sessionRow,
                {
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF',
                  borderColor: '#6366F1',
                },
              ]}
            >
              <View style={[styles.sessionIcon, { backgroundColor: '#6366F1' }]}>
                <MessageSquare size={15} color="#ffffff" />
              </View>
              <View style={styles.sessionContent}>
                <Text style={[styles.sessionPreview, { color: colors.foreground }]} numberOfLines={2}>
                  {currentUserMessages[0].content}
                </Text>
                <Text style={[styles.sessionCount, { color: colors.mutedForeground }]}>
                  {currentMessages.length} messages · Active
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </>
        )}

        {/* Past sessions */}
        {sessions.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              YOUR CONVERSATIONS ({sessions.length})
            </Text>
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
                  colors={colors}
                  isDark={isDark}
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
            <MessageSquare size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No past conversations</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
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
    includeFontPadding: false,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 16,
  },
  newChatText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
    includeFontPadding: false,
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
    includeFontPadding: false,
  },
  sessionRowContainer: {
    marginBottom: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 6,
  },
  sessionRowPressed: {
    opacity: 0.75,
  },
  sessionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sessionContent: {
    flex: 1,
    gap: 5,
  },
  sessionPreview: {
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionDate: {
    fontSize: 11,
    fontWeight: '500',
    includeFontPadding: false,
  },
  sessionCount: {
    fontSize: 11,
    fontWeight: '500',
    includeFontPadding: false,
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
    marginTop: 6,
    includeFontPadding: false,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    includeFontPadding: false,
  },
  activePill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 0.4,
    includeFontPadding: false,
  },
});
