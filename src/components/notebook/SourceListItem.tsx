import React, { useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, Animated, Text } from 'react-native';
import {
  FileText,
  Image as ImageIcon,
  File,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCw,
  Pencil,
} from 'lucide-react-native';
import { parseToPHT } from '@/src/utils/philippineTime';
import { useTheme } from '@/src/theme/useTheme';

export type SourceStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
export type SourceFileType = 'PDF' | 'IMAGE' | 'TEXT';

export interface Source {
  id: string;
  fileName: string;
  fileType: SourceFileType;
  status: SourceStatus;
  rawText?: string | null;
  chunkCount?: number;
  createdAt: string;
}

interface SourceListItemProps {
  source: Source;
  onDelete: (source: Source) => void;
  onRetry?: (source: Source) => void;
  onPress?: (source: Source) => void;
  onEdit?: (source: Source) => void;
}

function FileTypeIcon({ type }: { type: SourceFileType }) {
  const props = { size: 18 };
  if (type === 'PDF') return <FileText {...props} color="#EF4444" />;
  if (type === 'IMAGE') return <ImageIcon {...props} color="#8B5CF6" />;
  return <File {...props} color="#6366F1" />;
}

/** Animated spinning icon for the PROCESSING state */
function SpinnerIcon({ color }: { color: string }) {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [rotation]);
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <RotateCw size={11} color={color} />
    </Animated.View>
  );
}

function StatusBadge({ status }: { status: SourceStatus }) {
  const config: Record<SourceStatus, { label: string; color: string; bg: string }> = {
    PENDING: { label: 'Queued', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
    PROCESSING: { label: 'Processing…', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)' },
    READY: { label: 'Ready', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
    FAILED: { label: 'Failed', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  };
  const { label, color, bg } = config[status];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {status === 'PROCESSING' ? (
        <SpinnerIcon color={color} />
      ) : status === 'PENDING' ? (
        <Clock size={11} color={color} />
      ) : status === 'READY' ? (
        <CheckCircle2 size={11} color={color} />
      ) : (
        <AlertCircle size={11} color={color} />
      )}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

/** Format a createdAt ISO string to PHT-aware short date (e.g. "Sep 7") */
function formatDatePHT(iso: string): string {
  const p = parseToPHT(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!p) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }
  return `${months[p.month - 1]} ${p.day}`;
}

export function SourceListItem({
  source,
  onDelete,
  onRetry,
  onPress,
  onEdit,
}: SourceListItemProps) {
  const { colors, isDark } = useTheme();
  const isFailed = source.status === 'FAILED';
  const isReady = source.status === 'READY';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isFailed
            ? (isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.4)')
            : colors.border,
        },
        pressed && isReady && styles.cardPressed,
      ]}
      onPress={() => isReady && onPress?.(source)}
      disabled={!isReady}
    >
      {/* File type icon */}
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
            borderColor: colors.border,
          },
        ]}
      >
        <FileTypeIcon type={source.fileType} />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text
          style={[styles.fileName, { color: colors.foreground }]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {source.fileName}
        </Text>

        <View style={styles.metaRow}>
          <StatusBadge status={source.status} />

          {source.chunkCount !== undefined && source.chunkCount > 0 && (
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {source.chunkCount} {source.chunkCount === 1 ? 'part' : 'parts'}
            </Text>
          )}

          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
            {formatDatePHT(source.createdAt)}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        {isFailed && onRetry && (
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
              },
              pressed && { opacity: 0.6 },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onRetry(source);
            }}
            hitSlop={8}
            accessibilityLabel="Retry source processing"
          >
            <RotateCw size={14} color="#6366F1" />
          </Pressable>
        )}

        {isReady && onEdit && (
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: colors.border,
              },
              pressed && { opacity: 0.6 },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onEdit(source);
            }}
            hitSlop={8}
            accessibilityLabel="Edit source details"
          >
            <Pencil size={13} color={colors.mutedForeground} />
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)',
            },
            pressed && { opacity: 0.6 },
          ]}
          onPress={(e) => {
            e.stopPropagation();
            onDelete(source);
          }}
          hitSlop={8}
          accessibilityLabel="Delete source"
        >
          <Trash2 size={13} color="#EF4444" />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 13,
    gap: 12,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.995 }],
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
  info: {
    flex: 1,
    gap: 5,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.15,
    includeFontPadding: false,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7.5,
    paddingVertical: 2.5,
    borderRadius: 6,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    includeFontPadding: false,
    flexShrink: 0,
  },
  metaText: {
    fontSize: 11,
    includeFontPadding: false,
    flexShrink: 0,
  },
  dateText: {
    fontSize: 11,
    includeFontPadding: false,
    marginLeft: 'auto',
    flexShrink: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
