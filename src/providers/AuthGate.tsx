import { useRouter, useSegments, type Href } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useUserStore } from '@/src/store/userStore';

export function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { accessToken, user, isRestoring, restoreSession } = useAuthStore();
  const { hasCompletedOnboarding, isLoaded: isUserStoreLoaded, loadUserPreferences, syncFromAuthUser } = useUserStore();

  useEffect(() => {
    restoreSession();
    loadUserPreferences();
  }, [restoreSession, loadUserPreferences]);

  // When the backend user profile loads, sync onboarding state locally
  // so fresh installs for existing users won't re-prompt onboarding
  useEffect(() => {
    if (user) {
      syncFromAuthUser(user);
    }
  }, [user, syncFromAuthUser]);

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

    // 2. Authenticated users
    if (accessToken) {
      // If either local store or backend user profile confirms onboarding is done,
      // the user has completed onboarding and must NEVER be kicked back to /onboarding!
      const completedOnboarding =
        user?.hasCompletedOnboarding === true || hasCompletedOnboarding === true;
      if (!completedOnboarding && !isOnboarding) {
        // Fresh student -> Redirect to Onboarding
        router.replace('/onboarding' as Href);
      } else if (completedOnboarding && (inAuthGroup || isOnboarding)) {
        // Completed student on Auth or Onboarding -> Redirect to App
        router.replace('/' as Href);
      }
    }
  }, [accessToken, isRestoring, isUserStoreLoaded, hasCompletedOnboarding, user, router, segments]);

  return null;
}
