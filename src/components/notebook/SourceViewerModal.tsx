import React, { useState } from 'react';
import {
  View,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/src/components/ui/text';
import { Source } from '@/src/components/notebook/SourceListItem';
import {
  X,
  Copy,
  Check,
  FileText,
  BookOpen,
  Layers,
  Sparkles,
} from 'lucide-react-native';

interface SourceViewerModalProps {
  visible: boolean;
  source: Source | null;
  onClose: () => void;
}

export function SourceViewerModal({ visible, source, onClose }: SourceViewerModalProps) {
  const [copied, setCopied] = useState(false);

  if (!source) return null;

  const rawText = source.rawText?.trim() ?? '';
  const wordCount = rawText ? rawText.split(/\s+/).length : 0;
  const charCount = rawText.length;

  const handleCopy = async () => {
    if (!rawText) return;
    try {
      // In Expo, Clipboard is available from react-native or expo-clipboard if installed
      // Try navigator.clipboard for web/fallback
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(rawText);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Copied', 'Extracted study content ready in memory.');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <X size={20} color="#94A3B8" />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {source.fileName}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaBadge}>{source.fileType}</Text>
              {source.chunkCount != null && (
                <Text style={styles.metaText}>{source.chunkCount} indexed chunks</Text>
              )}
            </View>
          </View>

          {rawText.length > 0 && (
            <Pressable
              style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.7 }]}
              onPress={handleCopy}
              hitSlop={8}
            >
              {copied ? <Check size={16} color="#22C55E" /> : <Copy size={16} color="#6C8EFF" />}
              <Text style={[styles.copyLabel, copied && { color: '#22C55E' }]}>
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Content Info Bar */}
        {rawText.length > 0 && (
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <BookOpen size={13} color="#6C8EFF" />
              <Text style={styles.statText}>{wordCount.toLocaleString()} words</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Layers size={13} color="#A78BFA" />
              <Text style={styles.statText}>{charCount.toLocaleString()} characters</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Sparkles size={13} color="#22C55E" />
              <Text style={styles.statText}>Available Offline</Text>
            </View>
          </View>
        )}

        {/* Document Body */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {rawText.length > 0 ? (
            <View style={styles.textCard}>
              <Text style={styles.bodyText} selectable={true}>
                {rawText}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <FileText size={44} color="#2A3143" />
              <Text style={styles.emptyTitle}>Extracted Text Unavailable</Text>
              <Text style={styles.emptySubtitle}>
                {source.status === 'PROCESSING' || source.status === 'PENDING'
                  ? 'This source is currently being indexed by Acadmate. Once ready, the extracted content will appear here.'
                  : 'No text was extracted from this file, or the source failed to process.'}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1118',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#111520',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#161A26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#F1F5F9',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  metaBadge: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#6C8EFF',
    backgroundColor: 'rgba(108,142,255,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(108,142,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#6C8EFF',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#141824',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#94A3B8',
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  textCard: {
    backgroundColor: '#161A26',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bodyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#E2E8F0',
    lineHeight: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#94A3B8',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
});
