import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Appearance, AppState, type AppStateStatus } from 'react-native';
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
  theme: 'light',
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
    const systemScheme = getNativeSystemScheme();
    try {
      const saved = await SecureStore.getItemAsync(THEME_PREF_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        set({ theme: saved, systemColorScheme: systemScheme, isHydrated: true });
        syncUniwindTheme(saved);
        return;
      }
    } catch {
      // ignore
    }
    set({ theme: 'light', systemColorScheme: systemScheme, isHydrated: true });
    syncUniwindTheme('light');
  },
}));

// Real-time listener for native OS light/dark mode toggles (e.g. quick settings shade)
Appearance.addChangeListener(({ colorScheme }) => {
  const updatedScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const state = useThemeStore.getState();
  if (state.systemColorScheme !== updatedScheme) {
    useThemeStore.setState({ systemColorScheme: updatedScheme });
  }
});

// AppState listener for when user changes system theme in Settings and returns to app
AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
  if (nextAppState === 'active') {
    const currentScheme = getNativeSystemScheme();
    const state = useThemeStore.getState();
    if (state.systemColorScheme !== currentScheme) {
      useThemeStore.setState({ systemColorScheme: currentScheme });
    }
  }
});

// Kick off hydration
useThemeStore.getState().hydrateTheme();
