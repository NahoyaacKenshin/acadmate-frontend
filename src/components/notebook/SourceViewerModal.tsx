import React, { useState } from 'react';
import {
  View,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/src/components/ui/text';
import { Source } from '@/src/components/notebook/SourceListItem';
import { useTheme } from '@/src/theme/useTheme';
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
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  if (!source) return null;

  const rawText = source.rawText?.trim() ?? '';
  const wordCount = rawText ? rawText.split(/\s+/).length : 0;
  const charCount = rawText.length;

  const handleCopy = async () => {
    if (!rawText) return;
    try {
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Pressable
            style={[
              styles.closeBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={onClose}
            hitSlop={8}
          >
            <X size={18} color={colors.mutedForeground} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
              {source.fileName}
            </Text>
            <View style={styles.metaRow}>
              <Text
                style={[
                  styles.metaBadge,
                  {
                    color: '#6366F1',
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                  },
                ]}
              >
                {source.fileType}
              </Text>
              {source.chunkCount != null && (
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {source.chunkCount} sections indexed
                </Text>
              )}
            </View>
          </View>

          {rawText.length > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.copyBtn,
                {
                  backgroundColor: copied
                    ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5')
                    : (isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF'),
                },
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleCopy}
              hitSlop={8}
            >
              {copied ? <Check size={15} color="#10B981" /> : <Copy size={15} color="#6366F1" />}
              <Text
                style={[
                  styles.copyLabel,
                  { color: copied ? '#10B981' : '#6366F1' },
                ]}
              >
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Content Info Bar */}
        {rawText.length > 0 && (
          <View
            style={[
              styles.statsBar,
              {
                backgroundColor: colors.card,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={styles.statItem}>
              <BookOpen size={13} color="#6366F1" />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                {wordCount.toLocaleString()} words
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Layers size={13} color={isDark ? '#A78BFA' : '#7C3AED'} />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                {charCount.toLocaleString()} characters
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Sparkles size={13} color="#10B981" />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                Offline Ready
              </Text>
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
            <View
              style={[
                styles.textCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.bodyText, { color: colors.foreground }]} selectable={true}>
                {rawText}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIconWrap,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <FileText size={36} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Extracted Text Unavailable
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  metaBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    includeFontPadding: false,
    flexShrink: 0,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
    includeFontPadding: false,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  copyLabel: {
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
    includeFontPadding: false,
  },
  statDivider: {
    width: 1,
    height: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  textCard: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 24,
    includeFontPadding: false,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    includeFontPadding: false,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    includeFontPadding: false,
  },
});
