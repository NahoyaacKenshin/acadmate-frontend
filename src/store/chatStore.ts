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
  isLoading: boolean;
  error: string | null;

  sendMessage: (notebookId: string, text: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,

  sendMessage: async (notebookId: string, text: string) => {
    const { isOnline } = useSystemStore.getState();
    if (!isOnline) {
      return;
    }

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
      const res = await ApiService.chat.send(notebookId, text);
      const payload = res?.data ?? res;
      
      const assistantMsg: ChatMessage = {
        id: genId(),
        role: 'assistant',
        content: payload?.reply ?? 'I could not generate a response. Please try again.',
        citations: Array.isArray(payload?.citations) ? payload.citations : [],
        timestamp: new Date(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMsg],
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

  clearMessages: () => {
    set({ messages: [], error: null });
  },
}));
