import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { FileText, Image as ImageIcon, File, BookOpen, ChevronDown } from 'lucide-react-native';

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

function fileTypeColor(fileName: string): { color: string; bg: string } {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return { color: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
  if (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp')
  )
    return { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' };
  return { color: '#22C55E', bg: 'rgba(34,197,94,0.12)' };
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
  const [isExpanded, setIsExpanded] = useState(false);

  if (!citations || citations.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      {/* Collapsible toggle bar */}
      <Pressable
        style={({ pressed }) => [styles.toggleBar, pressed && styles.toggleBarPressed]}
        onPress={() => setIsExpanded((prev) => !prev)}
        hitSlop={6}
      >
        <BookOpen size={12} color="#6C8EFF" />
        <Text style={styles.toggleText}>
          {citations.length} {citations.length === 1 ? 'source' : 'sources'} referenced
        </Text>
        <ChevronDown
          size={12}
          color="#6C8EFF"
          style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {/* Expanded citation chips */}
      {isExpanded && (
        <View style={styles.chips}>
          {citations.map((c, idx) => {
            const { color, bg } = fileTypeColor(c.fileName);
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
                <View style={[styles.chunkBadge, { backgroundColor: color + '1F' }]}>
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
    backgroundColor: 'rgba(108, 142, 255, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(108, 142, 255, 0.2)',
  },
  toggleBarPressed: {
    opacity: 0.7,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6C8EFF',
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
  },
  chunkBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chunkBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
