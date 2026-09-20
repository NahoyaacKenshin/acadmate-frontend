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
};
