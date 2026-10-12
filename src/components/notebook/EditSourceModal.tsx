import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/src/components/ui/text';
import { ArrowLeft, Save, FileText } from 'lucide-react-native';
import { Source } from './SourceListItem';
import { useTheme } from '@/src/theme/useTheme';

interface EditSourceModalProps {
  visible: boolean;
  source: Source | null;
  onClose: () => void;
  onSave: (sourceId: string, data: { fileName?: string; rawText?: string }) => Promise<void>;
}

export function EditSourceModal({ visible, source, onClose, onSave }: EditSourceModalProps) {
  const { colors, isDark } = useTheme();
  const [fileName, setFileName] = useState('');
  const [rawText, setRawText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state whenever a source is passed in
  useEffect(() => {
    if (source) {
      setFileName(source.fileName ?? '');
      setRawText(source.rawText ?? '');
    }
  }, [source]);

  const handleSave = async () => {
    if (!source) return;
    const trimmedName = fileName.trim();
    if (!trimmedName) {
      Alert.alert('Validation', 'File name cannot be empty.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(source.id, {
        fileName: trimmedName !== source.fileName ? trimmedName : undefined,
        rawText: rawText !== (source.rawText ?? '') ? rawText : undefined,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
          {/* ── Header ── */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Pressable
              style={[
                styles.backBtn,
                { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF' },
              ]}
              onPress={onClose}
              hitSlop={8}
            >
              <ArrowLeft size={20} color="#6366F1" />
            </Pressable>
            <View style={styles.headerCenter}>
              <View
                style={[
                  styles.headerIconWrap,
                  { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF' },
                ]}
              >
                <FileText size={15} color="#6366F1" />
              </View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
                Edit Source
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.75 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Save size={14} color="#ffffff" />
                  <Text style={styles.saveBtnLabel}>Save</Text>
                </>
              )}
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* File name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>FILE NAME</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                value={fileName}
                onChangeText={setFileName}
                placeholder="e.g. Lecture 3 - Polymorphism"
                placeholderTextColor={colors.mutedForeground}
                selectionColor="#6366F1"
                returnKeyType="next"
                autoCapitalize="words"
              />
            </View>

            {/* Raw text */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>EXTRACTED TEXT</Text>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                Edit the AI-extracted text. Changes will update the AI's understanding of this source automatically.
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                value={rawText}
                onChangeText={setRawText}
                placeholder="No extracted text available for this source."
                placeholderTextColor={colors.mutedForeground}
                selectionColor="#6366F1"
                multiline
                textAlignVertical="top"
                autoCapitalize="sentences"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    includeFontPadding: false,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flexShrink: 0,
  },
  saveBtnLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    includeFontPadding: false,
  },
  body: {
    padding: 20,
    gap: 20,
    paddingBottom: 60,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    includeFontPadding: false,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    includeFontPadding: false,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    includeFontPadding: false,
  },
  textArea: {
    minHeight: 280,
    paddingTop: 12,
  },
});
