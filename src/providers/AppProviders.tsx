import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { PropsWithChildren } from 'react';
import { useColorScheme } from '@/src/components/useColorScheme';
import { AuthGate } from './AuthGate';
import { PowerSyncProvider } from './PowerSyncProvider';

export function AppProviders({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();

  return (
    <PowerSyncProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthGate />
        {children}
      </ThemeProvider>
    </PowerSyncProvider>
  );
}
