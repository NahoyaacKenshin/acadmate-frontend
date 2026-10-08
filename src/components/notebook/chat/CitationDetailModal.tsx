import React from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Text } from '@/src/components/ui/text';
import { Citation } from './ChatMessageCitations';
import { FileText, Image as ImageIcon, File, X, Layers } from 'lucide-react-native';
import { useTheme } from '@/src/theme/useTheme';

interface CitationDetailModalProps {
  visible: boolean;
  citation: Citation | null;
  onClose: () => void;
}

function fileTypeLabel(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDF Document';
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp'))
    return 'Image';
  if (lower.endsWith('.docx')) return 'Word Document';
  return 'Text File';
}

function FileIcon({ fileName, isDark }: { fileName: string; isDark: boolean }) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return <FileText size={20} color="#EF4444" />;
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp'))
    return <ImageIcon size={20} color={isDark ? '#A78BFA' : '#7C3AED'} />;
  return <File size={20} color="#10B981" />;
}

function SimilarityBar({ value, trackBg }: { value: number; trackBg: string }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#10B981' : pct >= 60 ? '#6366F1' : '#F59E0B';
  return (
    <View style={styles.simBarWrapper}>
      <View style={[styles.simBarTrack, { backgroundColor: trackBg }]}>
        <View style={[styles.simBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.simPct, { color }]}>{pct}%</Text>
    </View>
  );
}

export function CitationDetailModal({ visible, citation, onClose }: CitationDetailModalProps) {
  const { colors, isDark } = useTheme();

  if (!citation) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
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
          <View
            style={[
              styles.fileIconWrap,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB',
                borderColor: colors.border,
              },
            ]}
          >
            <FileIcon fileName={citation.fileName} isDark={isDark} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={2}>
              {citation.fileName}
            </Text>
            <Text style={[styles.fileType, { color: colors.mutedForeground }]}>
              {fileTypeLabel(citation.fileName)}
            </Text>
          </View>
          <Pressable
            style={[
              styles.closeBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F4F4F5' },
            ]}
            onPress={onClose}
            hitSlop={8}
          >
            <X size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Metadata row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Layers size={13} color="#6366F1" />
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Section</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>#{citation.chunkIndex + 1}</Text>
          </View>
          <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
          <View style={[styles.metaItem, { flex: 2 }]}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Relevance</Text>
            <SimilarityBar value={citation.similarity} trackBg={colors.border} />
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Snippet */}
        <Text style={[styles.snippetLabel, { color: colors.mutedForeground }]}>MATCHED EXCERPT</Text>
        <ScrollView
          style={styles.snippetScroll}
          contentContainerStyle={[
            styles.snippetContent,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
              borderColor: colors.border,
            },
          ]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <Text style={[styles.snippetText, { color: colors.foreground }]}>{citation.snippet}</Text>
        </ScrollView>

        {/* Done button */}
        <Pressable
          style={({ pressed }) => [
            styles.doneBtn,
            {
              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
              borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE',
            },
            pressed && { opacity: 0.8 },
          ]}
          onPress={onClose}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  fileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    includeFontPadding: false,
  },
  fileType: {
    fontSize: 12,
    includeFontPadding: false,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metaDivider: {
    width: 1,
    height: 28,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    includeFontPadding: false,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    includeFontPadding: false,
  },
  simBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  simBarFill: {
    height: 6,
    borderRadius: 3,
  },
  simPct: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'right',
    includeFontPadding: false,
  },
  snippetLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
    includeFontPadding: false,
  },
  snippetScroll: {
    maxHeight: 180,
    marginBottom: 20,
  },
  snippetContent: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  snippetText: {
    fontSize: 13,
    lineHeight: 20,
    includeFontPadding: false,
  },
  doneBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
    includeFontPadding: false,
  },
});
