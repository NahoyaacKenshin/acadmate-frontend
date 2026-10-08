import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { authApi } from './auth.api';
import { ApiError } from '@/src/lib/api';
import { signOutFromGoogle } from '@/src/lib/google-auth';
import type { AuthTokens, AuthUser, LoginInput, SignupInput } from './auth.types';
import { formatAuthErrorMessage } from './auth.error';

const ACCESS_TOKEN_KEY = 'acadmate.accessToken';
const REFRESH_TOKEN_KEY = 'acadmate.refreshToken';
const USER_PROFILE_KEY = 'acadmate.userProfile';

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isRestoring: boolean;
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
  restoreSession: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<'verification-required' | 'authenticated'>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  setSession: (tokens: AuthTokens, user?: AuthUser | null) => Promise<void>;
  setUser: (user: AuthUser | null) => Promise<void>;
};

const saveTokens = async (tokens: AuthTokens) => {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

const saveUser = async (user: AuthUser | null) => {
  if (user) {
    await SecureStore.setItemAsync(USER_PROFILE_KEY, JSON.stringify(user));
  } else {
    await SecureStore.deleteItemAsync(USER_PROFILE_KEY);
  }
};

const clearSessionStorage = async () => {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_PROFILE_KEY);
};

function decodeBase64(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    const index = chars.indexOf(char);
    if (index >= 0 && char !== '=') {
      buffer = (buffer << 6) | index;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        output += String.fromCharCode((buffer >> bits) & 0xff);
      }
    }
  }
  return output;
}

function parseJwtPayload(token: string): { sub?: string; role?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonStr = typeof atob === 'function' ? atob(base64) : decodeBase64(base64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isRestoring: true,
  isLoading: false,
  error: null,

  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),

  setSession: async (tokens, user = null) => {
    await saveTokens(tokens);
    const resolvedUser = user ?? get().user;
    if (resolvedUser) {
      await saveUser(resolvedUser);
    }
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: resolvedUser, error: null });
  },

  setUser: async (user) => {
    if (user) {
      await saveUser(user);
    } else {
      await SecureStore.deleteItemAsync(USER_PROFILE_KEY);
    }
    set({ user });
  },

  restoreSession: async () => {
    set({ isRestoring: true, error: null });

    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      const savedUserStr = await SecureStore.getItemAsync(USER_PROFILE_KEY);

      if (!accessToken || !refreshToken) {
        set({ user: null, accessToken: null, refreshToken: null, isRestoring: false });
        return;
      }

      let restoredUser: AuthUser | null = null;
      if (savedUserStr) {
        try {
          restoredUser = JSON.parse(savedUserStr);
        } catch {
          // ignore json parse error
        }
      }

      // Fallback: extract sub and role from JWT access token if user profile was not yet cached
      if (!restoredUser && accessToken) {
        const payload = parseJwtPayload(accessToken);
        if (payload?.sub) {
          restoredUser = {
            id: payload.sub,
            role: (payload.role as 'USER' | 'ADMIN') || 'USER',
            email: null,
            name: null,
          };
        }
      }

      // Set restored credentials and user immediately so offline features and local DB operations work seamlessly
      set({ accessToken, refreshToken, user: restoredUser });

      try {
        const me = await authApi.getMe(accessToken);
        if (me.data?.user) {
          await saveUser(me.data.user);
          set({ user: me.data.user, isRestoring: false });
        } else {
          set({ isRestoring: false });
        }
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          const refreshed = await get().refreshSession();
          set({ isRestoring: false });

          if (!refreshed) {
            await clearSessionStorage();
            set({ user: null, accessToken: null, refreshToken: null });
          }
        } else {
          // Offline or 5xx server error, keep restored session & cached user intact for offline-first capabilities
          set({ isRestoring: false });
        }
      }
    } catch (error) {
      await clearSessionStorage();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isRestoring: false,
        error: formatAuthErrorMessage(error, 'Unable to restore session'),
      });
    }
  },

  loginWithGoogle: async (idToken: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authApi.loginWithGoogle(idToken);
      const tokens = response.data?.tokens;

      if (!tokens) {
        throw new Error('Google sign-in did not return session tokens');
      }

      await get().setSession(tokens, response.data?.user ?? null);
    } catch (error) {
      const message = formatAuthErrorMessage(error, 'Google sign-in failed. Please try again.');
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ isLoading: false });
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
      const message = formatAuthErrorMessage(
        error,
        'Unable to sign in. Please check your credentials and try again.'
      );
      set({ error: message });
      throw new Error(message);
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
      const message = formatAuthErrorMessage(
        error,
        'Unable to create account. Please try again.'
      );
      set({ error: message });
      throw new Error(message);
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
      await Promise.allSettled([clearSessionStorage(), signOutFromGoogle()]);
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
        await Promise.allSettled([clearSessionStorage(), signOutFromGoogle()]);
        set({ user: null, accessToken: null, refreshToken: null });
      }
      return false;
    }
  },
}));
