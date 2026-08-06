import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { Sparkles, User } from 'lucide-react-native';
import { ChatMessageCitations, Citation } from './ChatMessageCitations';
import { CitationDetailModal } from './CitationDetailModal';

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const isUser = message.role === 'user';

  return (
    <>
      <View style={[styles.wrapper, isUser ? styles.wrapperUser : styles.wrapperAssistant]}>
        {/* Avatar — only for assistant */}
        {!isUser && (
          <View style={styles.avatar}>
            <Sparkles size={14} color="#6C8EFF" />
          </View>
        )}

        {/* Bubble */}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.content, isUser ? styles.contentUser : styles.contentAssistant]}>
            {message.content}
          </Text>

          {/* Citations (assistant only) */}
          {!isUser && message.citations && message.citations.length > 0 && (
            <ChatMessageCitations
              citations={message.citations}
              onPress={(c) => setSelectedCitation(c)}
            />
          )}

          {/* Timestamp */}
          <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampAssistant]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>

        {/* Avatar — only for user (right side) */}
        {isUser && (
          <View style={styles.avatarUser}>
            <User size={14} color="#10131C" />
          </View>
        )}
      </View>

      {/* Citation detail modal */}
      <CitationDetailModal
        visible={selectedCitation !== null}
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  wrapperUser: {
    justifyContent: 'flex-end',
  },
  wrapperAssistant: {
    justifyContent: 'flex-start',
  },
  // ── Avatars ─────────────────────────────────────────────────────────────
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(108,142,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },
  avatarUser: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#6C8EFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },
  // ── Bubbles ─────────────────────────────────────────────────────────────
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    padding: 12,
    paddingHorizontal: 14,
  },
  bubbleUser: {
    backgroundColor: '#6C8EFF',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderBottomLeftRadius: 4,
  },
  // ── Content ─────────────────────────────────────────────────────────────
  content: {
    fontSize: 14,
    lineHeight: 21,
  },
  contentUser: {
    color: '#ffffff',
  },
  contentAssistant: {
    color: '#E2E8F0',
  },
  // ── Timestamp ───────────────────────────────────────────────────────────
  timestamp: {
    fontSize: 10,
    marginTop: 6,
  },
  timestampUser: {
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'right',
  },
  timestampAssistant: {
    color: '#3A4455',
  },
});
