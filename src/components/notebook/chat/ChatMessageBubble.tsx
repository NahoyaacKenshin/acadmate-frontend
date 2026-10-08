import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Clipboard, Image } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { User, AlertCircle, Copy, RotateCcw } from 'lucide-react-native';
import { ChatMessageCitations, Citation } from './ChatMessageCitations';
import { CitationDetailModal } from './CitationDetailModal';
import { FormattedMessageBody } from './FormattedMessageBody';
import { useTheme } from '@/src/theme/useTheme';

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

export function ChatMessageBubble({ message, onRetry }: ChatMessageBubbleProps) {
  const { colors, isDark } = useTheme();
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
    ? [
        styles.bubbleError,
        {
          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEE2E2',
          borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
        },
      ]
    : isUser
    ? styles.bubbleUser
    : [
        styles.bubbleAssistant,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ];

  return (
    <>
      <View style={[styles.wrapper, isUser ? styles.wrapperUser : styles.wrapperAssistant]}>
        {/* Avatar — only for assistant */}
        {!isUser && (
          <View
            style={[
              styles.avatar,
              isError
                ? [
                    styles.avatarError,
                    {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
                    },
                  ]
                : {
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                    borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : '#C7D2FE',
                  },
            ]}
          >
            {isError ? (
              <AlertCircle size={14} color="#EF4444" />
            ) : (
              <Image
                source={require('../../../../assets/images/new-splash-favicon-icon.png')}
                style={styles.avatarLogo}
                resizeMode="contain"
              />
            )}
          </View>
        )}

        {/* Bubble */}
        {isUser ? (
          <Pressable
            style={[styles.bubble, styles.bubbleUser]}
            onLongPress={handleLongPress}
            delayLongPress={400}
          >
            <Text style={styles.contentUser}>{message.content}</Text>
            <View style={styles.metaRow}>
              {copied && (
                <View style={styles.copiedBadge}>
                  <Copy size={9} color="#10B981" />
                  <Text style={styles.copiedText}>Copied</Text>
                </View>
              )}
              <Text style={[styles.timestamp, styles.timestampUser]}>
                {formatTime(message.timestamp)}
              </Text>
            </View>
          </Pressable>
        ) : (
          <View style={[styles.bubble, bubbleStyle]}>
            <FormattedMessageBody content={message.content} />

            {/* Citations (assistant only, non-error) */}
            {!isError && message.citations && message.citations.length > 0 && (
              <ChatMessageCitations
                citations={message.citations}
                onPress={(c) => setSelectedCitation(c)}
              />
            )}

            {/* Error actions row */}
            {isError && onRetry && (
              <Pressable
                style={[
                  styles.retryBtn,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
                  },
                ]}
                onPress={onRetry}
                hitSlop={8}
              >
                <RotateCcw size={12} color="#EF4444" />
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            )}

            {/* Copy feedback + Timestamp row */}
            <View style={styles.metaRow}>
              <Pressable
                style={styles.copyMsgBtn}
                onPress={handleLongPress}
                hitSlop={8}
              >
                {copied ? (
                  <View style={styles.copiedBadge}>
                    <Copy size={9} color="#10B981" />
                    <Text style={styles.copiedText}>Copied</Text>
                  </View>
                ) : (
                  <Copy size={11} color={colors.mutedForeground} />
                )}
              </Pressable>
              <Text
                style={[
                  styles.timestamp,
                  isError
                    ? styles.timestampError
                    : { color: colors.mutedForeground },
                ]}
              >
                {formatTime(message.timestamp)}
              </Text>
            </View>
          </View>
        )}

        {/* Avatar — only for user (right side) */}
        {isUser && (
          <View style={styles.avatarUser}>
            <User size={14} color="#ffffff" />
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },
  avatarLogo: {
    width: 16,
    height: 16,
  },
  avatarError: {},
  avatarUser: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#6366F1',
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
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleError: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
    borderRadius: 18,
  },
  // ── Content ─────────────────────────────────────────────────────────────
  contentUser: {
    fontSize: 14,
    lineHeight: 21,
    color: '#ffffff',
    includeFontPadding: false,
  },
  // ── Meta row ────────────────────────────────────────────────────────────
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 6,
  },
  copyMsgBtn: {
    padding: 2,
    marginRight: 2,
  },
  copiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  copiedText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
    includeFontPadding: false,
  },
  // ── Timestamp ───────────────────────────────────────────────────────────
  timestamp: {
    fontSize: 10,
    includeFontPadding: false,
  },
  timestampUser: {
    color: 'rgba(255, 255, 255, 0.65)',
  },
  timestampError: {
    color: 'rgba(239, 68, 68, 0.7)',
  },
  // ── Retry ───────────────────────────────────────────────────────────────
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  retryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    includeFontPadding: false,
  },
});
