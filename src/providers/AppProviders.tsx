import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { PropsWithChildren } from 'react';
import { useTheme } from '@/src/theme/useTheme';
import { AuthGate } from './AuthGate';
import { PowerSyncProvider } from './PowerSyncProvider';
import { NotificationProvider } from './NotificationProvider';
import { AppErrorBoundary } from '@/src/components/common/AppErrorBoundary';

export function AppProviders({ children }: PropsWithChildren) {
  const { colorScheme } = useTheme();

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


