import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/src/components/ui/text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/useTheme';
import {
  FileText,
  X,
  Save,
  Trash2,
} from 'lucide-react-native';

interface NoteEditorProps {
  visible: boolean;
  notebookId: string;
  /** If provided, pre-fills the editor for editing an existing note. */
  initialTitle?: string;
  initialContent?: string;
  onClose: () => void;
  /** Called with the note text content once the user saves. */
  onSave: (title: string, content: string) => Promise<void>;
}

export function NoteEditor({
  visible,
  notebookId,
  initialTitle = '',
  initialContent = '',
  onClose,
  onSave,
}: NoteEditorProps) {
  const { colors, isDark } = useTheme();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<TextInput>(null);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const handleSave = async () => {
    if (!title.trim()) { setError('Please enter a note title.'); return; }
    if (!content.trim()) { setError('Note content cannot be empty.'); return; }
    setError(null);
    setIsSaving(true);
    try {
      await onSave(title.trim(), content.trim());
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save note.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleClear = () => {
    setContent('');
    contentRef.current?.focus();
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          style={[styles.container, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* ── Top Bar ── */}
          <View
            style={[
              styles.topBar,
              {
                borderBottomColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Pressable
              style={[
                styles.iconBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleClose}
              disabled={isSaving}
            >
              <X size={18} color={colors.mutedForeground} />
            </Pressable>

            <View style={styles.topBarCenter}>
              <View
                style={[
                  styles.headerIconWrap,
                  { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF' },
                ]}
              >
                <FileText size={15} color="#6366F1" />
              </View>
              <Text style={[styles.topBarTitle, { color: colors.foreground }]}>Note Editor</Text>
            </View>

            <Pressable
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Save size={14} color="#ffffff" />
                  <Text style={styles.saveBtnText}>Save</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* ── Error Banner ── */}
          {error && (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
                },
              ]}
            >
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Title Input ── */}
          <TextInput
            style={[
              styles.titleInput,
              { color: colors.foreground },
            ]}
            placeholder="Note title…"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={(t) => { setTitle(t); setError(null); }}
            maxLength={120}
            returnKeyType="next"
            onSubmitEditing={() => contentRef.current?.focus()}
          />

          {/* ── Divider ── */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* ── Toolbar ── */}
          <View style={styles.toolbar}>
            <Text style={[styles.toolbarInfo, { color: colors.mutedForeground }]}>
              {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} chars
            </Text>
            <View style={styles.toolbarRight}>
              <Pressable
                style={[
                  styles.toolbarBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleClear}
                hitSlop={8}
              >
                <Trash2 size={15} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {/* ── Content Editor ── */}
          <ScrollView
            style={styles.editorScroll}
            contentContainerStyle={styles.editorScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              ref={contentRef}
              style={[
                styles.contentInput,
                { color: colors.foreground },
              ]}
              placeholder={
                `Start typing your notes here…\n\nYou can write anything:\n• Summaries\n• Key concepts\n• Formulas\n• Personal observations`
              }
              placeholderTextColor={colors.mutedForeground}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
              autoCorrect
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  // ── Top Bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topBarCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    includeFontPadding: false,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    includeFontPadding: false,
  },
  // ── Error ─────────────────────────────────────────────────────────────────
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    includeFontPadding: false,
  },
  // ── Title ─────────────────────────────────────────────────────────────────
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    includeFontPadding: false,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
  },
  // ── Toolbar ───────────────────────────────────────────────────────────────
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  toolbarInfo: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    includeFontPadding: false,
  },
  toolbarRight: {
    flexDirection: 'row',
    gap: 6,
  },
  toolbarBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Editor ────────────────────────────────────────────────────────────────
  editorScroll: {
    flex: 1,
  },
  editorScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
    flexGrow: 1,
  },
  contentInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    minHeight: 400,
    includeFontPadding: false,
  },
});
