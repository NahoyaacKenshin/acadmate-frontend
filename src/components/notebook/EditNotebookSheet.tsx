import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/src/components/ui/text';
import { Pencil, X } from 'lucide-react-native';
import { Notebook } from './NotebookCard';

interface EditNotebookSheetProps {
  visible: boolean;
  notebook: Notebook | null;
  onClose: () => void;
  onSave: (id: string, title: string, description: string) => Promise<void>;
}

export function EditNotebookSheet({ visible, notebook, onClose, onSave }: EditNotebookSheetProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (notebook) {
      setTitle(notebook.title);
      setDescription(notebook.description || '');
      setError(null);
    }
  }, [notebook, visible]);

  const handleSave = async () => {
    if (!notebook) return;
    if (!title.trim()) {
      setError('Please enter a notebook title.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await onSave(notebook.id, title.trim(), description.trim());
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to update notebook. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconWrap}>
                <Pencil size={18} color="#6C8EFF" />
              </View>
              <Text style={styles.headerTitle}>Edit Notebook</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={8}>
              <X size={20} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={[styles.input, error && !title.trim() ? styles.inputError : null]}
                placeholder="e.g. Physics — Chapter 5"
                placeholderTextColor="#3A4455"
                value={title}
                onChangeText={(t) => { setTitle(t); setError(null); }}
                maxLength={80}
                returnKeyType="next"
              />
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="What will you put in this notebook?"
                placeholderTextColor="#3A4455"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={300}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{description.length}/300</Text>
            </View>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* CTA */}
          <Pressable
            style={[styles.saveBtn, (isLoading || !title.trim()) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isLoading || !title.trim()}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetWrapper: {
    backgroundColor: '#161A26',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#2A3143',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '75%',
  },
  sheet: {
    paddingHorizontal: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: '#2A3143',
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(108,142,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2330',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContent: {
    gap: 16,
    paddingBottom: 20,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  optional: {
    fontWeight: '400',
    color: '#4A5568',
  },
  input: {
    backgroundColor: '#10131C',
    borderWidth: 1,
    borderColor: '#2A3143',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#ffffff',
  },
  inputMultiline: {
    minHeight: 90,
    paddingTop: 12,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  charCount: {
    fontSize: 11,
    color: '#3A4455',
    textAlign: 'right',
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
  },
  saveBtn: {
    backgroundColor: '#6C8EFF',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginHorizontal: 0,
    shadowColor: '#6C8EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
