import { create } from 'zustand';
import { ApiService } from '@/src/services/api';
import { ChatMessage } from '@/src/components/notebook/chat/ChatMessageBubble';
import { NotebookStorage } from '@/src/services/notebookStorage';
import { useSystemStore } from './systemStore';

let _idCounter = 0;
function genId(): string {
  _idCounter += 1;
  return `msg_${Date.now()}_${_idCounter}`;
}

interface ChatState {
  messages: ChatMessage[];
  sessionId: string | null;
  /** The notebookId currently loaded in the chat view. */
  activeNotebookId: string | null;
  sessions: any[];
  isLoading: boolean;
  error: string | null;
  /** Last user text that was sent — used by retry. */
  lastUserText: string | null;

  setSessionId: (sessionId: string | null) => void;
  initForNotebook: (notebookId: string) => Promise<void>;
  sendMessage: (notebookId: string, text: string) => Promise<void>;
  retryLastMessage: (notebookId: string) => Promise<void>;
  fetchSessions: (notebookId: string) => Promise<void>;
  loadSession: (notebookId: string, sessionId: string) => Promise<void>;
  deleteSession: (notebookId: string, sessionId: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: null,
  activeNotebookId: null,
  sessions: [],
  isLoading: false,
  error: null,
  lastUserText: null,

  setSessionId: (sessionId) => set({ sessionId }),

  initForNotebook: async (notebookId: string) => {
    const { activeNotebookId } = get();
    if (activeNotebookId !== notebookId) {
      // Switching notebooks — load cached sessions and last active session for this notebook
      set({
        messages: [],
        sessionId: null,
        activeNotebookId: notebookId,
        error: null,
        lastUserText: null,
      });

      // Hydrate sessions from disk cache
      const cachedSessions = await NotebookStorage.loadSessions(notebookId);
      if (cachedSessions && cachedSessions.length > 0) {
        set({ sessions: cachedSessions });
      }

      // Try restoring the last active session's messages
      const lastSessionId = await NotebookStorage.loadLastActiveSessionId(notebookId);
      if (lastSessionId) {
        const cachedMsgs = await NotebookStorage.loadMessages(notebookId, lastSessionId);
        if (cachedMsgs && cachedMsgs.length > 0) {
          set({ messages: cachedMsgs, sessionId: lastSessionId });
        }
      }
    }
  },

  sendMessage: async (notebookId: string, text: string) => {
    const { isOnline } = useSystemStore.getState();
    if (!isOnline) return;

    const currentSessionId = get().sessionId;

    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const nextMessagesWithUser = [...get().messages, userMsg];
    set({
      messages: nextMessagesWithUser,
      isLoading: true,
      error: null,
      lastUserText: text,
    });

    try {
      const res = await ApiService.chat.send(notebookId, text, currentSessionId);
      const payload = res?.data ?? res;

      const newSessionId = payload?.sessionId ?? currentSessionId;

      const assistantMsg: ChatMessage = {
        id: genId(),
        role: 'assistant',
        content: payload?.reply ?? 'I could not generate a response. Please try again.',
        citations: Array.isArray(payload?.citations) ? payload.citations : [],
        timestamp: new Date(),
      };

      const finalMessages = [...nextMessagesWithUser, assistantMsg];
      set({
        messages: finalMessages,
        sessionId: newSessionId,
        isLoading: false,
      });

      // Persist messages and active session to disk cache
      if (newSessionId) {
        NotebookStorage.saveMessages(notebookId, newSessionId, finalMessages);
        NotebookStorage.saveLastActiveSessionId(notebookId, newSessionId);
      }

      // Refresh session history so the new/updated conversation appears immediately in the drawer
      get().fetchSessions(notebookId);
    } catch (err: any) {
      // Mark as an error bubble so the UI can render it differently
      const errMsg: ChatMessage = {
        id: genId(),
        role: 'assistant',
        content: err?.message ?? 'Unknown error. Please check your connection and try again.',
        citations: [],
        timestamp: new Date(),
        isError: true,
      };

      set((state) => ({
        messages: [...state.messages, errMsg],
        isLoading: false,
        error: err?.message ?? 'Unknown error',
      }));
    }
  },

  retryLastMessage: async (notebookId: string) => {
    const { lastUserText, isLoading } = get();
    if (!lastUserText || isLoading) return;

    // Remove the last error bubble before retrying
    set((state) => {
      const msgs = [...state.messages];
      if (msgs.length > 0 && msgs[msgs.length - 1].isError) {
        msgs.pop();
      }
      return { messages: msgs, error: null };
    });

    await get().sendMessage(notebookId, lastUserText);
  },

  fetchSessions: async (notebookId: string) => {
    // 1. Stale-while-revalidate: Hydrate cached sessions from disk first
    if (get().sessions.length === 0) {
      const cached = await NotebookStorage.loadSessions(notebookId);
      if (cached && cached.length > 0) {
        set({ sessions: cached });
      }
    }

    const { isOnline } = useSystemStore.getState();
    if (!isOnline && get().sessions.length > 0) {
      return;
    }

    try {
      const res = await ApiService.chat.history(notebookId);
      const data = res?.data ?? res;
      // Backend returns { status: 'success', data: { notebookId, sessions: [...] } }
      const sessionList = Array.isArray(data?.sessions)
        ? data.sessions
        : Array.isArray(data?.data?.sessions)
        ? data.data.sessions
        : Array.isArray(data)
        ? data
        : [];

      set({ sessions: sessionList });
      // Cache sessions list to disk
      NotebookStorage.saveSessions(notebookId, sessionList);
    } catch (err) {
      console.warn('Failed to fetch chat sessions', err);
    }
  },

  loadSession: async (notebookId: string, sessionId: string) => {
    // 1. Stale-while-revalidate: Load from disk cache first
    const cached = await NotebookStorage.loadMessages(notebookId, sessionId);
    if (cached && cached.length > 0) {
      set({
        messages: cached,
        sessionId,
        isLoading: false,
        error: null,
      });
      NotebookStorage.saveLastActiveSessionId(notebookId, sessionId);
    } else {
      set({ isLoading: true, error: null });
    }

    const { isOnline } = useSystemStore.getState();
    if (!isOnline) {
      set({ isLoading: false });
      return;
    }

    try {
      const res = await ApiService.chat.getSession(notebookId, sessionId);
      const data = res?.data ?? res;
      const rawMsgs = Array.isArray(data?.messages)
        ? data.messages
        : Array.isArray(data?.data?.messages)
        ? data.data.messages
        : Array.isArray(data)
        ? data
        : [];

      const parseCitations = (raw: any): any[] => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string') {
          try { return JSON.parse(raw); } catch { return []; }
        }
        return [];
      };

      const formattedMsgs: ChatMessage[] = rawMsgs.map((m: any) => ({
        id: m.id || genId(),
        role: m.role?.toLowerCase() === 'user' ? 'user' : 'assistant',
        content: m.content,
        citations: parseCitations(m.citations),
        timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
      }));

      set({
        messages: formattedMsgs,
        sessionId,
        isLoading: false,
      });

      // Save to disk cache
      NotebookStorage.saveMessages(notebookId, sessionId, formattedMsgs);
      NotebookStorage.saveLastActiveSessionId(notebookId, sessionId);
    } catch (err: any) {
      // If we already loaded cached messages, do not show error
      if (!cached || cached.length === 0) {
        set({ isLoading: false, error: err?.message ?? 'Failed to load session' });
      } else {
        set({ isLoading: false });
      }
    }
  },

  deleteSession: async (notebookId: string, sessionId: string) => {
    try {
      await ApiService.chat.deleteSession(notebookId, sessionId);
      const updatedSessions = get().sessions.filter((s) => s.id !== sessionId);
      set((state) => ({
        sessions: updatedSessions,
        ...(state.sessionId === sessionId ? { sessionId: null, messages: [] } : {}),
      }));
      NotebookStorage.saveSessions(notebookId, updatedSessions);
    } catch (err) {
      console.warn('Failed to delete session', err);
    }
  },

  clearMessages: () => {
    set({ messages: [], sessionId: null, error: null, lastUserText: null });
  },
}));
