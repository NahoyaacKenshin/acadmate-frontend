// MUST BE THE VERY FIRST IMPORTS
import '@azure/core-asynciterator-polyfill';
import '../global.css';

import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase } from '@powersync/react-native'; // Keep this core import
import { BackendConnector } from '../src/db/PowerSyncConnector';
import { AppSchema } from '../src/db/Schema';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  // 1. Initialize local SQLite instance cleanly
  // Pass the filename configuration directly. PowerSync resolves the peer Quick-SQLite bindings natively.
  const powerSync = useMemo(() => {
    return new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'acadmate_local.db'
      }
    });
  }, []);

  // 2. Synchronize connection lifecycle with your Express backend stream
  useEffect(() => {
    const initializeSync = async () => {
      const userJwtToken = "YOUR_JWT_STRING_FROM_SIGNUP_OR_LOGIN";
      const connector = new BackendConnector(userJwtToken);
      
      await powerSync.init();
      await powerSync.connect(connector);
    };
    
    initializeSync();
  }, [powerSync]);

  return (
    // 3. Nest your context provider right above your router tree
    <PowerSyncContext.Provider value={powerSync}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </PowerSyncContext.Provider>
  );
}