import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { authApi } from './auth.api';
import { ApiError } from '@/src/lib/api';
import type { AuthTokens, AuthUser, LoginInput, SignupInput } from './auth.types';

const ACCESS_TOKEN_KEY = 'acadmate.accessToken';
const REFRESH_TOKEN_KEY = 'acadmate.refreshToken';

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isRestoring: boolean;
  isLoading: boolean;
  error: string | null;
  restoreSession: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<'verification-required' | 'authenticated'>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  setSession: (tokens: AuthTokens, user?: AuthUser | null) => Promise<void>;
};

const saveTokens = async (tokens: AuthTokens) => {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

const clearTokens = async () => {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isRestoring: true,
  isLoading: false,
  error: null,

  setSession: async (tokens, user = null) => {
    await saveTokens(tokens);
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user, error: null });
  },

  restoreSession: async () => {
    set({ isRestoring: true, error: null });

    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      if (!accessToken || !refreshToken) {
        set({ user: null, accessToken: null, refreshToken: null, isRestoring: false });
        return;
      }

      set({ accessToken, refreshToken });

      try {
        const me = await authApi.getMe(accessToken);
        set({ user: me.data?.user ?? null, isRestoring: false });
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          const refreshed = await get().refreshSession();
          set({ isRestoring: false });

          if (!refreshed) {
            await clearTokens();
            set({ user: null, accessToken: null, refreshToken: null });
          }
        } else {
          // Offline or 5xx server error, keep session intact for offline-first capabilities
          set({ isRestoring: false });
        }
      }
    } catch (error) {
      await clearTokens();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isRestoring: false,
        error: error instanceof Error ? error.message : 'Unable to restore session',
      });
    }
  },

  login: async (input) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authApi.login(input);
      const tokens = response.data?.tokens;

      if (!tokens) {
        throw new Error('Login response did not include tokens');
      }

      await get().setSession(tokens, response.data?.user ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log in';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (input) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authApi.signup(input);
      const tokens = response.data?.tokens;

      if (!tokens) {
        return 'verification-required';
      }

      await get().setSession(tokens, response.data?.user ?? null);
      return 'authenticated';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign up';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const refreshToken = get().refreshToken;
    set({ isLoading: true, error: null });

    try {
      await authApi.logout(refreshToken);
    } catch {
      // Local logout should still succeed if the backend is unreachable.
    } finally {
      await clearTokens();
      set({ user: null, accessToken: null, refreshToken: null, isLoading: false });
    }
  },

  refreshSession: async () => {
    const refreshToken = get().refreshToken;

    if (!refreshToken) {
      return false;
    }

    try {
      const response = await authApi.refresh(refreshToken);
      const tokens = response.data?.tokens;

      if (!tokens) {
        return false;
      }

      await get().setSession(tokens, response.data?.user ?? get().user);
      return true;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await clearTokens();
        set({ user: null, accessToken: null, refreshToken: null });
      }
      return false;
    }
  },
}));
