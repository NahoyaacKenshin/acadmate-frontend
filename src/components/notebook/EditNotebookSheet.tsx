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
  Text,
} from 'react-native';
import { Pencil, X, AlertCircle } from 'lucide-react-native';
import { Notebook } from './NotebookCard';
import { useTheme } from '@/src/theme/useTheme';

interface EditNotebookSheetProps {
  visible: boolean;
  notebook: Notebook | null;
  onClose: () => void;
  onSave: (id: string, title: string, description: string) => Promise<void>;
}

export function EditNotebookSheet({ visible, notebook, onClose, onSave }: EditNotebookSheetProps) {
  const { colors, isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleFocused, setTitleFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);

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
      setError(err?.message ?? 'Failed to update notebook. Please try again.');
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
        behavior="padding"
        style={styles.keyboardAvoid}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.sheet,
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
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                    borderColor: isDark ? 'rgba(99, 102, 241, 0.28)' : 'rgba(99, 102, 241, 0.2)',
                  },
                ]}
              >
                <Pencil size={18} color="#6366F1" />
              </View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>Edit Notebook</Text>
            </View>
            <Pressable
              style={[
                styles.closeBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
              onPress={handleClose}
              hitSlop={8}
              accessibilityLabel="Close"
            >
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Title *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: error && !title.trim()
                      ? colors.destructive
                      : titleFocused
                      ? colors.ring
                      : colors.inputBorder,
                    color: colors.foreground,
                  },
                ]}
                placeholder="e.g. Physics — Chapter 5"
                placeholderTextColor={colors.mutedForeground}
                value={title}
                onChangeText={(t) => { setTitle(t); setError(null); }}
                onFocus={() => setTitleFocused(true)}
                onBlur={() => setTitleFocused(false)}
                maxLength={80}
                returnKeyType="next"
              />
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Description{' '}
                <Text style={[styles.optional, { color: colors.mutedForeground }]}>
                  (optional)
                </Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.inputMultiline,
                  {
                    backgroundColor: colors.input,
                    borderColor: descFocused ? colors.ring : colors.inputBorder,
                    color: colors.foreground,
                  },
                ]}
                placeholder="What will you put in this notebook?"
                placeholderTextColor={colors.mutedForeground}
                value={description}
                onChangeText={setDescription}
                onFocus={() => setDescFocused(true)}
                onBlur={() => setDescFocused(false)}
                multiline
                numberOfLines={3}
                maxLength={300}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
                {description.length}/300
              </Text>
            </View>

            {error && (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                  },
                ]}
              >
                <AlertCircle size={15} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: colors.primary,
                opacity: isLoading ? 0.6 : pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                Save Changes
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
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
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flexShrink: 1,
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
    includeFontPadding: false,
  },
  optional: {
    fontWeight: '400',
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
  },
  inputMultiline: {
    minHeight: 88,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 3,
    includeFontPadding: false,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    includeFontPadding: false,
  },
  saveBtn: {
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
    includeFontPadding: false,
  },
});
