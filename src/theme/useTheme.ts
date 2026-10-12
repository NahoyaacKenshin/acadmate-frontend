import { useColorScheme } from 'react-native';
import { useThemeStore } from './theme.store';
import { ThemeColors, lightColors, darkColors, ThemeMode } from './tokens';

export function useTheme() {
  const { theme, systemColorScheme, setTheme } = useThemeStore();
  const rnScheme = useColorScheme();

  const activeSystemScheme: 'light' | 'dark' =
    rnScheme === 'dark' || rnScheme === 'light'
      ? rnScheme
      : systemColorScheme;

  const resolvedScheme: 'light' | 'dark' =
    theme === 'system'
      ? activeSystemScheme
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
