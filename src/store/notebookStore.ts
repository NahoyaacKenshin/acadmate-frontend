import { create } from 'zustand';
import { ApiService } from '@/src/services/api';
import { Notebook } from '@/src/components/notebook/NotebookCard';
import { Source } from '@/src/components/notebook/SourceListItem';
import { NotebookStorage } from '@/src/services/notebookStorage';
import { useSystemStore } from '@/src/store/systemStore';

interface NotebookState {
  notebooks: Notebook[];
  pinnedIds: string[];
  sourcesByNotebook: Record<string, Source[]>;
  isLoadingNotebooks: boolean;
  notebooksError: string | null;

  loadPinnedIds: () => Promise<void>;
  togglePinNotebook: (id: string) => Promise<void>;
  fetchNotebooks: (silent?: boolean) => Promise<void>;
  createNotebook: (title: string, description?: string) => Promise<Notebook>;
  updateNotebook: (id: string, data: { title?: string; description?: string | null }) => Promise<Notebook>;
  deleteNotebook: (id: string) => Promise<void>;

  fetchSources: (notebookId: string, silent?: boolean) => Promise<void>;
  deleteSource: (notebookId: string, sourceId: string) => Promise<void>;
  retrySource: (notebookId: string, sourceId: string) => Promise<void>;
  updateSource: (notebookId: string, sourceId: string, data: { fileName?: string; rawText?: string }) => Promise<void>;
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
  notebooks: [],
  pinnedIds: [],
  sourcesByNotebook: {},
  isLoadingNotebooks: false,
  notebooksError: null,

  loadPinnedIds: async () => {
    const cached = await NotebookStorage.loadPinnedIds();
    if (cached) {
      set({ pinnedIds: cached });
    }
  },

  togglePinNotebook: async (id: string) => {
    const current = get().pinnedIds;
    const isPinned = current.includes(id);
    const updated = isPinned ? current.filter((x) => x !== id) : [...current, id];
    set({ pinnedIds: updated });
    await NotebookStorage.savePinnedIds(updated);
  },

  fetchNotebooks: async (silent = false) => {
    // 1. Stale-while-revalidate: Hydrate from disk cache immediately if memory is empty
    if (get().notebooks.length === 0) {
      const cached = await NotebookStorage.loadNotebooks();
      if (cached && cached.length > 0) {
        set({ notebooks: cached });
      }
    }
    // Hydrate pinned IDs if not yet loaded
    if (get().pinnedIds.length === 0) {
      const cachedPinned = await NotebookStorage.loadPinnedIds();
      if (cachedPinned && cachedPinned.length > 0) {
        set({ pinnedIds: cachedPinned });
      }
    }

    // If device is offline, rely on cached notebooks without erroring
    const { isOnline } = useSystemStore.getState();
    if (!isOnline && get().notebooks.length > 0) {
      set({ isLoadingNotebooks: false, notebooksError: null });
      return;
    }

    if (!silent) set({ isLoadingNotebooks: true, notebooksError: null });
    try {
      const data = await ApiService.notebooks.list();
      const list: any[] = Array.isArray(data) ? data : (data?.data ?? data?.notebooks ?? []);
      const mapped: Notebook[] = list.map((n: any) => ({
        id: n.id,
        title: n.title,
        description: n.description ?? null,
        sourceCount: n._count?.sources ?? n.sourceCount ?? 0,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      }));

      // Sort notebooks by createdAt descending (newest first)
      mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      set({ notebooks: mapped, isLoadingNotebooks: false, notebooksError: null });
      // Persist to local disk
      NotebookStorage.saveNotebooks(mapped);
    } catch (err: any) {
      // If we have cached notebooks, keep them and do not break the screen
      if (get().notebooks.length > 0) {
        set({ isLoadingNotebooks: false, notebooksError: null });
      } else {
        set({
          notebooksError: 'Could not load notebooks. Please check your connection.',
          isLoadingNotebooks: false,
        });
      }
      console.error('[NotebookStore] fetch error:', err);
    }
  },

  createNotebook: async (title, description) => {
    const newNotebook = await ApiService.notebooks.create({ title, description: description || undefined });
    const nb = newNotebook?.data ?? newNotebook?.notebook ?? newNotebook;
    const mapped: Notebook = {
      id: nb.id ?? '',
      title: nb.title ?? title,
      description: (nb.description ?? description) || null,
      sourceCount: 0,
      createdAt: nb.createdAt ?? new Date().toISOString(),
      updatedAt: nb.updatedAt ?? new Date().toISOString(),
    };

    const nextNotebooks = [mapped, ...get().notebooks];
    set({ notebooks: nextNotebooks });
    NotebookStorage.saveNotebooks(nextNotebooks);
    return mapped;
  },

  updateNotebook: async (id, data) => {
    let mappedNotebook: Notebook | null = null;
    const updatedList = get().notebooks.map((n) => {
      if (n.id === id) {
        const m: Notebook = {
          ...n,
          title: data.title ?? n.title,
          description: data.description !== undefined ? data.description : n.description,
          updatedAt: new Date().toISOString(),
        };
        mappedNotebook = m;
        return m;
      }
      return n;
    });
    set({ notebooks: updatedList });
    NotebookStorage.saveNotebooks(updatedList);

    const { isOnline } = useSystemStore.getState();
    if (isOnline) {
      try {
        const res = await ApiService.notebooks.update(id, data);
        const updated = res?.data ?? res?.notebook ?? res;
        if (updated) {
          const refinedList = get().notebooks.map((n) => {
            if (n.id === id) {
              const m: Notebook = {
                ...n,
                title: updated.title ?? n.title,
                description: updated.description !== undefined ? updated.description : n.description,
                updatedAt: updated.updatedAt ?? n.updatedAt,
              };
              mappedNotebook = m;
              return m;
            }
            return n;
          });
          set({ notebooks: refinedList });
          NotebookStorage.saveNotebooks(refinedList);
        }
      } catch (err) {
        console.warn('[notebookStore] updateNotebook API sync failed:', err);
      }
    }

    return mappedNotebook ?? get().notebooks.find((n) => n.id === id)!;
  },

  deleteNotebook: async (id) => {
    const filtered = get().notebooks.filter((n) => n.id !== id);
    const updatedPinned = get().pinnedIds.filter((x) => x !== id);
    set({ notebooks: filtered, pinnedIds: updatedPinned });
    NotebookStorage.saveNotebooks(filtered);
    NotebookStorage.savePinnedIds(updatedPinned);

    const { isOnline } = useSystemStore.getState();
    if (isOnline) {
      try {
        await ApiService.notebooks.delete(id);
      } catch (err) {
        console.warn('[notebookStore] deleteNotebook API sync failed:', err);
      }
    }
  },

  fetchSources: async (notebookId, silent = false) => {
    // 1. Stale-while-revalidate: Load cached sources from disk first
    const existing = get().sourcesByNotebook[notebookId];
    if (!existing || existing.length === 0) {
      const cached = await NotebookStorage.loadSources(notebookId);
      if (cached && cached.length > 0) {
        set((state) => ({
          sourcesByNotebook: {
            ...state.sourcesByNotebook,
            [notebookId]: cached,
          },
        }));
      }
    }

    // If offline and we have cached sources, do not fail
    const { isOnline } = useSystemStore.getState();
    if (!isOnline && (get().sourcesByNotebook[notebookId]?.length ?? 0) > 0) {
      return;
    }

    try {
      const data = await ApiService.notebooks.get(notebookId);
      const notebookObj = data?.data ?? data?.notebook ?? data;
      const list: any[] = Array.isArray(notebookObj?.sources) ? notebookObj.sources : [];
      const mapped: Source[] = list.map((s: any) => ({
        id: s.id,
        fileName: s.fileName,
        fileType: s.fileType ?? 'TEXT',
        status: s.status ?? 'PENDING',
        rawText: s.rawText ?? null,
        chunkCount: s._count?.chunks ?? s.chunkCount ?? undefined,
        createdAt: s.createdAt,
      }));

      // Sort sources by createdAt descending
      mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      set((state) => ({
        sourcesByNotebook: {
          ...state.sourcesByNotebook,
          [notebookId]: mapped,
        },
      }));

      // Persist to local disk cache
      NotebookStorage.saveSources(notebookId, mapped);
    } catch (err: any) {
      console.error('[NotebookStore] fetchSources error:', err);
      // If we have cached sources for this notebook, do not crash the view
      if ((get().sourcesByNotebook[notebookId]?.length ?? 0) === 0) {
        throw err;
      }
    }
  },

  deleteSource: async (notebookId, sourceId) => {
    const currentSources = get().sourcesByNotebook[notebookId] || [];
    const filtered = currentSources.filter((s) => s.id !== sourceId);
    set((state) => ({
      sourcesByNotebook: {
        ...state.sourcesByNotebook,
        [notebookId]: filtered,
      },
      notebooks: state.notebooks.map((nb) =>
        nb.id === notebookId ? { ...nb, sourceCount: Math.max(0, (nb.sourceCount || 1) - 1) } : nb
      ),
    }));
    NotebookStorage.saveSources(notebookId, filtered);

    const { isOnline } = useSystemStore.getState();
    if (isOnline) {
      try {
        await ApiService.sources.delete(notebookId, sourceId);
      } catch (err) {
        console.warn('[notebookStore] deleteSource API sync failed:', err);
      }
    }
  },

  retrySource: async (notebookId, sourceId) => {
    await ApiService.sources.retry(notebookId, sourceId);
    set((state) => {
      const currentSources = state.sourcesByNotebook[notebookId] || [];
      const updated = currentSources.map((s) =>
        s.id === sourceId ? { ...s, status: 'PROCESSING' as const } : s
      );
      NotebookStorage.saveSources(notebookId, updated);
      return {
        sourcesByNotebook: {
          ...state.sourcesByNotebook,
          [notebookId]: updated,
        },
      };
    });
  },

  updateSource: async (notebookId, sourceId, data) => {
    set((state) => {
      const currentSources = state.sourcesByNotebook[notebookId] || [];
      const updated = currentSources.map((s) => {
        if (s.id === sourceId) {
          return {
            ...s,
            fileName: data.fileName?.trim() || s.fileName,
            rawText: data.rawText !== undefined ? data.rawText : s.rawText,
          };
        }
        return s;
      });
      NotebookStorage.saveSources(notebookId, updated);
      return {
        sourcesByNotebook: {
          ...state.sourcesByNotebook,
          [notebookId]: updated,
        },
      };
    });

    const { isOnline } = useSystemStore.getState();
    if (isOnline) {
      try {
        const res = await ApiService.sources.update(notebookId, sourceId, data);
        const updatedSource = res?.data ?? res?.source ?? res;
        if (updatedSource) {
          set((state) => {
            const currentSources = state.sourcesByNotebook[notebookId] || [];
            const updated = currentSources.map((s) => {
              if (s.id === sourceId) {
                return {
                  ...s,
                  fileName: updatedSource.fileName ?? s.fileName,
                  rawText: updatedSource.rawText ?? s.rawText,
                  chunkCount: updatedSource.chunkCount ?? s.chunkCount,
                };
              }
              return s;
            });
            NotebookStorage.saveSources(notebookId, updated);
            return {
              sourcesByNotebook: {
                ...state.sourcesByNotebook,
                [notebookId]: updated,
              },
            };
          });
        }
      } catch (err) {
        console.warn('[notebookStore] updateSource API sync failed:', err);
      }
    }
  },
}));

