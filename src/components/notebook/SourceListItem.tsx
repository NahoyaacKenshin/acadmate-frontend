import React from 'react';
import { View, Pressable, StyleSheet, Alert } from 'react-native';
import { Text } from '@/src/components/ui/text';
import {
  FileText,
  Image as ImageIcon,
  File,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader,
  RotateCw,
  ChevronRight,
} from 'lucide-react-native';

export type SourceStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
export type SourceFileType = 'PDF' | 'IMAGE' | 'TEXT';

export interface Source {
  id: string;
  fileName: string;
  fileType: SourceFileType;
  status: SourceStatus;
  chunkCount?: number;
  createdAt: string;
}

interface SourceListItemProps {
  source: Source;
  onDelete: (source: Source) => void;
  onRetry?: (source: Source) => void;
}

function FileTypeIcon({ type }: { type: SourceFileType }) {
  const props = { size: 18 };
  if (type === 'PDF') return <FileText {...props} color="#EF4444" />;
  if (type === 'IMAGE') return <ImageIcon {...props} color="#8B5CF6" />;
  return <File {...props} color="#64748B" />;
}

function StatusBadge({ status }: { status: SourceStatus }) {
  const config: Record<SourceStatus, { label: string; color: string; bg: string; Icon: any }> = {
    PENDING: { label: 'Queued', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', Icon: Clock },
    PROCESSING: { label: 'Processing…', color: '#6C8EFF', bg: 'rgba(108,142,255,0.12)', Icon: Loader },
    READY: { label: 'Ready', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', Icon: CheckCircle2 },
    FAILED: { label: 'Failed', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', Icon: AlertCircle },
  };
  const { label, color, bg, Icon } = config[status];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Icon size={11} color={color} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function SourceListItem({ source, onDelete, onRetry }: SourceListItemProps) {
  const handleDeletePress = () => {
    Alert.alert(
      'Remove Source',
      `Remove "${source.fileName}" from this notebook? This will also delete its AI index data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onDelete(source) },
      ]
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  return (
    <View style={styles.row}>
      {/* File type icon */}
      <View style={styles.iconWrap}>
        <FileTypeIcon type={source.fileType} />
      </View>

      {/* File info */}
      <View style={styles.info}>
        <Text style={styles.fileName} numberOfLines={1}>{source.fileName}</Text>
        <View style={styles.metaRow}>
          <StatusBadge status={source.status} />
          {source.status === 'READY' && source.chunkCount != null && (
            <Text style={styles.metaText}>{source.chunkCount} chunks indexed</Text>
          )}
          <Text style={styles.dateText}>{formatDate(source.createdAt)}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        {source.status === 'FAILED' && onRetry && (
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.6 }]}
            onPress={() => onRetry(source)}
            hitSlop={8}
          >
            <RotateCw size={14} color="#6C8EFF" />
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
          onPress={handleDeletePress}
          hitSlop={8}
        >
          <Trash2 size={16} color="#64748B" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A26',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3143',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#10131C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  info: {
    flex: 1,
    gap: 6,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 11,
    color: '#4A5568',
  },
  dateText: {
    fontSize: 11,
    color: '#3A4455',
    marginLeft: 'auto',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#10131C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 142, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(108, 142, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
