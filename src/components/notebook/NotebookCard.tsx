import React from 'react';
import { View, Pressable, StyleSheet, Alert } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { BookOpen, FileText, Trash2, ChevronRight, Pencil } from 'lucide-react-native';
import { parseToPHT } from '@/src/utils/philippineTime';

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
  onEdit?: (notebook: Notebook) => void;
}

export function NotebookCard({ notebook, onPress, onDelete, onEdit }: NotebookCardProps) {
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
    const p = parseToPHT(iso);
    if (!p) {
      const d = new Date(iso);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[p.month - 1]} ${p.day}, ${p.year}`;
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

            <Text style={styles.dateText}>{formatDate(notebook.updatedAt)}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsWrap}>
          {onEdit && (
            <Pressable
              style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.6 }]}
              onPress={(e) => {
                e.stopPropagation();
                onEdit(notebook);
              }}
              hitSlop={8}
            >
              <Pencil size={15} color="#6C8EFF" />
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
            onPress={(e) => {
              e.stopPropagation();
              handleLongPress();
            }}
            hitSlop={8}
          >
            <Trash2 size={15} color="#EF4444" />
          </Pressable>
          <ChevronRight size={16} color="#4A5568" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#161A26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  accentStripe: {
    width: 4,
    backgroundColor: '#6C8EFF',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(108,142,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  description: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  descriptionEmpty: {
    fontSize: 12,
    color: '#3A4455',
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(108,142,255,0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
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
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emptyBadgeText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
    color: '#3A4455',
    marginLeft: 'auto',
  },
  actionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(108,142,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
