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

function FileIcon({ fileName }: { fileName: string }) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return <FileText size={20} color="#EF4444" />;
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp'))
    return <ImageIcon size={20} color="#8B5CF6" />;
  return <File size={20} color="#22C55E" />;
}

function SimilarityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  // colour shifts from amber → blue → green as similarity rises
  const color = pct >= 80 ? '#22C55E' : pct >= 60 ? '#6C8EFF' : '#F59E0B';
  return (
    <View style={styles.simBarWrapper}>
      <View style={styles.simBarTrack}>
        <View style={[styles.simBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.simPct, { color }]}>{pct}%</Text>
    </View>
  );
}

export function CitationDetailModal({ visible, citation, onClose }: CitationDetailModalProps) {
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
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.fileIconWrap}>
            <FileIcon fileName={citation.fileName} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.fileName} numberOfLines={2}>{citation.fileName}</Text>
            <Text style={styles.fileType}>{fileTypeLabel(citation.fileName)}</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <X size={18} color="#64748B" />
          </Pressable>
        </View>

        <View style={styles.divider} />

        {/* Metadata row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Layers size={13} color="#6C8EFF" />
            <Text style={styles.metaLabel}>Chunk</Text>
            <Text style={styles.metaValue}>#{citation.chunkIndex + 1}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={[styles.metaItem, { flex: 2 }]}>
            <Text style={styles.metaLabel}>Relevance</Text>
            <SimilarityBar value={citation.similarity} />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Snippet */}
        <Text style={styles.snippetLabel}>Matched Excerpt</Text>
        <ScrollView
          style={styles.snippetScroll}
          contentContainerStyle={styles.snippetContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.snippetText}>{citation.snippet}</Text>
        </ScrollView>

        {/* Done button */}
        <Pressable style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.8 }]} onPress={onClose}>
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
    backgroundColor: '#10131C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#2A3143',
    padding: 20,
    paddingBottom: 36,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A3143',
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
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#2A3143',
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
    color: '#ffffff',
    lineHeight: 20,
  },
  fileType: {
    fontSize: 12,
    color: '#4A5568',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#161A26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#1A1F2E',
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
    backgroundColor: '#2A3143',
  },
  metaLabel: {
    fontSize: 11,
    color: '#4A5568',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
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
    backgroundColor: '#1A1F2E',
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
  },
  snippetLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A5568',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  snippetScroll: {
    maxHeight: 180,
    marginBottom: 20,
  },
  snippetContent: {
    backgroundColor: '#161A26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 14,
  },
  snippetText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
  },
  doneBtn: {
    backgroundColor: 'rgba(108,142,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.3)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6C8EFF',
  },
});
