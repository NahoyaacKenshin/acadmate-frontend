import React, { useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { Text } from '@/src/components/ui/text';
import { useTheme } from '@/src/theme/useTheme';
import { Sparkles, PenLine, X, Layers, AlertCircle } from 'lucide-react-native';

interface CreateDeckModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (count: number, title?: string) => Promise<any>;
  onCreateManual: (title: string, description?: string) => Promise<any>;
  isGenerating: boolean;
  isOnline: boolean;
  notebookTitle: string;
}

export function CreateDeckModal({
  visible,
  onClose,
  onGenerate,
  onCreateManual,
  isGenerating,
  isOnline,
  notebookTitle,
}: CreateDeckModalProps) {
  const { colors, isDark } = useTheme();
  const [tab, setTab] = useState<'ai' | 'manual'>('ai');
  const [cardCount, setCardCount] = useState<number>(12);
  const [customTitle, setCustomTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const styles = createStyles(colors, isDark);

  const handleGenerate = async () => {
    if (!isOnline) {
      Alert.alert('Offline Mode', 'Generating new flashcards with AI requires an active internet connection.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onGenerate(cardCount, customTitle.trim() || undefined);
      setCustomTitle('');
      onClose();
    } catch (err: any) {
      Alert.alert('Generation Failed', err?.message || 'Could not generate flashcards. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualCreate = async () => {
    if (!customTitle.trim()) {
      Alert.alert('Required', 'Please enter a title for the deck.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreateManual(customTitle.trim(), manualDescription.trim() || undefined);
      setCustomTitle('');
      setManualDescription('');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create deck.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isGenerating || isSubmitting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Layers size={18} color="#6366F1" />
              <Text style={styles.headerTitle}>New Flashcard Deck</Text>
            </View>
            <Pressable onPress={onClose} disabled={busy} style={styles.closeBtn}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Mode Switcher Tabs */}
            <View style={styles.tabBar}>
            <Pressable
              onPress={() => setTab('ai')}
              style={[styles.tabItem, tab === 'ai' && styles.tabItemActive]}
            >
              <Sparkles size={15} color={tab === 'ai' ? '#6366F1' : colors.mutedForeground} />
              <Text style={[styles.tabItemText, tab === 'ai' && styles.tabItemTextActive]}>
                Generate with AI
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTab('manual')}
              style={[styles.tabItem, tab === 'manual' && styles.tabItemActive]}
            >
              <PenLine size={15} color={tab === 'manual' ? '#6366F1' : colors.mutedForeground} />
              <Text style={[styles.tabItemText, tab === 'manual' && styles.tabItemTextActive]}>
                Create Blank
              </Text>
            </Pressable>
          </View>

          {tab === 'ai' ? (
            <View style={styles.content}>
              {!isOnline && (
                <View style={styles.offlineNotice}>
                  <AlertCircle size={15} color="#D97706" />
                  <Text style={styles.offlineText}>
                    You are offline. Connect to internet to generate cards with AI.
                  </Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>NUMBER OF CARDS</Text>
              <View style={styles.countSelector}>
                {[8, 12, 16, 20].map((num) => (
                  <Pressable
                    key={num}
                    onPress={() => setCardCount(num)}
                    style={[styles.countPill, cardCount === num && styles.countPillActive]}
                  >
                    <Text
                      style={[
                        styles.countPillText,
                        cardCount === num && styles.countPillTextActive,
                      ]}
                    >
                      {num} Cards
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>CUSTOM DECK TITLE (OPTIONAL)</Text>
              <TextInput
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder={`${notebookTitle} - Key Concepts`}
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
                editable={!busy}
              />

              <Pressable
                onPress={handleGenerate}
                disabled={busy || !isOnline}
                style={[
                  styles.primaryBtn,
                  (busy || !isOnline) && styles.primaryBtnDisabled,
                ]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Sparkles size={16} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Generate Deck</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.content}>
              <Text style={styles.fieldLabel}>DECK TITLE</Text>
              <TextInput
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder="e.g. Chapter 3 Vocab"
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
                editable={!busy}
              />

              <Text style={styles.fieldLabel}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                value={manualDescription}
                onChangeText={setManualDescription}
                placeholder="Notes or study focus..."
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={3}
                editable={!busy}
              />

              <Pressable
                onPress={handleManualCreate}
                disabled={busy}
                style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Create Deck</Text>
                )}
              </Pressable>
            </View>
          )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    keyboardAvoid: {
      flex: 1,
      justifyContent: 'flex-end',
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
      maxHeight: '88%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 17,
      color: colors.foreground,
      letterSpacing: -0.4,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1C1F2E' : '#F4F4F5',
      borderRadius: 12,
      padding: 3,
      marginBottom: 18,
    },
    tabItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 9,
      gap: 6,
    },
    tabItemActive: {
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    tabItemText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 12.5,
      color: colors.mutedForeground,
      includeFontPadding: false,
      flexShrink: 0,
    },
    tabItemTextActive: {
      color: '#6366F1',
      fontWeight: '700',
    },
    content: {
      gap: 12,
    },
    fieldLabel: {
      fontFamily: 'Inter-Bold',
      fontSize: 11,
      color: colors.mutedForeground,
      letterSpacing: 1.2,
      includeFontPadding: false,
    },
    countSelector: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 6,
    },
    countPill: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    countPillActive: {
      borderColor: '#6366F1',
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
    },
    countPillText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 12,
      color: colors.foreground,
      includeFontPadding: false,
      flexShrink: 0,
    },
    countPillTextActive: {
      color: '#6366F1',
      fontWeight: '700',
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
    offlineNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
      padding: 10,
      borderRadius: 10,
      marginBottom: 6,
    },
    offlineText: {
      fontFamily: 'Inter',
      fontSize: 12,
      color: isDark ? '#FCD34D' : '#B45309',
      flex: 1,
    },
    primaryBtn: {
      backgroundColor: '#6366F1',
      paddingVertical: 13,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 8,
    },
    primaryBtnDisabled: {
      opacity: 0.5,
    },
    primaryBtnText: {
      fontFamily: 'Inter-Bold',
      fontSize: 14,
      color: '#FFFFFF',
      letterSpacing: -0.2,
      includeFontPadding: false,
    },
  });
