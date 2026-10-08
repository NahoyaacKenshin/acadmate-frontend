import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { FileText, Image as ImageIcon, File, BookOpen, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/src/theme/useTheme';

export interface Citation {
  sourceId: string;
  fileName: string;
  chunkIndex: number;
  snippet: string;
  similarity: number; // 0–1 cosine similarity
}

interface ChatMessageCitationsProps {
  citations: Citation[];
  onPress: (citation: Citation) => void;
}

function fileTypeColor(fileName: string, isDark: boolean): { color: string; bg: string } {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) {
    return { color: '#EF4444', bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' };
  }
  if (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp')
  ) {
    return { color: isDark ? '#A78BFA' : '#7C3AED', bg: isDark ? 'rgba(167, 139, 250, 0.15)' : '#EDE9FE' };
  }
  return { color: '#10B981', bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' };
}

function FileIcon({ fileName, color }: { fileName: string; color: string }) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return <FileText size={11} color={color} />;
  if (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp')
  )
    return <ImageIcon size={11} color={color} />;
  return <File size={11} color={color} />;
}

export function ChatMessageCitations({ citations, onPress }: ChatMessageCitationsProps) {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!citations || citations.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      {/* Collapsible toggle bar */}
      <Pressable
        style={({ pressed }) => [
          styles.toggleBar,
          {
            backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF',
            borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : '#C7D2FE',
          },
          pressed && styles.toggleBarPressed,
        ]}
        onPress={() => setIsExpanded((prev) => !prev)}
        hitSlop={6}
      >
        <BookOpen size={12} color="#6366F1" />
        <Text style={styles.toggleText}>
          {citations.length} {citations.length === 1 ? 'source' : 'sources'} referenced
        </Text>
        <ChevronDown
          size={12}
          color="#6366F1"
          style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {/* Expanded citation chips */}
      {isExpanded && (
        <View style={styles.chips}>
          {citations.map((c, idx) => {
            const { color, bg } = fileTypeColor(c.fileName, isDark);
            const shortName =
              c.fileName.length > 22 ? c.fileName.slice(0, 20) + '…' : c.fileName;
            return (
              <Pressable
                key={`${c.sourceId}-${c.chunkIndex}-${idx}`}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: bg },
                  pressed && styles.chipPressed,
                ]}
                onPress={() => onPress(c)}
                hitSlop={4}
              >
                <FileIcon fileName={c.fileName} color={color} />
                <Text style={[styles.chipText, { color }]} numberOfLines={1}>
                  {shortName}
                </Text>
                <View style={[styles.chunkBadge, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)' }]}>
                  <Text style={[styles.chunkBadgeText, { color }]}>Part {c.chunkIndex + 1}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
    gap: 8,
  },
  toggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBarPressed: {
    opacity: 0.7,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
    includeFontPadding: false,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: 240,
  },
  chipPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
    includeFontPadding: false,
  },
  chunkBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  chunkBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    includeFontPadding: false,
  },
});
