import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/src/components/ui/text';
import { SourceListItem, Source } from '@/src/components/notebook/SourceListItem';
import { UploadSourceSheet } from '@/src/components/notebook/UploadSourceSheet';
import { NoteEditor } from '@/src/components/notebook/NoteEditor';
import { StudySchedulerModal } from '@/src/components/notebook/StudySchedulerModal';
import { EditSourceModal } from '@/src/components/notebook/EditSourceModal';
import { useNotebookStore } from '@/src/store/notebookStore';
import * as FileSystem from 'expo-file-system/legacy';
import { ENV } from '@/src/config/env';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { EditNotebookSheet } from '@/src/components/notebook/EditNotebookSheet';
import { SourceViewerModal } from '@/src/components/notebook/SourceViewerModal';
import { useSystemStore } from '@/src/store/systemStore';
import { useTheme } from '@/src/theme/useTheme';
import {
  ArrowLeft,
  Upload,
  FileText,
  PenLine,
  RefreshCw,
  MessageSquare,
  Bell,
  WifiOff,
} from 'lucide-react-native';
import {
  ActionMenuButton,
  ActionMenuDropdown,
  useActionMenu,
  ActionMenuItem,
} from '@/src/components/common/ActionMenuDropdown';
import { NotebookBottomNav, NotebookTab } from '@/src/components/notebook/NotebookBottomNav';
import { FloatingAskAiButton } from '@/src/components/notebook/FloatingAskAiButton';
import { ToolsTabContent } from '@/src/components/notebook/ToolsTabContent';
import { useNotebookToolsStore } from '@/src/store/notebookToolsStore';

export default function NotebookDetailScreen() {
  const router = useRouter();
  const { id, title: notebookTitle } = useLocalSearchParams<{ id: string; title: string }>();
  const { colors, isDark } = useTheme();

  const {
    notebooks,
    sourcesByNotebook,
    fetchSources,
    deleteSource,
    retrySource,
    updateSource,
    updateNotebook,
  } = useNotebookStore();
  const currentNotebook = notebooks.find((n) => n.id === id);
  const displayTitle = currentNotebook?.title ?? notebookTitle ?? 'Notebook';
  const sources = id ? (sourcesByNotebook[id] || []) : [];
  const { isOnline } = useSystemStore();

  const [activeTab, setActiveTab] = useState<NotebookTab>('sources');
  const {
    fetchDecks,
    fetchQuizzes,
    decksByNotebook,
    quizzesByNotebook,
  } = useNotebookToolsStore();

  useEffect(() => {
    if (id) {
      fetchDecks(id, true);
      fetchQuizzes(id, true);
    }
  }, [id, fetchDecks, fetchQuizzes]);

  const notebookDecks = id ? (decksByNotebook[id] || []) : [];
  const notebookQuizzes = id ? (quizzesByNotebook[id] || []) : [];
  const toolsCount = notebookDecks.length + notebookQuizzes.length;

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadVisible, setIsUploadVisible] = useState(false);
  const [isNoteEditorVisible, setIsNoteEditorVisible] = useState(false);
  const [isSchedulerVisible, setIsSchedulerVisible] = useState(false);
  const {
    isOpen: isActionMenuOpen,
    isMounted: isActionMenuMounted,
    anim: menuAnim,
    closeMenu: closeActionMenu,
    toggleMenu: toggleActionMenu,
  } = useActionMenu();
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [viewingSource, setViewingSource] = useState<Source | null>(null);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
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
      if (sources.length === 0) {
        setError('Could not load sources. Please check your connection.');
      }
      console.error('[NotebookDetail] fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, fetchSources, sources.length]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  // Handle polling logic separately by checking the sources in the store
  useEffect(() => {
    const hasPending = sources.some((s) => s.status === 'PENDING' || s.status === 'PROCESSING');
    if (hasPending && !isPolling) {
      pollingStartRef.current = Date.now();
    }
    setIsPolling(hasPending);
  }, [sources]);

  // Auto-poll every 5s while any source is still processing, up to POLL_TIMEOUT_MS
  useEffect(() => {
    if (!isPolling) return;
    const timer = setInterval(() => {
      if (pollingStartRef.current && Date.now() - pollingStartRef.current > POLL_TIMEOUT_MS) {
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

  const handleDeleteSource = (source: Source) => {
    if (!id) return;
    Alert.alert(
      'Delete Source',
      `Are you sure you want to delete "${source.fileName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSource(id, source.id);
            } catch (err: any) {
              const msg =
                err?.message && !err.message.includes('http')
                  ? err.message
                  : 'Failed to remove source. Please try again.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  // ─── Retry FAILED source ──────────────────────────────────────────────────

  const handleRetrySource = async (source: Source) => {
    if (!id) return;
    try {
      await retrySource(id, source.id);
      pollingStartRef.current = Date.now();
      setIsPolling(true);
    } catch (err: any) {
      const msg =
        err?.message && !err.message.includes('http')
          ? err.message
          : 'Failed to retry source processing. Please check your network connection.';
      Alert.alert('Retry Failed', msg);
    }
  };

  // ─── Update Notebook ──────────────────────────────────────────────────────

  const handleUpdateNotebook = async (notebookId: string, title: string, description: string) => {
    try {
      await updateNotebook(notebookId, { title, description });
    } catch (err: any) {
      const msg =
        err?.message && !err.message.includes('http')
          ? err.message
          : 'Failed to update notebook. Please try again.';
      Alert.alert('Error', msg);
      throw err;
    }
  };

  // ─── Note Save ────────────────────────────────────────────────────────────

  const handleSaveNote = async (noteTitle: string, content: string) => {
    if (!id) throw new Error('Notebook ID is missing.');
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
    await loadSources(true);
  };

  // ─── Action Menu Items ────────────────────────────────────────────────────
  const sourceMenuItems: ActionMenuItem[] = [
    {
      id: 'upload',
      label: 'Upload File',
      subtitle: 'PDF, DOCX, or image document',
      icon: Upload,
      iconColor: '#6366F1',
      iconBg: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
      onPress: () => setIsUploadVisible(true),
    },
    {
      id: 'note',
      label: 'Write a Note',
      subtitle: 'Plain-text study material',
      icon: PenLine,
      iconColor: '#10B981',
      iconBg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
      onPress: () => setIsNoteEditorVisible(true),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  const hasProcessing = sources.some((s) => s.status === 'PENDING' || s.status === 'PROCESSING');

  const styles = createStyles(colors, isDark);

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
          <Text style={styles.statNumber}>
            {sources.filter((s) => s.status === 'PROCESSING' || s.status === 'PENDING').length}
          </Text>
          <Text style={styles.statLabel}>Processing</Text>
        </View>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <WifiOff size={14} color={isDark ? '#F59E0B' : '#D97706'} />
          <Text style={styles.offlineBannerText}>
            Offline Mode — Viewing saved sources. Tap any ready source to read extracted text.
          </Text>
        </View>
      )}

      {hasProcessing && isOnline && (
        <View style={styles.processingBanner}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={styles.processingText}>
            Indexing in progress — sources will be ready shortly.
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>UPLOADED SOURCES</Text>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <FileText size={36} color={colors.mutedForeground} />
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
        <View style={styles.headerLeft}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#6366F1" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{displayTitle}</Text>
        </View>

        <View style={styles.headerRight}>
          {isPolling && (
            <Pressable style={styles.iconBtn} onPress={handleRefresh}>
              <RefreshCw size={16} color="#6366F1" />
            </Pressable>
          )}
          {/* Schedule study session button */}
          <Pressable
            style={styles.iconBtn}
            onPress={() => setIsSchedulerVisible(true)}
          >
            <Bell size={16} color={isDark ? '#A78BFA' : '#7C3AED'} />
          </Pressable>
          <ActionMenuButton
            isOpen={isActionMenuOpen}
            onPress={toggleActionMenu}
            anim={menuAnim}
            accessibilityLabel="Add study material"
          />
        </View>
      </View>

      {/* Action Menu Dropdown */}
      <ActionMenuDropdown
        isMounted={isActionMenuMounted}
        isOpen={isActionMenuOpen}
        anim={menuAnim}
        onClose={closeActionMenu}
        items={sourceMenuItems}
        top={headerHeight + 56}
        right={16}
      />

      {/* ── Error Banner ── */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadSources()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* ── Content View (Sources vs Tools) ── */}
      {activeTab === 'tools' ? (
        <ToolsTabContent
          notebookId={id ?? ''}
          notebookTitle={displayTitle}
          isOnline={isOnline}
        />
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#6366F1" size="large" />
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
              onPress={(src) => setViewingSource(src)}
              onEdit={(src) => setEditingSource(src)}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          windowSize={7}
          maxToRenderPerBatch={10}
          initialNumToRender={8}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#6366F1"
              colors={['#6366F1']}
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
          notebookTitle={displayTitle}
        />
      )}

      {/* ── Edit Notebook Sheet ── */}
      <EditNotebookSheet
        visible={isEditVisible}
        notebook={
          currentNotebook ??
          (id
            ? {
                id,
                title: displayTitle,
                description: null,
                sourceCount: sources.length,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : null)
        }
        onClose={() => setIsEditVisible(false)}
        onSave={handleUpdateNotebook}
      />

      {/* ── Source Viewer Modal (Offline Reader) ── */}
      <SourceViewerModal
        visible={!!viewingSource}
        source={viewingSource}
        onClose={() => setViewingSource(null)}
      />

      {/* ── Edit Source Modal ── */}
      <EditSourceModal
        visible={!!editingSource}
        source={editingSource}
        onClose={() => setEditingSource(null)}
        onSave={async (sourceId, data) => {
          if (!id) return;
          await updateSource(id, sourceId, data);
        }}
      />

      {/* ── Floating Ask AI Button (Fixed on bottom-right) ── */}
      <FloatingAskAiButton
        onPress={() =>
          router.push(
            `/(app)/notebook-chat?id=${id}&title=${encodeURIComponent(displayTitle)}` as any
          )
        }
      />

      {/* ── Contextual Notebook Bottom Nav (Replaces Main Nav) ── */}
      <NotebookBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sourcesCount={sources.length}
        toolsCount={toolsCount}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // ── Header ──────────────────────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background,
      gap: 12,
      zIndex: 10,
    },
    headerLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minWidth: 0,
      marginRight: 8,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '700',
      color: colors.foreground,
      letterSpacing: -0.4,
      includeFontPadding: false,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    askAiBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    askAiLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#6366F1',
      includeFontPadding: false,
      flexShrink: 0,
    },
    // ── Error ─────────────────────────────────────────────────────────────────
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: 16,
      marginTop: 8,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
      borderRadius: 12,
      padding: 12,
    },
    errorText: {
      fontSize: 13,
      color: '#EF4444',
      flex: 1,
      includeFontPadding: false,
    },
    retryText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#6366F1',
      marginLeft: 12,
      includeFontPadding: false,
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
      color: colors.mutedForeground,
      includeFontPadding: false,
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
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.foreground,
      includeFontPadding: false,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedForeground,
      includeFontPadding: false,
    },
    statDivider: {
      width: 1,
      backgroundColor: colors.border,
      marginHorizontal: 4,
    },
    processingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : '#C7D2FE',
      borderRadius: 12,
      padding: 12,
    },
    processingText: {
      fontSize: 13,
      color: '#6366F1',
      flex: 1,
      lineHeight: 18,
      includeFontPadding: false,
    },
    offlineBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FEF3C7',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A',
      borderRadius: 12,
      padding: 12,
    },
    offlineBannerText: {
      fontSize: 12,
      color: isDark ? '#F59E0B' : '#D97706',
      flex: 1,
      lineHeight: 18,
      includeFontPadding: false,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.mutedForeground,
      letterSpacing: 1.5,
      marginTop: 4,
      includeFontPadding: false,
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
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.foreground,
      includeFontPadding: false,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 20,
      includeFontPadding: false,
    },
  });
