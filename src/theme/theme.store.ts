import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Appearance } from 'react-native';
import { Uniwind } from 'uniwind';
import { ThemeMode } from './tokens';

const THEME_PREF_KEY = 'acadmate_user_theme_preference';

const getNativeSystemScheme = (): 'light' | 'dark' => {
  const current = Appearance.getColorScheme();
  return current === 'dark' ? 'dark' : 'light';
};

const syncUniwindTheme = (theme: ThemeMode) => {
  try {
    if (theme === 'system') {
      Uniwind.setTheme('system');
    } else {
      Uniwind.setTheme(theme);
    }
  } catch {
    // Uniwind sync error ignored
  }
};

interface ThemeState {
  theme: ThemeMode;
  systemColorScheme: 'light' | 'dark';
  isHydrated: boolean;
  setTheme: (theme: ThemeMode) => Promise<void>;
  hydrateTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'system',
  systemColorScheme: getNativeSystemScheme(),
  isHydrated: false,

  setTheme: async (theme: ThemeMode) => {
    set({ theme });
    syncUniwindTheme(theme);
    try {
      await SecureStore.setItemAsync(THEME_PREF_KEY, theme);
    } catch {
      // storage error ignored
    }
  },

  hydrateTheme: async () => {
    try {
      const saved = await SecureStore.getItemAsync(THEME_PREF_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        set({ theme: saved, isHydrated: true });
        syncUniwindTheme(saved);
        return;
      }
    } catch {
      // ignore
    }
    set({ isHydrated: true });
    syncUniwindTheme('system');
  },
}));

// Real-time listener for native OS light/dark mode toggles
Appearance.addChangeListener(({ colorScheme }) => {
  const updatedScheme = colorScheme === 'dark' ? 'dark' : 'light';
  useThemeStore.setState({ systemColorScheme: updatedScheme });

  const currentPref = useThemeStore.getState().theme;
  if (currentPref === 'system') {
    syncUniwindTheme('system');
  }
});

// Kick off hydration
useThemeStore.getState().hydrateTheme();
