import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export interface NotificationPrefs {
  classReminders: boolean;
  taskReminders: boolean;
  examAlerts: boolean;
  studyReminders: boolean;
  eventReminders: boolean;
  classLeadMinutes: number;
  taskLeadMinutes: number;
  examLeadMinutes: number;
  eventLeadMinutes: number;
  studyLeadMinutes: number;
}

interface NotificationState {
  prefs: NotificationPrefs;
  updatePrefs: (newPrefs: Partial<NotificationPrefs>) => void;
  loadPrefs: () => Promise<void>;
}

const PREFS_KEY = 'acadmate.notificationPrefs';

export const useNotificationStore = create<NotificationState>((set, get) => ({
  prefs: {
    classReminders: true,
    taskReminders: true,
    examAlerts: true,
    studyReminders: true,
    eventReminders: true,
    classLeadMinutes: 15,
    taskLeadMinutes: 1440,
    examLeadMinutes: 1440,
    eventLeadMinutes: 15,
    studyLeadMinutes: 15,
  },
  updatePrefs: async (newPrefs) => {
    const updatedPrefs = { ...get().prefs, ...newPrefs };
    set({ prefs: updatedPrefs });
    try {
      await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(updatedPrefs));
    } catch (e) {
      console.warn('Failed to save notification preferences', e);
    }
  },
  loadPrefs: async () => {
    try {
      const raw = await SecureStore.getItemAsync(PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set((state) => ({
          prefs: {
            ...state.prefs,
            ...parsed,
            taskLeadMinutes: parsed.taskLeadMinutes ?? 1440,
            examLeadMinutes: parsed.examLeadMinutes ?? 1440,
            studyLeadMinutes: parsed.studyLeadMinutes ?? 15,
          },
        }));
      }
    } catch (e) {
      console.warn('Failed to load notification preferences', e);
    }
  },
}));

// Automatically load preferences on app startup
useNotificationStore.getState().loadPrefs();
