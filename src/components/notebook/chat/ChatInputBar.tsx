import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { Text } from '@/src/components/ui/text';
import { SendHorizontal, WifiOff } from 'lucide-react-native';
import { useTheme } from '@/src/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatInputBarProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  isOnline: boolean;
  isKeyboardVisible?: boolean;
}

export function ChatInputBar({ onSend, isLoading, isOnline, isKeyboardVisible }: ChatInputBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const canSend = text.trim().length > 0 && !isLoading && isOnline;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || !isOnline) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.blur();
  };

  return (
    <View style={styles.wrapper}>
      {/* Offline notice */}
      {!isOnline && (
        <View
          style={[
            styles.offlineBar,
            {
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FEF3C7',
              borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A',
            },
          ]}
        >
          <WifiOff size={13} color={isDark ? '#F59E0B' : '#D97706'} />
          <Text
            style={[
              styles.offlineText,
              { color: isDark ? '#F59E0B' : '#D97706' },
            ]}
          >
            AI Chat requires an internet connection.
          </Text>
        </View>
      )}

      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: isKeyboardVisible ? 14 : (insets.bottom > 0 ? insets.bottom + 6 : 12),
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
            },
            !isOnline && styles.inputDisabled,
          ]}
          value={text}
          onChangeText={setText}
          placeholder={isOnline ? 'Ask anything about your sources…' : 'Offline — chat unavailable'}
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={2000}
          editable={isOnline && !isLoading}
          blurOnSubmit={false}
          returnKeyType="default"
        />

        {/* Character counter — only when close to limit */}
        {text.length > 1800 && (
          <Text style={styles.charCount}>{2000 - text.length}</Text>
        )}

        {/* Send button */}
        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            canSend
              ? styles.sendBtnActive
              : {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
            pressed && canSend && { opacity: 0.75, transform: [{ scale: 0.94 }] },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          hitSlop={4}
        >
          <SendHorizontal size={18} color={canSend ? '#ffffff' : colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexShrink: 0,
  },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    maxHeight: 120,
    lineHeight: 20,
    includeFontPadding: false,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  charCount: {
    position: 'absolute',
    right: 58,
    bottom: Platform.OS === 'ios' ? 36 : 18,
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '600',
    includeFontPadding: false,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
