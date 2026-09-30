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

interface EditSourceModalProps {
  visible: boolean;
  source: Source | null;
  onClose: () => void;
  onSave: (sourceId: string, data: { fileName?: string; rawText?: string }) => Promise<void>;
}

export function EditSourceModal({ visible, source, onClose, onSave }: EditSourceModalProps) {
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
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={onClose} hitSlop={8}>
              <ArrowLeft size={20} color="#6C8EFF" />
            </Pressable>
            <View style={styles.headerCenter}>
              <FileText size={16} color="#A78BFA" />
              <Text style={styles.headerTitle} numberOfLines={1}>Edit Source</Text>
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
              <Text style={styles.label}>File Name</Text>
              <TextInput
                style={styles.input}
                value={fileName}
                onChangeText={setFileName}
                placeholder="e.g. Lecture 3 - Polymorphism"
                placeholderTextColor="#3A4455"
                selectionColor="#6C8EFF"
                returnKeyType="next"
                autoCapitalize="words"
              />
            </View>

            {/* Raw text */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Extracted Text</Text>
              <Text style={styles.hint}>
                Edit the AI-extracted text. Changes will update the AI's understanding of this source automatically.
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={rawText}
                onChangeText={setRawText}
                placeholder="No extracted text available for this source."
                placeholderTextColor="#3A4455"
                selectionColor="#6C8EFF"
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
    backgroundColor: '#10131C',
  },
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
    backgroundColor: 'rgba(108,142,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6C8EFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
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
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 17,
  },
  input: {
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  textArea: {
    minHeight: 280,
    paddingTop: 12,
  },
});
