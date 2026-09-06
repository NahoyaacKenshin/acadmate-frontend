import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Clipboard } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { Sparkles, User, AlertCircle, Copy, RotateCcw } from 'lucide-react-native';
import { ChatMessageCitations, Citation } from './ChatMessageCitations';
import { CitationDetailModal } from './CitationDetailModal';
import Markdown from 'react-native-markdown-display';

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  citations?: Citation[];
  timestamp: Date;
  isError?: boolean;
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onRetry?: () => void;
}

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// Markdown style map for assistant bubbles
const markdownStyles: any = {
  body: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 21,
  },
  strong: {
    color: '#ffffff',
    fontWeight: '700',
  },
  em: {
    fontStyle: 'italic',
    color: '#CBD5E1',
  },
  heading1: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 4,
  },
  heading2: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 4,
  },
  heading3: {
    color: '#C4CFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 2,
  },
  bullet_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  ordered_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  list_item: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 21,
  },
  code_inline: {
    backgroundColor: '#0D1117',
    color: '#6C8EFF',
    fontSize: 12,
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: 'monospace',
  },
  fence: {
    backgroundColor: '#0D1117',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  code_block: {
    backgroundColor: '#0D1117',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
  },
  blockquote: {
    backgroundColor: 'rgba(108,142,255,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#6C8EFF',
    paddingLeft: 10,
    paddingVertical: 4,
    marginVertical: 4,
  },
  hr: {
    backgroundColor: '#2A3143',
    height: 1,
    marginVertical: 8,
  },
  link: {
    color: '#6C8EFF',
    textDecorationLine: 'underline',
  },
  paragraph: {
    marginBottom: 4,
    marginTop: 0,
  },
};

export function ChatMessageBubble({ message, onRetry }: ChatMessageBubbleProps) {
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isError = !!message.isError;

  const handleLongPress = () => {
    Clipboard.setString(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bubbleStyle = isError
    ? styles.bubbleError
    : isUser
    ? styles.bubbleUser
    : styles.bubbleAssistant;

  return (
    <>
      <View style={[styles.wrapper, isUser ? styles.wrapperUser : styles.wrapperAssistant]}>
        {/* Avatar — only for assistant */}
        {!isUser && (
          <View style={[styles.avatar, isError && styles.avatarError]}>
            {isError ? (
              <AlertCircle size={14} color="#EF4444" />
            ) : (
              <Sparkles size={14} color="#6C8EFF" />
            )}
          </View>
        )}

        {/* Bubble */}
        <Pressable
          style={[styles.bubble, bubbleStyle]}
          onLongPress={handleLongPress}
          delayLongPress={400}
        >
          {isUser ? (
            <Text style={styles.contentUser}>{message.content}</Text>
          ) : (
            <Markdown style={markdownStyles}>{message.content}</Markdown>
          )}

          {/* Citations (assistant only, non-error) */}
          {!isUser && !isError && message.citations && message.citations.length > 0 && (
            <ChatMessageCitations
              citations={message.citations}
              onPress={(c) => setSelectedCitation(c)}
            />
          )}

          {/* Error actions row */}
          {isError && onRetry && (
            <Pressable
              style={styles.retryBtn}
              onPress={onRetry}
              hitSlop={8}
            >
              <RotateCcw size={12} color="#EF4444" />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          )}

          {/* Copy feedback + Timestamp row */}
          <View style={styles.metaRow}>
            {copied && (
              <View style={styles.copiedBadge}>
                <Copy size={9} color="#22C55E" />
                <Text style={styles.copiedText}>Copied</Text>
              </View>
            )}
            <Text
              style={[
                styles.timestamp,
                isUser ? styles.timestampUser : isError ? styles.timestampError : styles.timestampAssistant,
              ]}
            >
              {formatTime(message.timestamp)}
            </Text>
          </View>
        </Pressable>

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
  avatarError: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.25)',
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
  bubbleError: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderBottomLeftRadius: 4,
    borderRadius: 18,
  },
  // ── Content ─────────────────────────────────────────────────────────────
  contentUser: {
    fontSize: 14,
    lineHeight: 21,
    color: '#ffffff',
  },
  // ── Meta row ────────────────────────────────────────────────────────────
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 6,
  },
  copiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  copiedText: {
    fontSize: 10,
    color: '#22C55E',
    fontWeight: '600',
  },
  // ── Timestamp ───────────────────────────────────────────────────────────
  timestamp: {
    fontSize: 10,
  },
  timestampUser: {
    color: 'rgba(255,255,255,0.55)',
  },
  timestampAssistant: {
    color: '#64748B',
  },
  timestampError: {
    color: 'rgba(239,68,68,0.55)',
  },
  // ── Retry ───────────────────────────────────────────────────────────────
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  retryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
});
