import { useRouter, useSegments, type Href } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useUserStore } from '@/src/store/userStore';

export function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { accessToken, user, isRestoring, restoreSession } = useAuthStore();
  const { hasCompletedOnboarding, isLoaded: isUserStoreLoaded, loadUserPreferences } = useUserStore();

  useEffect(() => {
    restoreSession();
    loadUserPreferences();
  }, [restoreSession, loadUserPreferences]);

  useEffect(() => {
    if (isRestoring || !isUserStoreLoaded) return;

    const routeGroup = segments[0] as string | undefined;
    const inAuthGroup = routeGroup === '(auth)';
    const isOnboarding = routeGroup === 'onboarding';

    // 1. Unauthenticated users -> Redirect to Login
    if (!accessToken && !inAuthGroup) {
      router.replace('/login' as Href);
      return;
    }

    // 2. Authenticated Admin users -> Redirect away from Auth and Onboarding to App
    if (accessToken && user?.role === 'ADMIN') {
      if (inAuthGroup || isOnboarding) {
        router.replace('/' as Href);
      }
      return;
    }

    // 3. Authenticated Student users
    if (accessToken && user?.role !== 'ADMIN') {
      if (!hasCompletedOnboarding && !isOnboarding) {
        // Fresh student -> Redirect to Onboarding
        router.replace('/onboarding' as Href);
      } else if (hasCompletedOnboarding && (inAuthGroup || isOnboarding)) {
        // Completed student on Auth or Onboarding -> Redirect to App
        router.replace('/' as Href);
      }
    }
  }, [accessToken, user, isRestoring, isUserStoreLoaded, hasCompletedOnboarding, router, segments]);

  return null;
}
