import { create } from 'zustand';
import { ApiService } from '@/src/services/api';
import { ChatMessage } from '@/src/components/notebook/chat/ChatMessageBubble';
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
  /**
   * Must be called when the chat screen mounts with a notebookId.
   * Clears stale state if switching between notebooks.
   */
  initForNotebook: (notebookId: string) => void;
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

  initForNotebook: (notebookId: string) => {
    const { activeNotebookId } = get();
    if (activeNotebookId !== notebookId) {
      // Switching notebooks — wipe previous chat state
      set({
        messages: [],
        sessionId: null,
        activeNotebookId: notebookId,
        error: null,
        lastUserText: null,
      });
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

    set((state) => ({
      messages: [...state.messages, userMsg],
      isLoading: true,
      error: null,
      lastUserText: text,
    }));

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

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        sessionId: newSessionId,
        isLoading: false,
      }));
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
    try {
      const res = await ApiService.chat.history(notebookId);
      const data = res?.data ?? res;
      set({ sessions: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.warn('Failed to fetch chat sessions', err);
    }
  },

  loadSession: async (notebookId: string, sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await ApiService.chat.getSession(notebookId, sessionId);
      const data = res?.data ?? res;
      const rawMsgs = Array.isArray(data?.messages)
        ? data.messages
        : Array.isArray(data)
        ? data
        : [];

      const formattedMsgs: ChatMessage[] = rawMsgs.map((m: any) => ({
        id: m.id || genId(),
        role: m.role?.toLowerCase() === 'user' ? 'user' : 'assistant',
        content: m.content,
        citations: m.citations ?? [],
        timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
      }));

      set({
        messages: formattedMsgs,
        sessionId,
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Failed to load session' });
    }
  },

  deleteSession: async (notebookId: string, sessionId: string) => {
    try {
      await ApiService.chat.deleteSession(notebookId, sessionId);
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
        ...(state.sessionId === sessionId ? { sessionId: null, messages: [] } : {}),
      }));
    } catch (err) {
      console.warn('Failed to delete session', err);
    }
  },

  clearMessages: () => {
    set({ messages: [], sessionId: null, error: null, lastUserText: null });
  },
}));
