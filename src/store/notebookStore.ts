import { create } from 'zustand';
import { ApiService } from '@/src/services/api';
import { Notebook } from '@/src/components/notebook/NotebookCard';
import { Source } from '@/src/components/notebook/SourceListItem';

interface NotebookState {
  notebooks: Notebook[];
  sourcesByNotebook: Record<string, Source[]>;
  isLoadingNotebooks: boolean;
  notebooksError: string | null;

  fetchNotebooks: (silent?: boolean) => Promise<void>;
  createNotebook: (title: string, description?: string) => Promise<Notebook>;
  deleteNotebook: (id: string) => Promise<void>;

  fetchSources: (notebookId: string, silent?: boolean) => Promise<void>;
  deleteSource: (notebookId: string, sourceId: string) => Promise<void>;
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
  notebooks: [],
  sourcesByNotebook: {},
  isLoadingNotebooks: false,
  notebooksError: null,

  fetchNotebooks: async (silent = false) => {
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
      
      set({ notebooks: mapped, isLoadingNotebooks: false });
    } catch (err: any) {
      set({ notebooksError: 'Could not load notebooks. Please check your connection.', isLoadingNotebooks: false });
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
    
    set((state) => ({ notebooks: [mapped, ...state.notebooks] }));
    return mapped;
  },

  deleteNotebook: async (id) => {
    await ApiService.notebooks.delete(id);
    set((state) => ({ notebooks: state.notebooks.filter((n) => n.id !== id) }));
  },

  fetchSources: async (notebookId, silent = false) => {
    try {
      const data = await ApiService.notebooks.get(notebookId);
      const notebookObj = data?.data ?? data?.notebook ?? data;
      const list: any[] = Array.isArray(notebookObj?.sources) ? notebookObj.sources : [];
      const mapped: Source[] = list.map((s: any) => ({
        id: s.id,
        fileName: s.fileName,
        fileType: s.fileType ?? 'TEXT',
        status: s.status ?? 'PENDING',
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
    } catch (err: any) {
      console.error('[NotebookStore] fetchSources error:', err);
      throw err;
    }
  },

  deleteSource: async (notebookId, sourceId) => {
    await ApiService.sources.delete(notebookId, sourceId);
    set((state) => {
      const currentSources = state.sourcesByNotebook[notebookId] || [];
      return {
        sourcesByNotebook: {
          ...state.sourcesByNotebook,
          [notebookId]: currentSources.filter(s => s.id !== sourceId),
        }
      };
    });
  },
}));
