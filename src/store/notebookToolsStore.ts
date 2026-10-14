import { create } from 'zustand';
import { ApiService } from '@/src/services/api';
import { NotebookStorage } from '@/src/services/notebookStorage';
import { useSystemStore } from './systemStore';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  isMastered: boolean;
  deckId: string;
  createdAt: string;
}

export interface FlashcardDeckSummary {
  id: string;
  notebookId?: string;
  title: string;
  description?: string | null;
  totalCards: number;
  masteredCards: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardDeckDetail extends FlashcardDeckSummary {
  cards: Flashcard[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string | null;
}

export interface QuizSummary {
  id: string;
  notebookId?: string;
  title: string;
  description?: string | null;
  totalQuestions: number;
  bestAttempt?: {
    score: number;
    total: number;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizDetail extends QuizSummary {
  questions: QuizQuestion[];
  attempts: Array<{
    id: string;
    score: number;
    total: number;
    answers?: number[];
    createdAt: string;
  }>;
}

export interface QuizResult {
  attemptId: string;
  score: number;
  total: number;
  percentage: number;
  results: Array<{
    questionId: string;
    question: string;
    selected: number;
    correctAnswer: number;
    isCorrect: boolean;
    explanation?: string | null;
  }>;
  createdAt: string;
}

interface NotebookToolsState {
  decksByNotebook: Record<string, FlashcardDeckSummary[]>;
  deckDetails: Record<string, FlashcardDeckDetail>;
  quizzesByNotebook: Record<string, QuizSummary[]>;
  quizDetails: Record<string, QuizDetail>;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;

  // Flashcards
  fetchDecks: (notebookId: string, silent?: boolean) => Promise<void>;
  fetchDeckDetail: (deckId: string) => Promise<FlashcardDeckDetail>;
  generateFlashcards: (notebookId: string, options?: { count?: number; title?: string }) => Promise<FlashcardDeckDetail>;
  createDeck: (notebookId: string, data: { title: string; description?: string; cards?: Array<{ front: string; back: string }> }) => Promise<FlashcardDeckDetail>;
  updateDeck: (deckId: string, notebookId: string, data: { title?: string; description?: string }) => Promise<void>;
  deleteDeck: (deckId: string, notebookId: string) => Promise<void>;
  addCard: (deckId: string, data: { front: string; back: string }) => Promise<Flashcard>;
  updateCard: (deckId: string, cardId: string, data: { front?: string; back?: string; isMastered?: boolean }) => Promise<void>;
  toggleCardMastered: (deckId: string, cardId: string) => Promise<boolean>;
  deleteCard: (deckId: string, cardId: string) => Promise<void>;

  // Quizzes
  fetchQuizzes: (notebookId: string, silent?: boolean) => Promise<void>;
  fetchQuizDetail: (quizId: string) => Promise<QuizDetail>;
  generateQuiz: (notebookId: string, options?: { count?: number; title?: string }) => Promise<QuizDetail>;
  createQuiz: (notebookId: string, data: { title: string; description?: string; questions?: any[] }) => Promise<QuizDetail>;
  updateQuiz: (quizId: string, notebookId: string, data: { title?: string; description?: string }) => Promise<void>;
  deleteQuiz: (quizId: string, notebookId: string) => Promise<void>;
  addQuestion: (quizId: string, data: { question: string; options: string[]; correctAnswer: number; explanation?: string }) => Promise<QuizQuestion>;
  updateQuestion: (quizId: string, questionId: string, data: { question?: string; options?: string[]; correctAnswer?: number; explanation?: string }) => Promise<void>;
  deleteQuestion: (quizId: string, questionId: string) => Promise<void>;
  submitQuizAttempt: (quizId: string, answers: number[]) => Promise<QuizResult>;
}

export const useNotebookToolsStore = create<NotebookToolsState>((set, get) => ({
  decksByNotebook: {},
  deckDetails: {},
  quizzesByNotebook: {},
  quizDetails: {},
  isLoading: false,
  isGenerating: false,
  error: null,

  // ─── Flashcards ─────────────────────────────────────────────────────────────

  fetchDecks: async (notebookId: string, silent = false) => {
    // 1. Instant offline cache load
    const cached = await NotebookStorage.loadFlashcardDecks(notebookId);
    if (cached) {
      set((state) => ({
        decksByNotebook: { ...state.decksByNotebook, [notebookId]: cached },
      }));
    }

    const { isOnline } = useSystemStore.getState();
    if (!isOnline) {
      return;
    }

    if (!silent) set({ isLoading: true, error: null });

    try {
      const res = await ApiService.flashcards.list(notebookId);
      const decks = res.data ?? [];
      set((state) => ({
        decksByNotebook: { ...state.decksByNotebook, [notebookId]: decks },
      }));
      await NotebookStorage.saveFlashcardDecks(notebookId, decks);

      // Pre-cache individual deck details if cards are included or in background
      for (const d of decks) {
        if (d.cards && Array.isArray(d.cards)) {
          set((state) => ({
            deckDetails: { ...state.deckDetails, [d.id]: d },
          }));
          await NotebookStorage.saveFlashcardDeckDetail(d.id, d);
        } else {
          NotebookStorage.loadFlashcardDeckDetail(d.id).then(async (existing) => {
            if (!existing && useSystemStore.getState().isOnline) {
              try {
                const detailRes = await ApiService.flashcards.get(d.id);
                if (detailRes?.data) {
                  set((state) => ({
                    deckDetails: { ...state.deckDetails, [d.id]: detailRes.data },
                  }));
                  await NotebookStorage.saveFlashcardDeckDetail(d.id, detailRes.data);
                }
              } catch {}
            }
          });
        }
      }
    } catch (err: any) {
      console.warn('[NotebookToolsStore] fetchDecks offline/error:', err.message);
      if (!cached) {
        set({ error: err.message || 'Failed to load flashcard decks.' });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  fetchDeckDetail: async (deckId: string) => {
    // 1. Check in-memory state or offline cache first
    const inMemory = get().deckDetails[deckId];
    const cached = inMemory || (await NotebookStorage.loadFlashcardDeckDetail(deckId));
    if (cached) {
      set((state) => ({
        deckDetails: { ...state.deckDetails, [deckId]: cached },
      }));
    }

    const { isOnline } = useSystemStore.getState();
    if (!isOnline) {
      if (cached) {
        return cached;
      }
      throw new Error('This flashcard deck is not available offline. Please connect to the internet to load it.');
    }

    try {
      const res = await ApiService.flashcards.get(deckId);
      const deck = res.data;
      set((state) => ({
        deckDetails: { ...state.deckDetails, [deckId]: deck },
      }));
      await NotebookStorage.saveFlashcardDeckDetail(deckId, deck);
      return deck;
    } catch (err: any) {
      if (cached) return cached;
      throw err;
    }
  },

  generateFlashcards: async (notebookId: string, options) => {
    set({ isGenerating: true, error: null });
    try {
      const res = await ApiService.flashcards.generate(notebookId, options);
      const newDeck = res.data;

      // Update state
      set((state) => {
        const existing = state.decksByNotebook[notebookId] || [];
        const updatedList = [newDeck, ...existing];
        return {
          decksByNotebook: { ...state.decksByNotebook, [notebookId]: updatedList },
          deckDetails: { ...state.deckDetails, [newDeck.id]: newDeck },
        };
      });

      // Cache
      await NotebookStorage.saveFlashcardDeckDetail(newDeck.id, newDeck);
      const currentList = get().decksByNotebook[notebookId] || [];
      await NotebookStorage.saveFlashcardDecks(notebookId, currentList);

      return newDeck;
    } catch (err: any) {
      set({ error: err.message || 'Flashcard generation failed.' });
      throw err;
    } finally {
      set({ isGenerating: false });
    }
  },

  createDeck: async (notebookId: string, data) => {
    set({ isLoading: true });
    try {
      const res = await ApiService.flashcards.createDeck(notebookId, data);
      const newDeck = res.data;

      set((state) => {
        const existing = state.decksByNotebook[notebookId] || [];
        return {
          decksByNotebook: { ...state.decksByNotebook, [notebookId]: [newDeck, ...existing] },
          deckDetails: { ...state.deckDetails, [newDeck.id]: newDeck },
        };
      });

      await NotebookStorage.saveFlashcardDeckDetail(newDeck.id, newDeck);
      const currentList = get().decksByNotebook[notebookId] || [];
      await NotebookStorage.saveFlashcardDecks(notebookId, currentList);

      return newDeck;
    } finally {
      set({ isLoading: false });
    }
  },

  updateDeck: async (deckId: string, notebookId: string, data) => {
    // Optimistic
    set((state) => {
      const list = (state.decksByNotebook[notebookId] || []).map((d) =>
        d.id === deckId ? { ...d, ...data } : d
      );
      const currentDetail = state.deckDetails[deckId];
      const updatedDetail = currentDetail ? { ...currentDetail, ...data } : undefined;
      return {
        decksByNotebook: { ...state.decksByNotebook, [notebookId]: list },
        deckDetails: updatedDetail ? { ...state.deckDetails, [deckId]: updatedDetail } : state.deckDetails,
      };
    });

    const updated = get().deckDetails[deckId];
    if (updated) await NotebookStorage.saveFlashcardDeckDetail(deckId, updated);

    const { isOnline } = useSystemStore.getState();
    if (isOnline) {
      try {
        await ApiService.flashcards.updateDeck(deckId, data);
      } catch (err) {
        console.warn('[notebookToolsStore] updateDeck API failed:', err);
      }
    }
  },

  deleteDeck: async (deckId: string, notebookId: string) => {
    set((state) => {
      const remainingDecks = (state.decksByNotebook[notebookId] || []).filter((d) => d.id !== deckId);
      const remainingDetails = { ...state.deckDetails };
      delete remainingDetails[deckId];
      return {
        decksByNotebook: {
          ...state.decksByNotebook,
          [notebookId]: remainingDecks,
        },
        deckDetails: remainingDetails,
      };
    });

    const currentList = get().decksByNotebook[notebookId] || [];
    await NotebookStorage.saveFlashcardDecks(notebookId, currentList);

    const { isOnline } = useSystemStore.getState();
    if (isOnline) {
      try {
        await ApiService.flashcards.deleteDeck(deckId);
      } catch (err) {
        console.warn('[notebookToolsStore] deleteDeck API sync failed:', err);
      }
    }
  },

  addCard: async (deckId: string, data) => {
    const res = await ApiService.flashcards.addCard(deckId, data);
    const newCard = res.data;

    set((state) => {
      const detail = state.deckDetails[deckId];
      if (!detail) return state;
      const exists = detail.cards.some((c) => c.id === newCard.id);
      const updatedCards = exists
        ? detail.cards.map((c) => (c.id === newCard.id ? newCard : c))
        : [...detail.cards, newCard];
      const updatedDetail: FlashcardDeckDetail = {
        ...detail,
        cards: updatedCards,
        totalCards: updatedCards.length,
      };

      const notebookId = detail.notebookId;
      const list = notebookId ? state.decksByNotebook[notebookId] : undefined;
      const updatedDecks = list
        ? list.map((d) =>
            d.id === deckId ? { ...d, totalCards: updatedCards.length } : d
          )
        : undefined;

      return {
        deckDetails: { ...state.deckDetails, [deckId]: updatedDetail },
        ...(notebookId && updatedDecks
          ? { decksByNotebook: { ...state.decksByNotebook, [notebookId]: updatedDecks } }
          : {}),
      };
    });

    const updated = get().deckDetails[deckId];
    if (updated) {
      await NotebookStorage.saveFlashcardDeckDetail(deckId, updated);
      if (updated.notebookId && get().decksByNotebook[updated.notebookId]) {
        await NotebookStorage.saveFlashcardDecks(updated.notebookId, get().decksByNotebook[updated.notebookId]);
      }
    }
    return newCard;
  },

  updateCard: async (deckId: string, cardId: string, data) => {
    // Optimistic update
    set((state) => {
      const detail = state.deckDetails[deckId];
      if (!detail) return state;
      const updatedCards = detail.cards.map((c) =>
        c.id === cardId ? { ...c, ...data } : c
      );
      const mastered = updatedCards.filter((c) => c.isMastered).length;
      const updatedDetail = {
        ...detail,
        cards: updatedCards,
        masteredCards: mastered,
      };

      const notebookId = detail.notebookId;
      const list = notebookId ? state.decksByNotebook[notebookId] : undefined;
      const updatedDecks = list
        ? list.map((d) =>
            d.id === deckId
              ? { ...d, masteredCards: mastered }
              : d
          )
        : undefined;

      return {
        deckDetails: { ...state.deckDetails, [deckId]: updatedDetail },
        ...(notebookId && updatedDecks
          ? { decksByNotebook: { ...state.decksByNotebook, [notebookId]: updatedDecks } }
          : {}),
      };
    });

    const updated = get().deckDetails[deckId];
    if (updated) {
      await NotebookStorage.saveFlashcardDeckDetail(deckId, updated);
      if (updated.notebookId && get().decksByNotebook[updated.notebookId]) {
        await NotebookStorage.saveFlashcardDecks(updated.notebookId, get().decksByNotebook[updated.notebookId]);
      }
    }

    const { isOnline } = useSystemStore.getState();
    if (isOnline) {
      try {
        await ApiService.flashcards.updateCard(cardId, data);
      } catch (err) {
        console.warn('[notebookToolsStore] updateCard API failed:', err);
      }
    }
  },

  toggleCardMastered: async (deckId: string, cardId: string) => {
    const detail = get().deckDetails[deckId];
    const targetCard = detail?.cards.find((c) => c.id === cardId);
    const nextMastered = !(targetCard?.isMastered ?? false);

    await get().updateCard(deckId, cardId, { isMastered: nextMastered });
    return nextMastered;
  },

  deleteCard: async (deckId: string, cardId: string) => {
    set((state) => {
      const detail = state.deckDetails[deckId];
      if (!detail) return state;
      const updatedCards = detail.cards.filter((c) => c.id !== cardId);
      const mastered = updatedCards.filter((c) => c.isMastered).length;
      const updatedDetail: FlashcardDeckDetail = {
        ...detail,
        cards: updatedCards,
        totalCards: updatedCards.length,
        masteredCards: mastered,
      };

      const notebookId = detail.notebookId;
      const list = notebookId ? state.decksByNotebook[notebookId] : undefined;
      const updatedDecks = list
        ? list.map((d) =>
            d.id === deckId
              ? { ...d, totalCards: updatedCards.length, masteredCards: mastered }
              : d
          )
        : undefined;

      return {
        deckDetails: { ...state.deckDetails, [deckId]: updatedDetail },
        ...(notebookId && updatedDecks
          ? { decksByNotebook: { ...state.decksByNotebook, [notebookId]: updatedDecks } }
          : {}),
      };
    });

    const updated = get().deckDetails[deckId];
    if (updated) {
      await NotebookStorage.saveFlashcardDeckDetail(deckId, updated);
      if (updated.notebookId && get().decksByNotebook[updated.notebookId]) {
        await NotebookStorage.saveFlashcardDecks(updated.notebookId, get().decksByNotebook[updated.notebookId]);
      }
    }

    const { isOnline } = useSystemStore.getState();
    if (isOnline) {
      try {
        await ApiService.flashcards.deleteCard(cardId);
      } catch (err) {
        console.warn('[notebookToolsStore] deleteCard API sync failed:', err);
      }
    }
  },

  // ─── Quizzes ────────────────────────────────────────────────────────────────

  fetchQuizzes: async (notebookId: string, silent = false) => {
    const cached = await NotebookStorage.loadQuizzes(notebookId);
    if (cached) {
      set((state) => ({
        quizzesByNotebook: { ...state.quizzesByNotebook, [notebookId]: cached },
      }));
    }

    const { isOnline } = useSystemStore.getState();
    if (!isOnline) {
      return;
    }

    if (!silent) set({ isLoading: true, error: null });

    try {
      const res = await ApiService.quizzes.list(notebookId);
      const quizzes = res.data ?? [];
      set((state) => ({
        quizzesByNotebook: { ...state.quizzesByNotebook, [notebookId]: quizzes },
      }));
      await NotebookStorage.saveQuizzes(notebookId, quizzes);

      // Pre-cache individual quiz details if questions are included or in background
      for (const q of quizzes) {
        if (q.questions && Array.isArray(q.questions)) {
          set((state) => ({
            quizDetails: { ...state.quizDetails, [q.id]: q },
          }));
          await NotebookStorage.saveQuizDetail(q.id, q);
        } else {
          NotebookStorage.loadQuizDetail(q.id).then(async (existing) => {
            if (!existing && useSystemStore.getState().isOnline) {
              try {
                const detailRes = await ApiService.quizzes.get(q.id);
                if (detailRes?.data) {
                  set((state) => ({
                    quizDetails: { ...state.quizDetails, [q.id]: detailRes.data },
                  }));
                  await NotebookStorage.saveQuizDetail(q.id, detailRes.data);
                }
              } catch {}
            }
          });
        }
      }
    } catch (err: any) {
      console.warn('[NotebookToolsStore] fetchQuizzes offline/error:', err.message);
      if (!cached) {
        set({ error: err.message || 'Failed to load quizzes.' });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  fetchQuizDetail: async (quizId: string) => {
    const inMemory = get().quizDetails[quizId];
    const cached = inMemory || (await NotebookStorage.loadQuizDetail(quizId));
    if (cached) {
      set((state) => ({
        quizDetails: { ...state.quizDetails, [quizId]: cached },
      }));
    }

    const { isOnline } = useSystemStore.getState();
    if (!isOnline) {
      if (cached) {
        return cached;
      }
      throw new Error('This quiz is not available offline. Please connect to the internet to load it.');
    }

    try {
      const res = await ApiService.quizzes.get(quizId);
      const quiz = res.data;
      set((state) => ({
        quizDetails: { ...state.quizDetails, [quizId]: quiz },
      }));
      await NotebookStorage.saveQuizDetail(quizId, quiz);
      return quiz;
    } catch (err: any) {
      if (cached) return cached;
      throw err;
    }
  },

  generateQuiz: async (notebookId: string, options) => {
    set({ isGenerating: true, error: null });
    try {
      const res = await ApiService.quizzes.generate(notebookId, options);
      const newQuiz = res.data;

      set((state) => {
        const existing = state.quizzesByNotebook[notebookId] || [];
        return {
          quizzesByNotebook: { ...state.quizzesByNotebook, [notebookId]: [newQuiz, ...existing] },
          quizDetails: { ...state.quizDetails, [newQuiz.id]: newQuiz },
        };
      });

      await NotebookStorage.saveQuizDetail(newQuiz.id, newQuiz);
      const currentList = get().quizzesByNotebook[notebookId] || [];
      await NotebookStorage.saveQuizzes(notebookId, currentList);

      return newQuiz;
    } catch (err: any) {
      set({ error: err.message || 'Quiz generation failed.' });
      throw err;
    } finally {
      set({ isGenerating: false });
    }
  },

  createQuiz: async (notebookId: string, data) => {
    set({ isLoading: true });
    try {
      const res = await ApiService.quizzes.createQuiz(notebookId, data);
      const newQuiz = res.data;

      set((state) => {
        const existing = state.quizzesByNotebook[notebookId] || [];
        return {
          quizzesByNotebook: { ...state.quizzesByNotebook, [notebookId]: [newQuiz, ...existing] },
          quizDetails: { ...state.quizDetails, [newQuiz.id]: newQuiz },
        };
      });

      await NotebookStorage.saveQuizDetail(newQuiz.id, newQuiz);
      const currentList = get().quizzesByNotebook[notebookId] || [];
      await NotebookStorage.saveQuizzes(notebookId, currentList);

      return newQuiz;
    } finally {
      set({ isLoading: false });
    }
  },

  updateQuiz: async (quizId: string, notebookId: string, data) => {
    set((state) => {
      const list = (state.quizzesByNotebook[notebookId] || []).map((q) =>
        q.id === quizId ? { ...q, ...data } : q
      );
      const currentDetail = state.quizDetails[quizId];
      const updatedDetail = currentDetail ? { ...currentDetail, ...data } : undefined;
      return {
        quizzesByNotebook: { ...state.quizzesByNotebook, [notebookId]: list },
        quizDetails: updatedDetail ? { ...state.quizDetails, [quizId]: updatedDetail } : state.quizDetails,
      };
    });

    const updated = get().quizDetails[quizId];
    if (updated) await NotebookStorage.saveQuizDetail(quizId, updated);

    const { isOnline } = useSystemStore.getState();
    if (isOnline) {
      try {
        await ApiService.quizzes.updateQuiz(quizId, data);
      } catch (err) {
        console.warn('[notebookToolsStore] updateQuiz API failed:', err);
      }
    }
  },

  deleteQuiz: async (quizId: string, notebookId: string) => {
    set((state) => {
      const remainingQuizzes = (state.quizzesByNotebook[notebookId] || []).filter((q) => q.id !== quizId);
      const remainingDetails = { ...state.quizDetails };
      delete remainingDetails[quizId];
      return {
        quizzesByNotebook: {
          ...state.quizzesByNotebook,
          [notebookId]: remainingQuizzes,
        },
        quizDetails: remainingDetails,
      };
    });

    const currentList = get().quizzesByNotebook[notebookId] || [];
    await NotebookStorage.saveQuizzes(notebookId, currentList);

    const { isOnline } = useSystemStore.getState();
    if (isOnline) {
      try {
        await ApiService.quizzes.deleteQuiz(quizId);
      } catch (err) {
        console.warn('[notebookToolsStore] deleteQuiz API sync failed:', err);
      }
    }
  },

  addQuestion: async (quizId: string, data) => {
    const res = await ApiService.quizzes.addQuestion(quizId, data);
    const newQ = res.data;

    set((state) => {
      const detail = state.quizDetails[quizId];
      if (!detail) return state;
      const exists = detail.questions.some((q) => q.id === newQ.id);
      const updatedQuestions = exists
        ? detail.questions.map((q) => (q.id === newQ.id ? newQ : q))
        : [...detail.questions, newQ];
      const updatedDetail: QuizDetail = {
        ...detail,
        questions: updatedQuestions,
        totalQuestions: updatedQuestions.length,
      };

      const notebookId = detail.notebookId;
      const list = notebookId ? state.quizzesByNotebook[notebookId] : undefined;
      const updatedQuizzes = list
        ? list.map((q) =>
            q.id === quizId ? { ...q, totalQuestions: updatedQuestions.length } : q
          )
        : undefined;

      return {
        quizDetails: {
          ...state.quizDetails,
          [quizId]: updatedDetail,
        },
        ...(notebookId && updatedQuizzes
          ? { quizzesByNotebook: { ...state.quizzesByNotebook, [notebookId]: updatedQuizzes } }
          : {}),
      };
    });

    const updated = get().quizDetails[quizId];
    if (updated) {
      await NotebookStorage.saveQuizDetail(quizId, updated);
      if (updated.notebookId && get().quizzesByNotebook[updated.notebookId]) {
        await NotebookStorage.saveQuizzes(updated.notebookId, get().quizzesByNotebook[updated.notebookId]);
      }
    }
    return newQ;
  },

  updateQuestion: async (quizId: string, questionId: string, data) => {
    set((state) => {
      const detail = state.quizDetails[quizId];
      if (!detail) return state;
      const updatedQuestions = detail.questions.map((q) =>
        q.id === questionId ? { ...q, ...data } : q
      );
      return {
        quizDetails: {
          ...state.quizDetails,
          [quizId]: { ...detail, questions: updatedQuestions },
        },
      };
    });

    const updated = get().quizDetails[quizId];
    if (updated) await NotebookStorage.saveQuizDetail(quizId, updated);

    const { isOnline } = useSystemStore.getState();
    if (isOnline) {
      try {
        await ApiService.quizzes.updateQuestion(questionId, data);
      } catch (err) {
        console.warn('[notebookToolsStore] updateQuestion API failed:', err);
      }
    }
  },

  deleteQuestion: async (quizId: string, questionId: string) => {
    set((state) => {
      const detail = state.quizDetails[quizId];
      if (!detail) return state;
      const updatedQuestions = detail.questions.filter((q) => q.id !== questionId);
      const updatedDetail: QuizDetail = {
        ...detail,
        questions: updatedQuestions,
        totalQuestions: updatedQuestions.length,
      };

      const notebookId = detail.notebookId;
      const list = notebookId ? state.quizzesByNotebook[notebookId] : undefined;
      const updatedQuizzes = list
        ? list.map((q) =>
            q.id === quizId ? { ...q, totalQuestions: updatedQuestions.length } : q
          )
        : undefined;

      return {
        quizDetails: {
          ...state.quizDetails,
          [quizId]: updatedDetail,
        },
        ...(notebookId && updatedQuizzes
          ? { quizzesByNotebook: { ...state.quizzesByNotebook, [notebookId]: updatedQuizzes } }
          : {}),
      };
    });

    const updated = get().quizDetails[quizId];
    if (updated) {
      await NotebookStorage.saveQuizDetail(quizId, updated);
      if (updated.notebookId && get().quizzesByNotebook[updated.notebookId]) {
        await NotebookStorage.saveQuizzes(updated.notebookId, get().quizzesByNotebook[updated.notebookId]);
      }
    }

    const { isOnline } = useSystemStore.getState();
    if (isOnline) {
      try {
        await ApiService.quizzes.deleteQuestion(questionId);
      } catch (err) {
        console.warn('[notebookToolsStore] deleteQuestion API sync failed:', err);
      }
    }
  },

  submitQuizAttempt: async (quizId: string, answers: number[]) => {
    const res = await ApiService.quizzes.submitAttempt(quizId, answers);
    const result: QuizResult = res.data;

    // Refresh quiz detail to include updated attempts and best score
    try {
      await get().fetchQuizDetail(quizId);
    } catch {
      // ignore
    }

    return result;
  },
}));
