import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { PropsWithChildren } from 'react';
import { useColorScheme } from '@/src/components/useColorScheme';
import { AuthGate } from './AuthGate';
import { PowerSyncProvider } from './PowerSyncProvider';
import { NotificationProvider } from './NotificationProvider';
import { AppErrorBoundary } from '@/src/components/common/AppErrorBoundary';

export function AppProviders({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();

  return (
    <AppErrorBoundary>
      <PowerSyncProvider>
        <NotificationProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AuthGate />
            {children}
          </ThemeProvider>
        </NotificationProvider>
      </PowerSyncProvider>
    </AppErrorBoundary>
  );
}


