import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/src/components/ui/text';
import { SourceListItem, Source } from '@/src/components/notebook/SourceListItem';
import { UploadSourceSheet } from '@/src/components/notebook/UploadSourceSheet';
import { NoteEditor } from '@/src/components/notebook/NoteEditor';
import { StudySchedulerModal } from '@/src/components/notebook/StudySchedulerModal';
import { useNotebookStore } from '@/src/store/notebookStore';
import * as FileSystem from 'expo-file-system/legacy';
import { ENV } from '@/src/config/env';
import { useAuthStore } from '@/src/features/auth/auth.store';
import {
  ArrowLeft,
  Plus,
  Upload,
  FileText,
  PenLine,
  BookOpen,
  RefreshCw,
  MessageSquare,
  Bell,
} from 'lucide-react-native';

export default function NotebookDetailScreen() {
  const router = useRouter();
  const { id, title: notebookTitle } = useLocalSearchParams<{ id: string; title: string }>();

  const { sourcesByNotebook, fetchSources, deleteSource } = useNotebookStore();
  const sources = id ? (sourcesByNotebook[id] || []) : [];

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadVisible, setIsUploadVisible] = useState(false);
  const [isNoteEditorVisible, setIsNoteEditorVisible] = useState(false);
  const [isSchedulerVisible, setIsSchedulerVisible] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(68);
  const pollingStartRef = useRef<number | null>(null);
  const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max polling

  // ─── Fetch sources ────────────────────────────────────────────────────────

  const loadSources = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      await fetchSources(id, silent);
    } catch (err: any) {
      setError('Could not load sources. Please check your connection.');
      console.error('[NotebookDetail] fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, fetchSources]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  // Handle polling logic separately by checking the sources in the store
  useEffect(() => {
    const hasPending = sources.some((s) => s.status === 'PENDING' || s.status === 'PROCESSING');
    if (hasPending && !isPolling) {
      // Start poll and record start time
      pollingStartRef.current = Date.now();
    }
    setIsPolling(hasPending);
  }, [sources]);

  // Auto-poll every 5s while any source is still processing, up to POLL_TIMEOUT_MS
  useEffect(() => {
    if (!isPolling) return;
    const timer = setInterval(() => {
      if (pollingStartRef.current && Date.now() - pollingStartRef.current > POLL_TIMEOUT_MS) {
        // Timeout — stop polling to avoid infinite battery drain
        setIsPolling(false);
        console.warn('[NotebookDetail] Polling timed out after 5 minutes.');
        return;
      }
      loadSources(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPolling, loadSources]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSources(true);
    setIsRefreshing(false);
  };

  // ─── Delete Source ────────────────────────────────────────────────────────

  const handleDeleteSource = async (source: Source) => {
    if (!id) return;
    try {
      await deleteSource(id, source.id);
    } catch {
      Alert.alert('Error', 'Failed to remove source. Please try again.');
    }
  };

  // ─── Retry FAILED source ──────────────────────────────────────────────────

  const handleRetrySource = async (source: Source) => {
    if (!id) return;
    try {
      // Re-upload by triggering a fetch refresh; the backend re-queues FAILED sources
      // on the next fetchSources call. We optimistically reload.
      await loadSources(true);
    } catch {
      Alert.alert('Error', 'Failed to retry source processing. Please try again.');
    }
  };

  // ─── Note Save ────────────────────────────────────────────────────────────

  const handleSaveNote = async (noteTitle: string, content: string) => {
    if (!id) throw new Error('Notebook ID is missing.');
    // Write note content to a temp .txt file then upload it as a source
    const tmpPath = `${FileSystem.cacheDirectory}note_${Date.now()}.txt`;
    await FileSystem.writeAsStringAsync(tmpPath, `${noteTitle}\n\n${content}`, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const accessToken = useAuthStore.getState().accessToken;
    const response = await FileSystem.uploadAsync(
      `${ENV.API_URL}/notebooks/${id}/sources`,
      tmpPath,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        parameters: { fileName: `${noteTitle}.txt` },
      }
    );

    if (response.status >= 400) {
      throw new Error('Failed to save note as a source.');
    }
    // Refresh source list
    await loadSources(true);
  };

  // ─── Action Menu ──────────────────────────────────────────────────────────

  const ActionMenu = () => (
    <View style={styles.actionMenuContent}>
      <Pressable
        style={styles.actionMenuItem}
        onPress={() => {
          setIsActionMenuOpen(false);
          setIsUploadVisible(true);
        }}
      >
        <View style={[styles.actionMenuIcon, { backgroundColor: 'rgba(108,142,255,0.15)' }]}>
          <Upload size={18} color="#6C8EFF" />
        </View>
        <View>
          <Text style={styles.actionMenuLabel}>Upload File</Text>
          <Text style={styles.actionMenuSub}>PDF, DOCX, Image</Text>
        </View>
      </Pressable>

      <View style={styles.actionMenuDivider} />

      <Pressable
        style={styles.actionMenuItem}
        onPress={() => {
          setIsActionMenuOpen(false);
          setIsNoteEditorVisible(true);
        }}
      >
        <View style={[styles.actionMenuIcon, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
          <PenLine size={18} color="#22C55E" />
        </View>
        <View>
          <Text style={styles.actionMenuLabel}>Write a Note</Text>
          <Text style={styles.actionMenuSub}>Plain-text note</Text>
        </View>
      </Pressable>
    </View>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  const hasProcessing = sources.some((s) => s.status === 'PENDING' || s.status === 'PROCESSING');

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{sources.length}</Text>
          <Text style={styles.statLabel}>Sources</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{sources.filter((s) => s.status === 'READY').length}</Text>
          <Text style={styles.statLabel}>Ready</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{sources.filter((s) => s.status === 'PROCESSING' || s.status === 'PENDING').length}</Text>
          <Text style={styles.statLabel}>Processing</Text>
        </View>
      </View>

      {hasProcessing && (
        <View style={styles.processingBanner}>
          <ActivityIndicator size="small" color="#6C8EFF" />
          <Text style={styles.processingText}>
            Indexing in progress — sources will be ready shortly.
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Uploaded Sources</Text>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <FileText size={36} color="#2A3143" />
      </View>
      <Text style={styles.emptyTitle}>No sources yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the + button to upload a PDF, image, or write a note. The AI will index it automatically.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View
        style={styles.header}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <Pressable style={styles.backBtn} onPress={() => router.replace('/(app)/notebook' as any)}>
          <ArrowLeft size={20} color="#6C8EFF" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{notebookTitle ?? 'Notebook'}</Text>
        </View>
        <View style={styles.headerRight}>
          {isPolling && (
            <Pressable style={styles.refreshBtn} onPress={handleRefresh}>
              <RefreshCw size={16} color="#6C8EFF" />
            </Pressable>
          )}
          {/* Schedule study session button */}
          <Pressable
            style={styles.refreshBtn}
            onPress={() => setIsSchedulerVisible(true)}
          >
            <Bell size={16} color="#A78BFA" />
          </Pressable>
          {/* Ask AI button */}
          <Pressable
            style={({ pressed }) => [styles.askAiBtn, pressed && { opacity: 0.75 }]}
            onPress={() =>
              router.push(
                `/(app)/notebook-chat?id=${id}&title=${encodeURIComponent(notebookTitle ?? 'Notebook')}` as any
              )
            }
          >
            <MessageSquare size={16} color="#6C8EFF" />
            <Text style={styles.askAiLabel}>Ask AI</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.75 }]}
            onPress={() => setIsActionMenuOpen((v) => !v)}
          >
            <Plus size={22} color="#6C8EFF" />
          </Pressable>
        </View>
      </View>

      {/* ── Action Menu Overlay ── */}
      {isActionMenuOpen && (
        <>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsActionMenuOpen(false)}
          />
          <View style={[styles.actionMenu, { top: headerHeight + 4 }]}>
            <ActionMenu />
          </View>
        </>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadSources()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* ── Source List ── */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#6C8EFF" size="large" />
          <Text style={styles.loadingText}>Loading sources…</Text>
        </View>
      ) : (
        <FlatList
          data={sources}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <SourceListItem
              source={item}
              onDelete={handleDeleteSource}
              onRetry={handleRetrySource}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#6C8EFF"
              colors={['#6C8EFF']}
            />
          }
        />
      )}

      {/* ── Upload Sheet ── */}
      {id && (
        <UploadSourceSheet
          visible={isUploadVisible}
          notebookId={id}
          onClose={() => setIsUploadVisible(false)}
          onUploaded={() => loadSources(true)}
        />
      )}

      {/* ── Note Editor ── */}
      <NoteEditor
        visible={isNoteEditorVisible}
        notebookId={id ?? ''}
        onClose={() => setIsNoteEditorVisible(false)}
        onSave={handleSaveNote}
      />

      {/* Study Scheduler Modal */}
      {id && (
        <StudySchedulerModal
          visible={isSchedulerVisible}
          onClose={() => setIsSchedulerVisible(false)}
          notebookId={id}
          notebookTitle={notebookTitle ?? 'Notebook'}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10131C',
  },
  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1F2E',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(108,142,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#161A26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(108,142,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.3)',
  },
  askAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(108,142,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  askAiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C8EFF',
  },
  // ── Action Menu ───────────────────────────────────────────────────────────
  actionMenu: {
    // Positioning only — top is set dynamically via headerHeight
    position: 'absolute',
    right: 16,
    zIndex: 999,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  actionMenuContent: {
    backgroundColor: '#161A26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A3143',
    overflow: 'hidden',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  actionMenuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMenuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionMenuSub: {
    fontSize: 12,
    color: '#4A5568',
    marginTop: 2,
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: '#1A1F2E',
    marginHorizontal: 14,
  },
  // ── Error ─────────────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C8EFF',
    marginLeft: 12,
  },
  // ── Loading ───────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#4A5568',
  },
  // ── List ──────────────────────────────────────────────────────────────────
  listContent: {
    paddingBottom: 40,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#161A26',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A5568',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#2A3143',
    marginHorizontal: 4,
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(108,142,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.2)',
    borderRadius: 10,
    padding: 12,
  },
  processingText: {
    fontSize: 13,
    color: '#6C8EFF',
    flex: 1,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
  },
  // ── Empty State ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
    marginTop: 20,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#161A26',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A3143',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 20,
  },
});
