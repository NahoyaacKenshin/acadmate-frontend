import { useColorScheme as useRNColorScheme } from 'react-native';
import { useThemeStore } from './theme.store';
import { ThemeColors, lightColors, darkColors, ThemeMode } from './tokens';

export function useTheme() {
  const { theme, systemColorScheme, setTheme } = useThemeStore();
  const rnScheme = useRNColorScheme();

  // If theme is 'system', prioritize react-native hook if defined, fallback to store-tracked systemScheme
  const effectiveSystemScheme: 'light' | 'dark' =
    rnScheme === 'dark' || rnScheme === 'light'
      ? rnScheme
      : systemColorScheme;

  const resolvedScheme: 'light' | 'dark' =
    theme === 'system'
      ? effectiveSystemScheme
      : theme;

  const isDark = resolvedScheme === 'dark';
  const colors: ThemeColors = isDark ? darkColors : lightColors;

  return {
    theme,
    colorScheme: resolvedScheme,
    isDark,
    colors,
    setTheme,
  };
}
