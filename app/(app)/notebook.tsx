import React, { useState, useCallback, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { Text } from '@/src/components/ui/text';
import { NotebookCard, Notebook } from '@/src/components/notebook/NotebookCard';
import { CreateNotebookSheet } from '@/src/components/notebook/CreateNotebookSheet';
import { useNotebookStore } from '@/src/store/notebookStore';
import { Plus, BookOpen, Sparkles } from 'lucide-react-native';

export default function NotebookScreen() {
  const router = useRouter();

  const {
    notebooks,
    isLoadingNotebooks: isLoading,
    notebooksError: error,
    fetchNotebooks,
    createNotebook,
    deleteNotebook,
  } = useNotebookStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateVisible, setIsCreateVisible] = useState(false);

  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotebooks(true);
    setIsRefreshing(false);
  };

  // ─── Create ───────────────────────────────────────────────────────────────

  const handleCreate = async (title: string, description: string) => {
    try {
      await createNotebook(title, description);
    } catch (err) {
      Alert.alert('Error', 'Failed to create notebook. Please try again.');
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (notebook: Notebook) => {
    try {
      await deleteNotebook(notebook.id);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to delete notebook. Please try again.');
    }
  };

  // ─── Navigation ───────────────────────────────────────────────────────────

  const handleOpenNotebook = (notebook: Notebook) => {
    router.push({ pathname: '/(app)/notebook/[id]' as any, params: { id: notebook.id, title: notebook.title } });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* Hero section */}
      <View style={styles.hero}>
        <View style={styles.heroIconWrap}>
          <BookOpen size={22} color="#6C8EFF" />
        </View>
        <Text style={styles.heroTitle}>Course Notebooks</Text>
        <Text style={styles.heroSubtitle}>
          Upload lecture slides, notes, and study resources for grounded AI review.
        </Text>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>My Notebooks</Text>
        <Text style={styles.sectionCount}>{notebooks.length}</Text>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <BookOpen size={40} color="#2A3143" />
      </View>
      <Text style={styles.emptyTitle}>No notebooks yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the + button to create your first notebook and start uploading study materials.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notebook</Text>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.75 }]}
          onPress={() => setIsCreateVisible(true)}
        >
          <Plus size={22} color="#6C8EFF" />
        </Pressable>
      </View>

      {/* ── Error Banner ── */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => fetchNotebooks()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* ── List ── */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#6C8EFF" size="large" />
          <Text style={styles.loadingText}>Loading notebooks…</Text>
        </View>
      ) : (
        <FlatList
          data={notebooks}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <NotebookCard
              notebook={item}
              onPress={handleOpenNotebook}
              onDelete={handleDelete}
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

      {/* ── Create Sheet ── */}
      <CreateNotebookSheet
        visible={isCreateVisible}
        onClose={() => setIsCreateVisible(false)}
        onSave={handleCreate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10131C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    color: '#ffffff',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(108,142,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.3)',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
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
  listContent: {
    paddingBottom: 40,
  },
  listHeader: {
    paddingBottom: 8,
  },
  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 6,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(108,142,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.25)',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C8EFF',
    backgroundColor: 'rgba(108,142,255,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  // ── Empty State ───────────────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
    marginTop: 20,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#161A26',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A3143',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
