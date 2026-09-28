import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { AuthUser } from '@/src/features/auth/auth.types';
import { authApi } from '@/src/features/auth/auth.api';

const USER_PROGRAM_KEY = 'acadmate.userProgram';
const STUDENT_SET_KEY = 'acadmate.studentSet';
const ONBOARDING_KEY = 'acadmate.onboardingDone';
const NICKNAME_KEY = 'acadmate.nickname';

export type StudentSet = 'A' | 'B' | 'Standard';

type UserState = {
  programName: string | null;
  studentSet: StudentSet | null;
  nickname: string | null;
  hasCompletedOnboarding: boolean;
  isLoaded: boolean;
  loadUserPreferences: () => Promise<void>;
  syncFromAuthUser: (user: AuthUser) => Promise<void>;
  setProgram: (programName: string, studentSet?: StudentSet | null) => Promise<void>;
  setStudentSet: (studentSet: StudentSet) => Promise<void>;
  setNickname: (nickname: string) => Promise<void>;
  completeOnboarding: (studentSet?: StudentSet) => Promise<void>;
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

      const studentSet: StudentSet | null = (studentSetRaw === 'A' || studentSetRaw === 'B' || studentSetRaw === 'Standard') ? studentSetRaw : null;
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

  /**
   * Syncs user preferences from the backend AuthUser profile.
   * Called after login and session restore. If the backend indicates
   * onboarding was completed, we persist it locally so reinstalls
   * don't re-prompt the user for onboarding.
   */
  syncFromAuthUser: async (user: AuthUser) => {
    try {
      const backendCompleted = user.hasCompletedOnboarding === true;

      if (backendCompleted) {
        // Persist backend state locally
        await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
        if (user.studentSet) {
          await SecureStore.setItemAsync(STUDENT_SET_KEY, user.studentSet);
        }
        if (user.programName) {
          await SecureStore.setItemAsync(USER_PROGRAM_KEY, user.programName);
        }
        set({
          hasCompletedOnboarding: true,
          studentSet: (user.studentSet as StudentSet) ?? get().studentSet,
          programName: user.programName ?? get().programName,
          isLoaded: true,
        });
      }
    } catch (e) {
      console.warn('syncFromAuthUser failed:', e);
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

  completeOnboarding: async (studentSet?: StudentSet) => {
    // Persist locally
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    set({ hasCompletedOnboarding: true });

    // Persist to backend so it survives reinstalls
    try {
      const body: Record<string, unknown> = { hasCompletedOnboarding: true };
      if (studentSet) body.studentSet = studentSet;
      const currentProgram = get().programName;
      if (currentProgram) body.programName = currentProgram;
      const res = await authApi.updateMe(body);
      if (res.data?.user) {
        const { useAuthStore } = await import('@/src/features/auth/auth.store');
        await useAuthStore.getState().setUser(res.data.user);
      }
    } catch (e) {
      // Non-fatal: local storage has it covered; backend sync is best-effort
      console.warn('Failed to sync onboarding completion to backend:', e);
    }
  },
}));

// Automatically load preferences on app startup
useUserStore.getState().loadUserPreferences();
