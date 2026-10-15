import * as FileSystem from 'expo-file-system/legacy';
import { Notebook } from '@/src/components/notebook/NotebookCard';
import { Source } from '@/src/components/notebook/SourceListItem';
import { ChatMessage } from '@/src/components/notebook/chat/ChatMessageBubble';

const CACHE_DIR = `${FileSystem.documentDirectory}notebook_cache/`;

/** Ensure the cache directory exists */
async function ensureDir(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  } catch (err) {
    console.warn('[NotebookStorage] Failed to ensure cache directory:', err);
  }
}

/** Helper to write JSON safely */
async function writeJson(filename: string, data: any): Promise<void> {
  try {
    await ensureDir();
    const path = `${CACHE_DIR}${filename}`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(data), {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (err) {
    console.warn(`[NotebookStorage] Failed to write ${filename}:`, err);
  }
}

/** Helper to read JSON safely */
async function readJson<T>(filename: string): Promise<T | null> {
  try {
    const path = `${CACHE_DIR}${filename}`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return JSON.parse(content) as T;
  } catch (err) {
    console.warn(`[NotebookStorage] Failed to read ${filename}:`, err);
    return null;
  }
}

export const NotebookStorage = {
  // ─── Notebooks List ──────────────────────────────────────────────────────────
  saveNotebooks: async (notebooks: Notebook[]): Promise<void> => {
    await writeJson('notebooks.json', notebooks);
  },

  loadNotebooks: async (): Promise<Notebook[] | null> => {
    return await readJson<Notebook[]>('notebooks.json');
  },

  // ─── Pinned Notebooks ────────────────────────────────────────────────────────
  savePinnedIds: async (ids: string[]): Promise<void> => {
    await writeJson('pinned_notebooks.json', ids);
  },

  loadPinnedIds: async (): Promise<string[] | null> => {
    return await readJson<string[]>('pinned_notebooks.json');
  },

  // ─── Sources per Notebook ────────────────────────────────────────────────────
  saveSources: async (notebookId: string, sources: Source[]): Promise<void> => {
    await writeJson(`sources_${notebookId}.json`, sources);
  },

  loadSources: async (notebookId: string): Promise<Source[] | null> => {
    return await readJson<Source[]>(`sources_${notebookId}.json`);
  },

  // ─── Chat Sessions per Notebook ──────────────────────────────────────────────
  saveSessions: async (notebookId: string, sessions: any[]): Promise<void> => {
    await writeJson(`sessions_${notebookId}.json`, sessions);
  },

  loadSessions: async (notebookId: string): Promise<any[] | null> => {
    return await readJson<any[]>(`sessions_${notebookId}.json`);
  },

  // ─── Messages per Session ───────────────────────────────────────────────────
  saveMessages: async (
    notebookId: string,
    sessionId: string,
    messages: ChatMessage[]
  ): Promise<void> => {
    // Map dates to ISO strings for proper JSON serialization
    const serialized = messages.map((m) => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
    }));
    await writeJson(`messages_${notebookId}_${sessionId}.json`, serialized);
  },

  loadMessages: async (
    notebookId: string,
    sessionId: string
  ): Promise<ChatMessage[] | null> => {
    const raw = await readJson<any[]>(`messages_${notebookId}_${sessionId}.json`);
    if (!raw) return null;
    return raw.map((m) => ({
      ...m,
      timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
    }));
  },

  // ─── Last Active Session per Notebook ────────────────────────────────────────
  saveLastActiveSessionId: async (notebookId: string, sessionId: string | null): Promise<void> => {
    await writeJson(`last_session_${notebookId}.json`, { sessionId });
  },

  loadLastActiveSessionId: async (notebookId: string): Promise<string | null> => {
    const data = await readJson<{ sessionId: string | null }>(`last_session_${notebookId}.json`);
    return data?.sessionId ?? null;
  },

  // ─── Flashcard Decks per Notebook ────────────────────────────────────────────
  saveFlashcardDecks: async (notebookId: string, decks: any[]): Promise<void> => {
    await writeJson(`decks_${notebookId}.json`, decks);
  },

  loadFlashcardDecks: async (notebookId: string): Promise<any[] | null> => {
    return await readJson<any[]>(`decks_${notebookId}.json`);
  },

  saveFlashcardDeckDetail: async (deckId: string, deck: any): Promise<void> => {
    await writeJson(`deck_${deckId}.json`, deck);
  },

  loadFlashcardDeckDetail: async (deckId: string): Promise<any | null> => {
    return await readJson<any>(`deck_${deckId}.json`);
  },

  removeFlashcardDeckDetail: async (deckId: string): Promise<void> => {
    try {
      const path = `${CACHE_DIR}deck_${deckId}.json`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }
    } catch (err) {
      console.warn(`[NotebookStorage] Failed to delete deck_${deckId}.json:`, err);
    }
  },

  // ─── Quizzes per Notebook ────────────────────────────────────────────────────
  saveQuizzes: async (notebookId: string, quizzes: any[]): Promise<void> => {
    await writeJson(`quizzes_${notebookId}.json`, quizzes);
  },

  loadQuizzes: async (notebookId: string): Promise<any[] | null> => {
    return await readJson<any[]>(`quizzes_${notebookId}.json`);
  },

  saveQuizDetail: async (quizId: string, quiz: any): Promise<void> => {
    await writeJson(`quiz_${quizId}.json`, quiz);
  },

  loadQuizDetail: async (quizId: string): Promise<any | null> => {
    return await readJson<any>(`quiz_${quizId}.json`);
  },

  removeQuizDetail: async (quizId: string): Promise<void> => {
    try {
      const path = `${CACHE_DIR}quiz_${quizId}.json`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }
    } catch (err) {
      console.warn(`[NotebookStorage] Failed to delete quiz_${quizId}.json:`, err);
    }
  },

  // ─── Pending Tools Sync Queue ────────────────────────────────────────────────
  savePendingToolsSync: async (queue: PendingToolSyncItem[]): Promise<void> => {
    await writeJson('pending_tools_sync.json', queue);
  },

  loadPendingToolsSync: async (): Promise<PendingToolSyncItem[]> => {
    const list = await readJson<PendingToolSyncItem[]>('pending_tools_sync.json');
    return Array.isArray(list) ? list : [];
  },

  enqueuePendingToolSync: async (item: PendingToolSyncItem): Promise<void> => {
    const current = await NotebookStorage.loadPendingToolsSync();
    const filtered = current.filter((x) => x.localId !== item.localId);
    await NotebookStorage.savePendingToolsSync([...filtered, item]);
  },

  removePendingToolSync: async (localId: string): Promise<void> => {
    const current = await NotebookStorage.loadPendingToolsSync();
    const updated = current.filter((x) => {
      if (x.localId === localId) return false;
      if (x.type === 'ADD_CARD' && x.deckId === localId) return false;
      if (x.type === 'ADD_QUESTION' && x.quizId === localId) return false;
      return true;
    });
    await NotebookStorage.savePendingToolsSync(updated);
  },
};

export type PendingToolSyncItem =
  | {
      type: 'CREATE_DECK';
      localId: string;
      notebookId: string;
      title: string;
      description?: string;
    }
  | {
      type: 'ADD_CARD';
      localId: string;
      deckId: string;
      front: string;
      back: string;
    }
  | {
      type: 'CREATE_QUIZ';
      localId: string;
      notebookId: string;
      title: string;
      description?: string;
    }
  | {
      type: 'ADD_QUESTION';
      localId: string;
      quizId: string;
      question: string;
      options: string[];
      correctAnswer: number;
      explanation?: string;
    };
