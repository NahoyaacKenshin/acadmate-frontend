import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { NotebookCard, Notebook } from '@/src/components/notebook/NotebookCard';
import { CreateNotebookSheet } from '@/src/components/notebook/CreateNotebookSheet';
import { EditNotebookSheet } from '@/src/components/notebook/EditNotebookSheet';
import { useNotebookStore } from '@/src/store/notebookStore';
import { useSystemStore } from '@/src/store/systemStore';
import { useTheme } from '@/src/theme/useTheme';
import {
  Plus,
  BookOpen,
  WifiOff,
  Search,
  X,
  Pin,
  Layers,
  FileText,
} from 'lucide-react-native';
import {
  ActionMenuButton,
  useActionMenu,
} from '@/src/components/common/ActionMenuDropdown';

type FilterTab = 'all' | 'pinned';

export default function NotebookScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const {
    notebooks,
    pinnedIds,
    isLoadingNotebooks: isLoading,
    notebooksError: error,
    fetchNotebooks,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    togglePinNotebook,
  } = useNotebookStore();
  const { isOnline } = useSystemStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const { anim: menuAnim } = useActionMenu();

  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotebooks(true);
    setIsRefreshing(false);
  };

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    if (!isOnline) {
      Alert.alert('Offline Mode', 'Creating new notebooks requires an active internet connection.');
      return;
    }
    setIsCreateVisible(true);
  };

  const handleCreate = async (title: string, description: string) => {
    try {
      await createNotebook(title, description);
    } catch {
      Alert.alert('Error', 'Failed to create notebook. Please try again.');
    }
  };

  const handleDelete = async (notebook: Notebook) => {
    try {
      await deleteNotebook(notebook.id);
    } catch {
      Alert.alert('Error', 'Failed to delete notebook. Please try again.');
    }
  };

  const handleUpdate = async (id: string, title: string, description: string) => {
    try {
      await updateNotebook(id, { title, description });
    } catch (err: any) {
      const msg =
        err?.message && !err.message.includes('http')
          ? err.message
          : 'Failed to update notebook. Please try again.';
      Alert.alert('Error', msg);
      throw err;
    }
  };

  const handleOpenNotebook = (notebook: Notebook) => {
    router.push({
      pathname: '/(app)/notebook/[id]' as any,
      params: { id: notebook.id, title: notebook.title },
    });
  };

  // ─── Derived Data ───────────────────────────────────────────────────────────

  const totalSourcesCount = useMemo(() => {
    return notebooks.reduce((acc, nb) => acc + (nb.sourceCount || 0), 0);
  }, [notebooks]);

  const pinnedNotebooks = useMemo(() => {
    return notebooks.filter((nb) => pinnedIds.includes(nb.id));
  }, [notebooks, pinnedIds]);

  const filteredNotebooks = useMemo(() => {
    let list = notebooks;

    if (activeTab === 'pinned') {
      list = pinnedNotebooks;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (nb) =>
          nb.title.toLowerCase().includes(q) ||
          (nb.description && nb.description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [notebooks, pinnedNotebooks, activeTab, searchQuery]);

  // When tab is 'all' and no active search, partition into pinned and others
  const { pinnedSection, unpinnedSection } = useMemo(() => {
    if (activeTab !== 'all' || searchQuery.trim().length > 0) {
      return { pinnedSection: [], unpinnedSection: filteredNotebooks };
    }
    const pinned = filteredNotebooks.filter((nb) => pinnedIds.includes(nb.id));
    const unpinned = filteredNotebooks.filter((nb) => !pinnedIds.includes(nb.id));
    return { pinnedSection: pinned, unpinnedSection: unpinned };
  }, [filteredNotebooks, pinnedIds, activeTab, searchQuery]);

  // ─── Render Components ──────────────────────────────────────────────────────

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Offline Banner */}
      {!isOnline && (
        <View
          style={[
            styles.offlineBanner,
            {
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB',
              borderColor: isDark ? 'rgba(245, 158, 11, 0.22)' : '#FDE68A',
            },
          ]}
        >
          <WifiOff size={13} color="#F59E0B" />
          <Text style={styles.offlineBannerText}>
            Offline Mode — Viewing saved notebooks.
          </Text>
        </View>
      )}

      {/* Summary Stats Row */}
      {notebooks.length > 0 && (
        <View
          style={[
            styles.statsRow,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.statChip}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>
              {notebooks.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Notebooks
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <Pressable
            style={styles.statChip}
            onPress={() => setActiveTab(activeTab === 'pinned' ? 'all' : 'pinned')}
          >
            <Text
              style={[
                styles.statNum,
                { color: pinnedNotebooks.length > 0 ? '#F59E0B' : colors.foreground },
              ]}
            >
              {pinnedNotebooks.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Pinned
            </Text>
          </Pressable>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statChip}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>
              {totalSourcesCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Sources
            </Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      {notebooks.length > 0 && (
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Search size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search notebooks…"
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={8}
              accessibilityLabel="Clear search"
            >
              <X size={15} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      )}

      {/* Filter Tabs */}
      {notebooks.length > 0 && pinnedNotebooks.length > 0 && (
        <View style={styles.filterTabsRow}>
          <Pressable
            style={[
              styles.filterTab,
              activeTab === 'all'
                ? {
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.1)',
                    borderColor: '#6366F1',
                  }
                : {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
            ]}
            onPress={() => setActiveTab('all')}
          >
            <Layers
              size={12}
              color={activeTab === 'all' ? '#6366F1' : colors.mutedForeground}
            />
            <Text
              style={[
                styles.filterTabText,
                { color: activeTab === 'all' ? '#6366F1' : colors.mutedForeground },
              ]}
            >
              All ({notebooks.length})
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterTab,
              activeTab === 'pinned'
                ? {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.1)',
                    borderColor: '#F59E0B',
                  }
                : {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
            ]}
            onPress={() => setActiveTab('pinned')}
          >
            <Pin
              size={12}
              color={activeTab === 'pinned' ? '#F59E0B' : colors.mutedForeground}
              fill={activeTab === 'pinned' ? '#F59E0B' : 'transparent'}
            />
            <Text
              style={[
                styles.filterTabText,
                { color: activeTab === 'pinned' ? '#F59E0B' : colors.mutedForeground },
              ]}
            >
              Pinned ({pinnedNotebooks.length})
            </Text>
          </Pressable>
        </View>
      )}

      {/* Section Header if partitioned */}
      {pinnedSection.length > 0 && (
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            Pinned Notebooks
          </Text>
          <Text style={styles.sectionCountAmber}>
            {pinnedSection.length}
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => {
    const isSearching = searchQuery.trim().length > 0;
    return (
      <View
        style={[
          styles.emptyCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.emptyIconWrap,
            {
              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)',
              borderColor: isDark ? 'rgba(99, 102, 241, 0.24)' : 'rgba(99, 102, 241, 0.16)',
            },
          ]}
        >
          <BookOpen size={24} color="#6366F1" />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          {isSearching ? 'No matching notebooks' : 'No notebooks yet'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
          {isSearching
            ? 'Try searching with a different keyword or clear your filter.'
            : 'Create your first notebook to organize lecture slides, reading materials, and generate AI notes.'}
        </Text>

        {!isSearching && (
          <Pressable
            style={({ pressed }) => [
              styles.emptyCtaBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
            onPress={handleOpenCreate}
          >
            <Plus size={16} color={colors.primaryForeground} />
            <Text style={[styles.emptyCtaText, { color: colors.primaryForeground }]}>
              Create Notebook
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* ── Screen Header ── */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Notebooks
        </Text>
        <ActionMenuButton
          isOpen={isCreateVisible}
          onPress={handleOpenCreate}
          anim={menuAnim}
          accessibilityLabel="Create notebook"
        />
      </View>

      {/* ── API Error Banner ── */}
      {error && (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
            },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          <Pressable onPress={() => fetchNotebooks()} hitSlop={8}>
            <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* ── Notebooks Content ── */}
      {isLoading && notebooks.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#6366F1" size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading notebooks…
          </Text>
        </View>
      ) : (
        <FlatList
          data={pinnedSection.length > 0 ? pinnedSection : filteredNotebooks}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          renderItem={({ item }) => (
            <NotebookCard
              notebook={item}
              isPinned={pinnedIds.includes(item.id)}
              onPress={handleOpenNotebook}
              onDelete={handleDelete}
              onEdit={(nb) => setEditingNotebook(nb)}
              onTogglePin={(nb) => togglePinNotebook(nb.id)}
            />
          )}
          ListFooterComponent={
            pinnedSection.length > 0 && unpinnedSection.length > 0 ? (
              <View style={styles.unpinnedSectionWrap}>
                <View style={styles.sectionRow}>
                  <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                    All Notebooks
                  </Text>
                  <Text style={styles.sectionCountIndigo}>
                    {unpinnedSection.length}
                  </Text>
                </View>
                {unpinnedSection.map((item) => (
                  <NotebookCard
                    key={item.id}
                    notebook={item}
                    isPinned={false}
                    onPress={handleOpenNotebook}
                    onDelete={handleDelete}
                    onEdit={(nb) => setEditingNotebook(nb)}
                    onTogglePin={(nb) => togglePinNotebook(nb.id)}
                  />
                ))}
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
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

      {/* ── Create Sheet ── */}
      <CreateNotebookSheet
        visible={isCreateVisible}
        onClose={() => setIsCreateVisible(false)}
        onSave={handleCreate}
      />

      {/* ── Edit Sheet ── */}
      <EditNotebookSheet
        visible={!!editingNotebook}
        notebook={editingNotebook}
        onClose={() => setEditingNotebook(null)}
        onSave={handleUpdate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.6,
    includeFontPadding: false,
  },
  listContent: {
    paddingBottom: 130,
  },
  listHeader: {
    paddingTop: 6,
    paddingBottom: 2,
  },
  // ── Stats Summary Row ──
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  statChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    includeFontPadding: false,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  // ── Search & Filter ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  filterTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
    flexShrink: 0,
  },
  // ── Offline Banner ──
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  offlineBannerText: {
    fontSize: 12,
    color: '#F59E0B',
    flex: 1,
    lineHeight: 17,
    fontWeight: '500',
    includeFontPadding: false,
  },
  // ── Error Banner ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
    includeFontPadding: false,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 12,
    includeFontPadding: false,
  },
  // ── Loading ──
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 80,
  },
  loadingText: {
    fontSize: 13.5,
    fontWeight: '500',
    includeFontPadding: false,
  },
  // ── Section Rows ──
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    includeFontPadding: false,
  },
  sectionCountAmber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    includeFontPadding: false,
    flexShrink: 0,
  },
  sectionCountIndigo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    includeFontPadding: false,
    flexShrink: 0,
  },
  unpinnedSectionWrap: {
    marginTop: 4,
  },
  // ── Empty State Card ──
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    includeFontPadding: false,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
    includeFontPadding: false,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyCtaText: {
    fontSize: 13.5,
    fontWeight: '600',
    includeFontPadding: false,
  },
});
