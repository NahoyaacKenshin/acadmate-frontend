import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { AuthUser } from '@/src/features/auth/auth.types';
import { authApi } from '@/src/features/auth/auth.api';

const STUDENT_SET_KEY = 'acadmate.studentSet';
const ANCHOR_MONDAY_KEY = 'acadmate.anchorMonday';
const ANCHOR_SET_KEY = 'acadmate.anchorSet';
const ONBOARDING_KEY = 'acadmate.onboardingDone';
const NICKNAME_KEY = 'acadmate.nickname';

export type StudentSet = 'A' | 'B' | 'Standard';

/**
 * Returns the YYYY-MM-DD string of the Monday of the given date's week.
 */
export function getMondayOf(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dateNum = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dateNum}`;
}

/**
 * Returns the Date of the upcoming Monday (when the set flips).
 */
export function getNextSetFlipMonday(forDate: Date = new Date()): Date {
  const d = new Date(forDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day === 0 ? 1 : 8) - day; // next Monday
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Computes the active student set for a given date based on anchor Monday and anchor Set.
 * Standard mode is never altered and always returns 'Standard'.
 */
export function computeCurrentSet(
  studentSet: StudentSet | null,
  anchorMonday: string | null,
  anchorSet: 'A' | 'B' | null,
  forDate: Date | string = new Date()
): StudentSet | null {
  if (!studentSet || studentSet === 'Standard') {
    return studentSet;
  }
  if (!anchorMonday || !anchorSet) {
    return studentSet;
  }

  const targetDate = typeof forDate === 'string' ? new Date(forDate) : new Date(forDate);
  const targetMondayStr = getMondayOf(targetDate);

  const [aY, aM, aD] = anchorMonday.split('-').map(Number);
  const anchorTime = Date.UTC(aY, aM - 1, aD);

  const [tY, tM, tD] = targetMondayStr.split('-').map(Number);
  const targetTime = Date.UTC(tY, tM - 1, tD);

  const msDiff = targetTime - anchorTime;
  const weeksDiff = Math.floor(msDiff / (7 * 24 * 60 * 60 * 1000));

  const isOdd = Math.abs(weeksDiff) % 2 === 1;
  if (!isOdd) {
    return anchorSet;
  } else {
    return anchorSet === 'A' ? 'B' : 'A';
  }
}

type UserState = {
  studentSet: StudentSet | null;
  anchorMonday: string | null;
  anchorSet: 'A' | 'B' | null;
  nickname: string | null;
  hasCompletedOnboarding: boolean;
  isLoaded: boolean;
  loadUserPreferences: () => Promise<void>;
  syncFromAuthUser: (user: AuthUser) => Promise<void>;
  setStudentSet: (studentSet: StudentSet) => Promise<void>;
  setNickname: (nickname: string) => Promise<void>;
  completeOnboarding: (studentSet?: StudentSet) => Promise<void>;
  clearUserPreferences: () => Promise<void>;
};

export const useUserStore = create<UserState>((set, get) => ({
  studentSet: null,
  anchorMonday: null,
  anchorSet: null,
  nickname: null,
  hasCompletedOnboarding: false,
  isLoaded: false,

  loadUserPreferences: async () => {
    try {
      const studentSetRaw = await SecureStore.getItemAsync(STUDENT_SET_KEY);
      const anchorMondayRaw = await SecureStore.getItemAsync(ANCHOR_MONDAY_KEY);
      const anchorSetRaw = await SecureStore.getItemAsync(ANCHOR_SET_KEY);
      const onboardingRaw = await SecureStore.getItemAsync(ONBOARDING_KEY);
      const nickname = await SecureStore.getItemAsync(NICKNAME_KEY);

      const studentSet: StudentSet | null = (studentSetRaw === 'A' || studentSetRaw === 'B' || studentSetRaw === 'Standard') ? studentSetRaw : null;
      let anchorMonday = anchorMondayRaw || null;
      let anchorSet: 'A' | 'B' | null = (anchorSetRaw === 'A' || anchorSetRaw === 'B') ? anchorSetRaw : null;

      // If user had Set A or B saved but no anchor yet, establish anchor as current Monday
      if ((studentSet === 'A' || studentSet === 'B') && (!anchorMonday || !anchorSet)) {
        anchorMonday = getMondayOf(new Date());
        anchorSet = studentSet;
        await SecureStore.setItemAsync(ANCHOR_MONDAY_KEY, anchorMonday);
        await SecureStore.setItemAsync(ANCHOR_SET_KEY, anchorSet);
      }

      const hasCompletedOnboarding = onboardingRaw === 'true';

      set({
        studentSet,
        anchorMonday,
        anchorSet,
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
   * don't re-prompt the user for onboarding. If the backend indicates
   * onboarding is NOT completed, we clear local onboarding flags so
   * newly created accounts are prompted for onboarding even if a
   * previous account had been used on the same device.
   */
  syncFromAuthUser: async (user: AuthUser) => {
    try {
      const localCompleted = get().hasCompletedOnboarding;
      const backendCompleted = user.hasCompletedOnboarding === true;

      if (backendCompleted || localCompleted) {
        // Persist backend state locally
        await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
        let currentAnchorMonday = get().anchorMonday;
        let currentAnchorSet = get().anchorSet;

        if (user.studentSet) {
          await SecureStore.setItemAsync(STUDENT_SET_KEY, user.studentSet);
          if (user.studentSet === 'A' || user.studentSet === 'B') {
            if (!currentAnchorMonday || !currentAnchorSet) {
              currentAnchorMonday = getMondayOf(new Date());
              currentAnchorSet = user.studentSet;
              await SecureStore.setItemAsync(ANCHOR_MONDAY_KEY, currentAnchorMonday);
              await SecureStore.setItemAsync(ANCHOR_SET_KEY, currentAnchorSet);
            }
          }
        }
        let resolvedNickname = get().nickname;
        if (!resolvedNickname && user.name) {
          resolvedNickname = user.name;
          await SecureStore.setItemAsync(NICKNAME_KEY, resolvedNickname);
        }

        set({
          hasCompletedOnboarding: true,
          nickname: resolvedNickname,
          studentSet: (user.studentSet as StudentSet) ?? get().studentSet,
          anchorMonday: currentAnchorMonday,
          anchorSet: currentAnchorSet,
          isLoaded: true,
        });

        // If completed locally but backend is still false, sync completion to backend in background
        if (localCompleted && !backendCompleted) {
          const { useAuthStore } = await import('@/src/features/auth/auth.store');
          const token = useAuthStore.getState().accessToken;
          authApi.updateMe({ hasCompletedOnboarding: true }, token).then((res) => {
            if (res.data?.user) {
              useAuthStore.getState().setUser(res.data.user);
            }
          }).catch((err) => {
            console.warn('[userStore] Background onboarding sync error:', err);
          });
        }
      } else {
        // Neither backend nor local completed -> genuinely a fresh new account
        await SecureStore.deleteItemAsync(ONBOARDING_KEY);
        await SecureStore.deleteItemAsync(NICKNAME_KEY);
        await SecureStore.deleteItemAsync(STUDENT_SET_KEY);
        await SecureStore.deleteItemAsync(ANCHOR_MONDAY_KEY);
        await SecureStore.deleteItemAsync(ANCHOR_SET_KEY);

        set({
          hasCompletedOnboarding: false,
          nickname: user.name ?? null,
          studentSet: (user.studentSet as StudentSet) ?? null,
          anchorMonday: null,
          anchorSet: null,
          isLoaded: true,
        });
      }
    } catch (e) {
      console.warn('syncFromAuthUser failed:', e);
    }
  },

  setStudentSet: async (studentSet) => {
    await SecureStore.setItemAsync(STUDENT_SET_KEY, studentSet);
    if (studentSet === 'A' || studentSet === 'B') {
      const monday = getMondayOf(new Date());
      await SecureStore.setItemAsync(ANCHOR_MONDAY_KEY, monday);
      await SecureStore.setItemAsync(ANCHOR_SET_KEY, studentSet);
      set({ studentSet, anchorMonday: monday, anchorSet: studentSet });
    } else {
      await SecureStore.deleteItemAsync(ANCHOR_MONDAY_KEY);
      await SecureStore.deleteItemAsync(ANCHOR_SET_KEY);
      set({ studentSet, anchorMonday: null, anchorSet: null });
    }
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
      const currentNickname = get().nickname;
      if (currentNickname) body.name = currentNickname;

      // Optimistically update AuthStore so AuthGate and the UI reflect completion immediately
      const { useAuthStore } = await import('@/src/features/auth/auth.store');
      const currentUser = useAuthStore.getState().user;
      const token = useAuthStore.getState().accessToken;
      if (currentUser) {
        await useAuthStore.getState().setUser({
          ...currentUser,
          hasCompletedOnboarding: true,
          studentSet: studentSet ?? currentUser.studentSet,
          name: currentNickname ?? currentUser.name,
        });
      }

      const res = await authApi.updateMe(body, token);
      if (res.data?.user) {
        await useAuthStore.getState().setUser(res.data.user);
      }
    } catch (e) {
      // Non-fatal: local storage has it covered; backend sync is best-effort
      console.warn('Failed to sync onboarding completion to backend:', e);
    }
  },

  clearUserPreferences: async () => {
    try {
      await SecureStore.deleteItemAsync(STUDENT_SET_KEY);
      await SecureStore.deleteItemAsync(ANCHOR_MONDAY_KEY);
      await SecureStore.deleteItemAsync(ANCHOR_SET_KEY);
      await SecureStore.deleteItemAsync(ONBOARDING_KEY);
      await SecureStore.deleteItemAsync(NICKNAME_KEY);
    } catch (e) {
      console.warn('Failed to clear user preferences from storage:', e);
    } finally {
      set({
        studentSet: null,
        anchorMonday: null,
        anchorSet: null,
        nickname: null,
        hasCompletedOnboarding: false,
      });
    }
  },
}));

// Automatically load preferences on app startup
useUserStore.getState().loadUserPreferences();
