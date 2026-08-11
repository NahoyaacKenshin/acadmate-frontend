import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { FileText, Image as ImageIcon, File } from 'lucide-react-native';

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
  if (!citations || citations.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Sources</Text>
      <View style={styles.chips}>
        {citations.map((c, idx) => {
          const { color, bg } = fileTypeColor(c.fileName);
          const pct = Math.round(c.similarity * 100);
          const shortName =
            c.fileName.length > 22 ? c.fileName.slice(0, 20) + '…' : c.fileName;
          return (
            <Pressable
              key={`${c.sourceId}-${c.chunkIndex}`}
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
              <View style={[styles.pctBadge, { borderColor: color }]}>
                <Text style={[styles.pctText, { color }]}>{pct}%</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 10,
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4A5568',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    maxWidth: 220,
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
  pctBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  pctText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
