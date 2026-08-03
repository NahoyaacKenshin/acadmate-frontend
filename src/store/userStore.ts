import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const USER_PROGRAM_KEY = 'acadmate.userProgram';
const STUDENT_SET_KEY = 'acadmate.studentSet';
const ONBOARDING_KEY = 'acadmate.onboardingDone';
const NICKNAME_KEY = 'acadmate.nickname';

type UserState = {
  programName: string | null;
  studentSet: 'A' | 'B' | null;
  nickname: string | null;
  hasCompletedOnboarding: boolean;
  isLoaded: boolean;
  loadUserPreferences: () => Promise<void>;
  setProgram: (programName: string, studentSet?: 'A' | 'B' | null) => Promise<void>;
  setStudentSet: (studentSet: 'A' | 'B') => Promise<void>;
  setNickname: (nickname: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

export const useUserStore = create<UserState>((set, get) => ({
  programName: null,
  studentSet: null,
  nickname: null,
  hasCompletedOnboarding: false,
  isLoaded: false,

  loadUserPreferences: async () => {
    try {
      const programName = await SecureStore.getItemAsync(USER_PROGRAM_KEY);
      const studentSetRaw = await SecureStore.getItemAsync(STUDENT_SET_KEY);
      const onboardingRaw = await SecureStore.getItemAsync(ONBOARDING_KEY);
      const nickname = await SecureStore.getItemAsync(NICKNAME_KEY);

      const studentSet = (studentSetRaw === 'A' || studentSetRaw === 'B') ? studentSetRaw : null;
      const hasCompletedOnboarding = onboardingRaw === 'true';

      set({
        programName: programName || null,
        studentSet,
        nickname: nickname || null,
        hasCompletedOnboarding,
        isLoaded: true,
      });
    } catch {
      set({ isLoaded: true });
    }
  },

  setProgram: async (programName, studentSet = null) => {
    await SecureStore.setItemAsync(USER_PROGRAM_KEY, programName);
    set({ programName });

    if (studentSet) {
      await SecureStore.setItemAsync(STUDENT_SET_KEY, studentSet);
      set({ studentSet });
    }
  },

  setStudentSet: async (studentSet) => {
    await SecureStore.setItemAsync(STUDENT_SET_KEY, studentSet);
    set({ studentSet });
  },

  setNickname: async (nickname) => {
    await SecureStore.setItemAsync(NICKNAME_KEY, nickname.trim());
    set({ nickname: nickname.trim() });
  },

  completeOnboarding: async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    set({ hasCompletedOnboarding: true });
  },
}));

// Automatically load preferences on app startup
useUserStore.getState().loadUserPreferences();
