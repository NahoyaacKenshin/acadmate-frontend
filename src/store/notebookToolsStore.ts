import { create } from 'zustand';
import { ApiService } from '@/src/services/api';
import { NotebookStorage, PendingToolSyncItem } from '@/src/services/notebookStorage';
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

  // Offline Sync
  syncPendingTools: () => Promise<void>;
}

export const useNotebookToolsStore = create<NotebookToolsState>((set, get) => ({
  decksByNotebook: {},
  deckDetails: {},
  quizzesByNotebook: {},
  quizDetails: {},
  isLoading: false,
  isGenerating: false,
  error: null,

  // ─── Offline Sync ───────────────────────────────────────────────────────────

  syncPendingTools: async () => {
    const { isOnline } = useSystemStore.getState();
    if (!isOnline) return;

    const pending = await NotebookStorage.loadPendingToolsSync();
    if (!pending || pending.length === 0) return;

    const remainingQueue: PendingToolSyncItem[] = [];

    for (const item of pending) {
      try {
        if (item.type === 'CREATE_DECK') {
          const detail =
            get().deckDetails[item.localId] ||
            (await NotebookStorage.loadFlashcardDeckDetail(item.localId));
          if (!detail) continue;

          const cards = (detail.cards || []).map((c) => ({
            front: c.front,
            back: c.back,
          }));

          const res = await ApiService.flashcards.createDeck(item.notebookId, {
            title: detail.title,
            description: detail.description ?? undefined,
            cards: cards.length > 0 ? cards : undefined,
          });
          const serverDeck: FlashcardDeckDetail = res.data;

          set((state) => {
            const list = (state.decksByNotebook[item.notebookId] || []).map((d) =>
              d.id === item.localId ? serverDeck : d
            );
            const newDetails = { ...state.deckDetails };
            delete newDetails[item.localId];
            newDetails[serverDeck.id] = serverDeck;
            return {
              decksByNotebook: { ...state.decksByNotebook, [item.notebookId]: list },
              deckDetails: newDetails,
            };
          });

          await NotebookStorage.saveFlashcardDeckDetail(serverDeck.id, serverDeck);
          await NotebookStorage.removeFlashcardDeckDetail(item.localId);
          const currentList = get().decksByNotebook[item.notebookId] || [];
          await NotebookStorage.saveFlashcardDecks(item.notebookId, currentList);

          // Update any remaining items in pending queue referencing item.localId
          for (let i = 0; i < remainingQueue.length; i++) {
            if (remainingQueue[i].type === 'ADD_CARD' && (remainingQueue[i] as any).deckId === item.localId) {
              (remainingQueue[i] as any).deckId = serverDeck.id;
            }
          }
        } else if (item.type === 'CREATE_QUIZ') {
          const detail =
            get().quizDetails[item.localId] ||
            (await NotebookStorage.loadQuizDetail(item.localId));
          if (!detail) continue;

          const questions = (detail.questions || []).map((q) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation ?? undefined,
          }));

          const res = await ApiService.quizzes.createQuiz(item.notebookId, {
            title: detail.title,
            description: detail.description ?? undefined,
            questions: questions.length > 0 ? questions : undefined,
          });
          const serverQuiz: QuizDetail = res.data;

          set((state) => {
            const list = (state.quizzesByNotebook[item.notebookId] || []).map((q) =>
              q.id === item.localId ? serverQuiz : q
            );
            const newDetails = { ...state.quizDetails };
            delete newDetails[item.localId];
            newDetails[serverQuiz.id] = serverQuiz;
            return {
              quizzesByNotebook: { ...state.quizzesByNotebook, [item.notebookId]: list },
              quizDetails: newDetails,
            };
          });

          await NotebookStorage.saveQuizDetail(serverQuiz.id, serverQuiz);
          await NotebookStorage.removeQuizDetail(item.localId);
          const currentList = get().quizzesByNotebook[item.notebookId] || [];
          await NotebookStorage.saveQuizzes(item.notebookId, currentList);

          for (let i = 0; i < remainingQueue.length; i++) {
            if (remainingQueue[i].type === 'ADD_QUESTION' && (remainingQueue[i] as any).quizId === item.localId) {
              (remainingQueue[i] as any).quizId = serverQuiz.id;
            }
          }
        } else if (item.type === 'ADD_CARD') {
          if (item.deckId.startsWith('local_deck_')) {
            remainingQueue.push(item);
            continue;
          }
          const res = await ApiService.flashcards.addCard(item.deckId, {
            front: item.front,
            back: item.back,
          });
          const serverCard = res.data;
          set((state) => {
            const detail = state.deckDetails[item.deckId];
            if (!detail) return state;
            const updatedCards = detail.cards.map((c) => (c.id === item.localId ? serverCard : c));
            return {
              deckDetails: {
                ...state.deckDetails,
                [item.deckId]: { ...detail, cards: updatedCards },
              },
            };
          });
          const updated = get().deckDetails[item.deckId];
          if (updated) await NotebookStorage.saveFlashcardDeckDetail(item.deckId, updated);
        } else if (item.type === 'ADD_QUESTION') {
          if (item.quizId.startsWith('local_quiz_')) {
            remainingQueue.push(item);
            continue;
          }
          const res = await ApiService.quizzes.addQuestion(item.quizId, {
            question: item.question,
            options: item.options,
            correctAnswer: item.correctAnswer,
            explanation: item.explanation,
          });
          const serverQ = res.data;
          set((state) => {
            const detail = state.quizDetails[item.quizId];
            if (!detail) return state;
            const updatedQuestions = detail.questions.map((q) => (q.id === item.localId ? serverQ : q));
            return {
              quizDetails: {
                ...state.quizDetails,
                [item.quizId]: { ...detail, questions: updatedQuestions },
              },
            };
          });
          const updated = get().quizDetails[item.quizId];
          if (updated) await NotebookStorage.saveQuizDetail(item.quizId, updated);
        }
      } catch (err: any) {
        console.warn('[notebookToolsStore] Failed to sync item:', item.type, err?.message);
        remainingQueue.push(item);
      }
    }

    await NotebookStorage.savePendingToolsSync(remainingQueue);
  },

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

    // Attempt pending background sync
    get().syncPendingTools().catch(() => {});

    if (!silent) set({ isLoading: true, error: null });

    try {
      const res = await ApiService.flashcards.list(notebookId);
      const serverDecks: FlashcardDeckSummary[] = res.data ?? [];

      // Preserve any locally created decks that haven't synced yet
      const currentList = get().decksByNotebook[notebookId] || [];
      const pendingLocalDecks = currentList.filter((d) => d.id.startsWith('local_deck_'));
      const combinedDecks = [...pendingLocalDecks, ...serverDecks];

      set((state) => ({
        decksByNotebook: { ...state.decksByNotebook, [notebookId]: combinedDecks },
      }));
      await NotebookStorage.saveFlashcardDecks(notebookId, combinedDecks);

      // Pre-cache individual deck details
      for (const d of serverDecks) {
        if ((d as any).cards && Array.isArray((d as any).cards)) {
          set((state) => ({
            deckDetails: { ...state.deckDetails, [d.id]: d as any },
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

    if (deckId.startsWith('local_deck_')) {
      if (cached) return cached;
      throw new Error('Local flashcard deck not found.');
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
      const deck: FlashcardDeckDetail = res.data;

      // Preserve local cards not yet synced
      if (cached && cached.cards) {
        const localCards = cached.cards.filter((c: any) => c.id.startsWith('local_card_'));
        if (localCards.length > 0) {
          deck.cards = [...deck.cards, ...localCards];
          deck.totalCards = deck.cards.length;
        }
      }

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
      const { isOnline } = useSystemStore.getState();

      const createLocalDeck = async () => {
        const localId = `local_deck_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const now = new Date().toISOString();
        const initialCards: Flashcard[] = (data.cards || []).map((c, idx) => ({
          id: `local_card_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 8)}`,
          deckId: localId,
          front: c.front,
          back: c.back,
          isMastered: false,
          createdAt: now,
        }));

        const newDeck: FlashcardDeckDetail = {
          id: localId,
          notebookId,
          title: data.title,
          description: data.description ?? null,
          totalCards: initialCards.length,
          masteredCards: 0,
          createdAt: now,
          updatedAt: now,
          cards: initialCards,
        };

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

        await NotebookStorage.enqueuePendingToolSync({
          type: 'CREATE_DECK',
          localId,
          notebookId,
          title: data.title,
          description: data.description,
        });

        return newDeck;
      };

      if (!isOnline) {
        return await createLocalDeck();
      }

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
      } catch (apiErr: any) {
        console.warn('[notebookToolsStore] createDeck API failed, creating locally:', apiErr?.message);
        return await createLocalDeck();
      }
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
    if (isOnline && !deckId.startsWith('local_deck_')) {
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
    await NotebookStorage.removeFlashcardDeckDetail(deckId);
    await NotebookStorage.removePendingToolSync(deckId);

    const { isOnline } = useSystemStore.getState();
    if (isOnline && !deckId.startsWith('local_deck_')) {
      try {
        await ApiService.flashcards.deleteDeck(deckId);
      } catch (err) {
        console.warn('[notebookToolsStore] deleteDeck API sync failed:', err);
      }
    }
  },

  addCard: async (deckId: string, data) => {
    const { isOnline } = useSystemStore.getState();
    const isLocalDeck = deckId.startsWith('local_deck_');

    const addLocalCard = async (shouldQueueSync: boolean) => {
      const localCardId = `local_card_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const newCard: Flashcard = {
        id: localCardId,
        deckId,
        front: data.front,
        back: data.back,
        isMastered: false,
        createdAt: new Date().toISOString(),
      };

      set((state) => {
        const detail = state.deckDetails[deckId];
        if (!detail) return state;
        const updatedCards = [...detail.cards, newCard];
        const updatedDetail: FlashcardDeckDetail = {
          ...detail,
          cards: updatedCards,
          totalCards: updatedCards.length,
        };

        const notebookId = detail.notebookId;
        const list = notebookId ? state.decksByNotebook[notebookId] : undefined;
        const updatedDecks = list
          ? list.map((d) => (d.id === deckId ? { ...d, totalCards: updatedCards.length } : d))
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

      if (shouldQueueSync) {
        await NotebookStorage.enqueuePendingToolSync({
          type: 'ADD_CARD',
          localId: localCardId,
          deckId,
          front: data.front,
          back: data.back,
        });
      }

      return newCard;
    };

    if (!isOnline || isLocalDeck) {
      return await addLocalCard(!isLocalDeck);
    }

    try {
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
    } catch (apiErr: any) {
      console.warn('[notebookToolsStore] addCard API failed, creating locally:', apiErr?.message);
      return await addLocalCard(true);
    }
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
    if (isOnline && !cardId.startsWith('local_card_')) {
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
    await NotebookStorage.removePendingToolSync(cardId);

    const { isOnline } = useSystemStore.getState();
    if (isOnline && !cardId.startsWith('local_card_')) {
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

    get().syncPendingTools().catch(() => {});

    if (!silent) set({ isLoading: true, error: null });

    try {
      const res = await ApiService.quizzes.list(notebookId);
      const serverQuizzes: QuizSummary[] = res.data ?? [];

      const currentList = get().quizzesByNotebook[notebookId] || [];
      const pendingLocalQuizzes = currentList.filter((q) => q.id.startsWith('local_quiz_'));
      const combinedQuizzes = [...pendingLocalQuizzes, ...serverQuizzes];

      set((state) => ({
        quizzesByNotebook: { ...state.quizzesByNotebook, [notebookId]: combinedQuizzes },
      }));
      await NotebookStorage.saveQuizzes(notebookId, combinedQuizzes);

      // Pre-cache individual quiz details
      for (const q of serverQuizzes) {
        if ((q as any).questions && Array.isArray((q as any).questions)) {
          set((state) => ({
            quizDetails: { ...state.quizDetails, [q.id]: q as any },
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

    if (quizId.startsWith('local_quiz_')) {
      if (cached) return cached;
      throw new Error('Local quiz not found.');
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
      const quiz: QuizDetail = res.data;

      if (cached && cached.questions) {
        const localQuestions = cached.questions.filter((q: any) => q.id.startsWith('local_q_'));
        if (localQuestions.length > 0) {
          quiz.questions = [...quiz.questions, ...localQuestions];
          quiz.totalQuestions = quiz.questions.length;
        }
      }

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
      const { isOnline } = useSystemStore.getState();

      const createLocalQuiz = async () => {
        const localId = `local_quiz_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const now = new Date().toISOString();
        const initialQuestions: QuizQuestion[] = (data.questions || []).map((q, idx) => ({
          id: `local_q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 8)}`,
          question: q.question,
          options: q.options || [],
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          explanation: q.explanation ?? null,
        }));

        const newQuiz: QuizDetail = {
          id: localId,
          notebookId,
          title: data.title,
          description: data.description ?? null,
          totalQuestions: initialQuestions.length,
          bestAttempt: null,
          createdAt: now,
          updatedAt: now,
          questions: initialQuestions,
          attempts: [],
        };

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

        await NotebookStorage.enqueuePendingToolSync({
          type: 'CREATE_QUIZ',
          localId,
          notebookId,
          title: data.title,
          description: data.description,
        });

        return newQuiz;
      };

      if (!isOnline) {
        return await createLocalQuiz();
      }

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
      } catch (apiErr: any) {
        console.warn('[notebookToolsStore] createQuiz API failed, creating locally:', apiErr?.message);
        return await createLocalQuiz();
      }
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
    if (isOnline && !quizId.startsWith('local_quiz_')) {
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
    await NotebookStorage.removeQuizDetail(quizId);
    await NotebookStorage.removePendingToolSync(quizId);

    const { isOnline } = useSystemStore.getState();
    if (isOnline && !quizId.startsWith('local_quiz_')) {
      try {
        await ApiService.quizzes.deleteQuiz(quizId);
      } catch (err) {
        console.warn('[notebookToolsStore] deleteQuiz API sync failed:', err);
      }
    }
  },

  addQuestion: async (quizId: string, data) => {
    const { isOnline } = useSystemStore.getState();
    const isLocalQuiz = quizId.startsWith('local_quiz_');

    const addLocalQuestion = async (shouldQueueSync: boolean) => {
      const localQId = `local_q_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const newQ: QuizQuestion = {
        id: localQId,
        question: data.question,
        options: data.options,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation ?? null,
      };

      set((state) => {
        const detail = state.quizDetails[quizId];
        if (!detail) return state;
        const updatedQuestions = [...detail.questions, newQ];
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

      if (shouldQueueSync) {
        await NotebookStorage.enqueuePendingToolSync({
          type: 'ADD_QUESTION',
          localId: localQId,
          quizId,
          question: data.question,
          options: data.options,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation,
        });
      }

      return newQ;
    };

    if (!isOnline || isLocalQuiz) {
      return await addLocalQuestion(!isLocalQuiz);
    }

    try {
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
    } catch (apiErr: any) {
      console.warn('[notebookToolsStore] addQuestion API failed, creating locally:', apiErr?.message);
      return await addLocalQuestion(true);
    }
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
    if (isOnline && !questionId.startsWith('local_q_')) {
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
    await NotebookStorage.removePendingToolSync(questionId);

    const { isOnline } = useSystemStore.getState();
    if (isOnline && !questionId.startsWith('local_q_')) {
      try {
        await ApiService.quizzes.deleteQuestion(questionId);
      } catch (err) {
        console.warn('[notebookToolsStore] deleteQuestion API sync failed:', err);
      }
    }
  },

  submitQuizAttempt: async (quizId: string, answers: number[]) => {
    const { isOnline } = useSystemStore.getState();
    const isLocalQuiz = quizId.startsWith('local_quiz_');

    if (isOnline && !isLocalQuiz) {
      try {
        const res = await ApiService.quizzes.submitAttempt(quizId, answers);
        const result: QuizResult = res.data;

        try {
          await get().fetchQuizDetail(quizId);
        } catch {
          // ignore
        }

        return result;
      } catch (err) {
        console.warn('[notebookToolsStore] submitQuizAttempt API failed, falling back to local grading:', err);
      }
    }

    // Local grading fallback
    const detail = get().quizDetails[quizId];
    const questions = detail?.questions || [];
    let score = 0;
    const results = questions.map((q, idx) => {
      const selected = answers[idx];
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) score++;
      return {
        questionId: q.id,
        question: q.question,
        selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation ?? undefined,
      };
    });

    const localResult: QuizResult = {
      attemptId: `local_attempt_${Date.now()}`,
      score,
      total: questions.length,
      percentage: questions.length > 0 ? Math.round((score / questions.length) * 100) : 0,
      results,
      createdAt: new Date().toISOString(),
    };

    if (detail) {
      const prevBest = detail.bestAttempt?.score ?? -1;
      const newBest =
        score > prevBest
          ? { score, total: questions.length, createdAt: localResult.createdAt }
          : detail.bestAttempt;
      const updatedDetail: QuizDetail = {
        ...detail,
        bestAttempt: newBest,
        attempts: [
          {
            id: localResult.attemptId,
            score,
            total: questions.length,
            answers,
            createdAt: localResult.createdAt,
          },
          ...(detail.attempts || []),
        ],
      };
      set((state) => ({
        quizDetails: { ...state.quizDetails, [quizId]: updatedDetail },
      }));
      await NotebookStorage.saveQuizDetail(quizId, updatedDetail);
    }

    return localResult;
  },
}));

// Automatically trigger sync when the device transitions back online
useSystemStore.subscribe((state, prevState) => {
  if (!prevState.isOnline && state.isOnline) {
    useNotebookToolsStore.getState().syncPendingTools().catch(() => {});
  }
});
