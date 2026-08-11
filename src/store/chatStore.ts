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
  sessions: any[];
  isLoading: boolean;
  error: string | null;

  setSessionId: (sessionId: string | null) => void;
  sendMessage: (notebookId: string, text: string) => Promise<void>;
  fetchSessions: (notebookId: string) => Promise<void>;
  loadSession: (notebookId: string, sessionId: string) => Promise<void>;
  deleteSession: (notebookId: string, sessionId: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: null,
  sessions: [],
  isLoading: false,
  error: null,

  setSessionId: (sessionId: string | null) => set({ sessionId }),

  sendMessage: async (notebookId: string, text: string) => {
    const { isOnline } = useSystemStore.getState();
    if (!isOnline) {
      return;
    }

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
      const errMsg: ChatMessage = {
        id: genId(),
        role: 'assistant',
        content: `Sorry, an error occurred: ${err?.message ?? 'Unknown error'}. Please check your connection and try again.`,
        citations: [],
        timestamp: new Date(),
      };
      
      set((state) => ({
        messages: [...state.messages, errMsg],
        isLoading: false,
        error: err?.message ?? 'Unknown error',
      }));
    }
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
      const rawMsgs = Array.isArray(data?.messages) ? data.messages : (Array.isArray(data) ? data : []);
      
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
    set({ messages: [], sessionId: null, error: null });
  },
}));
