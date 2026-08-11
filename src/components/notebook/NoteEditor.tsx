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
import {
  FileText,
  X,
  Save,
  Bold,
  Type,
  AlignLeft,
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
    // If there's unsaved content ask, else just close
    onClose();
  };

  const handleClear = () => {
    setContent('');
    contentRef.current?.focus();
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* ── Top Bar ── */}
          <View style={styles.topBar}>
            <Pressable style={styles.iconBtn} onPress={handleClose} disabled={isSaving}>
              <X size={20} color="#64748B" />
            </Pressable>

            <View style={styles.topBarCenter}>
              <FileText size={16} color="#6C8EFF" />
              <Text style={styles.topBarTitle}>Note Editor</Text>
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
                  <Save size={15} color="#ffffff" />
                  <Text style={styles.saveBtnText}>Save</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* ── Error Banner ── */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Title Input ── */}
          <TextInput
            style={styles.titleInput}
            placeholder="Note title…"
            placeholderTextColor="#3A4455"
            value={title}
            onChangeText={(t) => { setTitle(t); setError(null); }}
            maxLength={120}
            returnKeyType="next"
            onSubmitEditing={() => contentRef.current?.focus()}
          />

          {/* ── Divider ── */}
          <View style={styles.divider} />

          {/* ── Toolbar ── */}
          <View style={styles.toolbar}>
            <Text style={styles.toolbarInfo}>
              {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} chars
            </Text>
            <View style={styles.toolbarRight}>
              <Pressable style={styles.toolbarBtn} onPress={handleClear} hitSlop={8}>
                <Trash2 size={15} color="#64748B" />
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
              style={styles.contentInput}
              placeholder={
                `Start typing your notes here…\n\nYou can write anything:\n• Summaries\n• Key concepts\n• Formulas\n• Personal observations`
              }
              placeholderTextColor="#2A3143"
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
    backgroundColor: '#10131C',
  },
  container: {
    flex: 1,
    backgroundColor: '#10131C',
  },
  // ── Top Bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1F2E',
    backgroundColor: '#10131C',
  },
  topBarCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#161A26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6C8EFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#6C8EFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  // ── Error ─────────────────────────────────────────────────────────────────
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
  },
  // ── Title ─────────────────────────────────────────────────────────────────
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#1A1F2E',
    marginHorizontal: 20,
  },
  // ── Toolbar ───────────────────────────────────────────────────────────────
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  toolbarInfo: {
    flex: 1,
    fontSize: 12,
    color: '#3A4455',
  },
  toolbarRight: {
    flexDirection: 'row',
    gap: 6,
  },
  toolbarBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#161A26',
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
    color: '#D1D5DB',
    minHeight: 400,
  },
});
