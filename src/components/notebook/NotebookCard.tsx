import React from 'react';
import { View, Pressable, StyleSheet, Alert } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { BookOpen, FileText, Trash2, ChevronRight, Sparkles } from 'lucide-react-native';

export interface Notebook {
  id: string;
  title: string;
  description?: string | null;
  sourceCount: number;
  createdAt: string;
  updatedAt: string;
}

interface NotebookCardProps {
  notebook: Notebook;
  onPress: (notebook: Notebook) => void;
  onDelete: (notebook: Notebook) => void;
}

export function NotebookCard({ notebook, onPress, onDelete }: NotebookCardProps) {
  const handleLongPress = () => {
    Alert.alert(
      'Delete Notebook',
      `Are you sure you want to delete "${notebook.title}"? This will also remove all sources and AI data inside it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(notebook),
        },
      ]
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(notebook)}
      onLongPress={handleLongPress}
    >
      {/* Left accent stripe */}
      <View style={styles.accentStripe} />

      <View style={styles.body}>
        {/* Icon container */}
        <View style={styles.iconWrap}>
          <BookOpen size={22} color="#6C8EFF" />
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{notebook.title}</Text>
          {notebook.description ? (
            <Text style={styles.description} numberOfLines={2}>{notebook.description}</Text>
          ) : (
            <Text style={styles.descriptionEmpty}>No description</Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <FileText size={11} color="#6C8EFF" />
              <Text style={styles.metaText}>
                {notebook.sourceCount} {notebook.sourceCount === 1 ? 'source' : 'sources'}
              </Text>
            </View>

            {notebook.sourceCount === 0 && (
              <View style={styles.emptyBadge}>
                <Sparkles size={11} color="#F59E0B" />
                <Text style={styles.emptyBadgeText}>Ready to fill</Text>
              </View>
            )}

            <Text style={styles.dateText}>{formatDate(notebook.updatedAt)}</Text>
          </View>
        </View>

        {/* Chevron */}
        <View style={styles.chevronWrap}>
          <ChevronRight size={18} color="#4A5568" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#161A26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A3143',
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  accentStripe: {
    width: 4,
    backgroundColor: '#6C8EFF',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(108,142,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  descriptionEmpty: {
    fontSize: 13,
    color: '#3A4455',
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(108,142,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  metaText: {
    fontSize: 11,
    color: '#6C8EFF',
    fontWeight: '600',
  },
  emptyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  emptyBadgeText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    color: '#3A4455',
    marginLeft: 'auto',
  },
  chevronWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
