import React from 'react';
import { View, Pressable, StyleSheet, Alert, Text } from 'react-native';
import { BookOpen, FileText, Trash2, ChevronRight, Pencil, Pin } from 'lucide-react-native';
import { parseToPHT } from '@/src/utils/philippineTime';
import { useTheme } from '@/src/theme/useTheme';

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
  isPinned?: boolean;
  onPress: (notebook: Notebook) => void;
  onDelete: (notebook: Notebook) => void;
  onEdit?: (notebook: Notebook) => void;
  onTogglePin?: (notebook: Notebook) => void;
}

export function NotebookCard({
  notebook,
  isPinned = false,
  onPress,
  onDelete,
  onEdit,
  onTogglePin,
}: NotebookCardProps) {
  const { colors, isDark } = useTheme();

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
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (!p) {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }
    return `${months[p.month - 1]} ${p.day}, ${p.year}`;
  };

  const accentColor = isPinned ? '#F59E0B' : '#6366F1';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isPinned ? (isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.4)') : colors.border,
        },
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(notebook)}
      onLongPress={handleLongPress}
    >
      {/* Left accent stripe */}
      <View style={[styles.accentStripe, { backgroundColor: accentColor }]} />

      <View style={styles.body}>
        {/* Icon container */}
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: isPinned
                ? (isDark ? 'rgba(245, 158, 11, 0.14)' : 'rgba(245, 158, 11, 0.1)')
                : (isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)'),
              borderColor: isPinned
                ? (isDark ? 'rgba(245, 158, 11, 0.28)' : 'rgba(245, 158, 11, 0.2)')
                : (isDark ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.14)'),
            },
          ]}
        >
          <BookOpen size={20} color={accentColor} />
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <Text
            style={[styles.title, { color: colors.foreground }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {notebook.title}
          </Text>

          {notebook.description ? (
            <Text
              style={[styles.description, { color: colors.mutedForeground }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {notebook.description}
            </Text>
          ) : (
            <Text style={[styles.descriptionEmpty, { color: colors.mutedForeground }]}>
              No description
            </Text>
          )}

          <View style={styles.metaRow}>
            <View
              style={[
                styles.metaBadge,
                {
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)',
                  borderColor: isDark ? 'rgba(99, 102, 241, 0.24)' : 'rgba(99, 102, 241, 0.16)',
                },
              ]}
            >
              <FileText size={10} color="#6366F1" />
              <Text style={styles.metaText}>
                {notebook.sourceCount} {notebook.sourceCount === 1 ? 'source' : 'sources'}
              </Text>
            </View>

            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
              {formatDate(notebook.updatedAt)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsWrap}>
          {onTogglePin && (
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: isPinned
                    ? (isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.12)')
                    : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'),
                },
                pressed && { opacity: 0.6 },
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onTogglePin(notebook);
              }}
              hitSlop={8}
              accessibilityLabel={isPinned ? 'Unpin notebook' : 'Pin notebook'}
            >
              <Pin
                size={14}
                color={isPinned ? '#F59E0B' : colors.mutedForeground}
                fill={isPinned ? '#F59E0B' : 'transparent'}
              />
            </Pressable>
          )}

          {onEdit && (
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                },
                pressed && { opacity: 0.6 },
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onEdit(notebook);
              }}
              hitSlop={8}
              accessibilityLabel="Edit notebook"
            >
              <Pencil size={14} color={colors.mutedForeground} />
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)',
              },
              pressed && { opacity: 0.6 },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handleLongPress();
            }}
            hitSlop={8}
            accessibilityLabel="Delete notebook"
          >
            <Trash2 size={14} color="#EF4444" />
          </Pressable>

          <ChevronRight size={15} color={colors.mutedForeground} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.995 }],
  },
  accentStripe: {
    width: 4,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 17,
    includeFontPadding: false,
  },
  descriptionEmpty: {
    fontSize: 12,
    fontStyle: 'italic',
    includeFontPadding: false,
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
    gap: 4.5,
    paddingHorizontal: 7.5,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
    includeFontPadding: false,
    flexShrink: 0,
  },
  dateText: {
    fontSize: 11,
    includeFontPadding: false,
    marginLeft: 'auto',
    flexShrink: 0,
  },
  actionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
