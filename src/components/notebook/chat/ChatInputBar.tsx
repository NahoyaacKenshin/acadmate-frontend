import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from '@/src/components/ui/text';
import { SendHorizontal, WifiOff } from 'lucide-react-native';

interface ChatInputBarProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  isOnline: boolean;
}

export function ChatInputBar({ onSend, isLoading, isOnline }: ChatInputBarProps) {
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Offline notice */}
      {!isOnline && (
        <View style={styles.offlineBar}>
          <WifiOff size={13} color="#F59E0B" />
          <Text style={styles.offlineText}>
            AI Chat requires an internet connection.
          </Text>
        </View>
      )}

      <View style={styles.container}>
        <TextInput
          ref={inputRef}
          style={[styles.input, !isOnline && styles.inputDisabled]}
          value={text}
          onChangeText={setText}
          placeholder={isOnline ? 'Ask anything about your sources…' : 'Offline — chat unavailable'}
          placeholderTextColor="#3A4455"
          multiline
          maxLength={2000}
          editable={isOnline && !isLoading}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          returnKeyType="send"
        />

        {/* Character counter — only when close to limit */}
        {text.length > 1800 && (
          <Text style={styles.charCount}>{2000 - text.length}</Text>
        )}

        {/* Send button */}
        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            canSend && styles.sendBtnActive,
            pressed && canSend && { opacity: 0.75, transform: [{ scale: 0.94 }] },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          hitSlop={4}
        >
          <SendHorizontal size={18} color={canSend ? '#ffffff' : '#2A3143'} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderTopWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offlineText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#10131C',
    borderTopWidth: 1,
    borderTopColor: '#1A1F2E',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: '#ffffff',
    maxHeight: 120,
    lineHeight: 20,
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
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#1A1F2E',
    borderWidth: 1,
    borderColor: '#2A3143',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnActive: {
    backgroundColor: '#6C8EFF',
    borderColor: '#6C8EFF',
    shadowColor: '#6C8EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
