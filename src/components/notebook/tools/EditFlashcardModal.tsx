import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/src/components/ui/text';
import { useTheme } from '@/src/theme/useTheme';
import { Flashcard } from '@/src/store/notebookToolsStore';
import { X, Trash2, Check } from 'lucide-react-native';

interface EditFlashcardModalProps {
  visible: boolean;
  onClose: () => void;
  card?: Flashcard | null;
  onSave: (data: { front: string; back: string }) => Promise<void>;
  onDelete?: (cardId: string) => Promise<void>;
}

export function EditFlashcardModal({
  visible,
  onClose,
  card,
  onSave,
  onDelete,
}: EditFlashcardModalProps) {
  const { colors, isDark } = useTheme();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (card) {
      setFront(card.front);
      setBack(card.back);
    } else {
      setFront('');
      setBack('');
    }
  }, [card, visible]);

  const styles = createStyles(colors, isDark);

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) {
      Alert.alert('Required Fields', 'Both Front (Term/Question) and Back (Definition/Answer) are required.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ front: front.trim(), back: back.trim() });
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save card.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!card || !onDelete) return;
    Alert.alert('Delete Card', 'Are you sure you want to delete this flashcard?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await onDelete(card.id);
            onClose();
          } catch (err: any) {
            const raw = err?.message || '';
            const msg = raw.includes('Network request failed') || raw.includes('http')
              ? 'Failed to delete card. Please check your connection.'
              : raw || 'Failed to delete card.';
            Alert.alert('Error', msg);
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  const isEditing = !!card;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={isSaving ? undefined : onClose} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{isEditing ? 'Edit Flashcard' : 'Add New Flashcard'}</Text>
            <View style={styles.headerActions}>
              {isEditing && onDelete && (
                <Pressable onPress={handleDelete} disabled={isDeleting} style={styles.deleteBtn}>
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Trash2 size={18} color="#EF4444" />
                  )}
                </Pressable>
              )}
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          <View style={styles.body}>
            <Text style={styles.fieldLabel}>FRONT (TERM / QUESTION)</Text>
            <TextInput
              value={front}
              onChangeText={setFront}
              placeholder="e.g. Virtual Memory"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.fieldLabel}>BACK (DEFINITION / ANSWER)</Text>
            <TextInput
              value={back}
              onChangeText={setBack}
              placeholder="e.g. A storage allocation scheme in which secondary memory can be addressed as though it were main memory..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, styles.textAreaLarge]}
              multiline
              numberOfLines={5}
            />

            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={16} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Add Card'}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 17,
      color: colors.foreground,
      letterSpacing: -0.4,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    deleteBtn: {
      padding: 8,
      borderRadius: 8,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
    },
    body: {
      gap: 12,
    },
    fieldLabel: {
      fontFamily: 'Inter-Bold',
      fontSize: 11,
      color: colors.mutedForeground,
      letterSpacing: 1.2,
      includeFontPadding: false,
    },
    input: {
      backgroundColor: isDark ? '#181A20' : '#FAFAFA',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontFamily: 'Inter',
      fontSize: 14,
      color: colors.foreground,
    },
    textArea: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    textAreaLarge: {
      minHeight: 110,
      textAlignVertical: 'top',
    },
    saveBtn: {
      backgroundColor: '#6366F1',
      paddingVertical: 13,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 8,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      fontFamily: 'Inter-Bold',
      fontSize: 14,
      color: '#FFFFFF',
      letterSpacing: -0.2,
      includeFontPadding: false,
    },
  });
