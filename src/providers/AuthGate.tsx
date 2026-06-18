import { useRouter, useSegments, type Href } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/src/features/auth/auth.store';

export function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { accessToken, isRestoring, restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (isRestoring) return;

    const routeGroup = segments[0] as string | undefined;
    const inAuthGroup = routeGroup === '(auth)';

    if (!accessToken && !inAuthGroup) {
      router.replace('/login' as Href);
    }

    if (accessToken && inAuthGroup) {
      router.replace('/');
    }
  }, [accessToken, isRestoring, router, segments]);

  return null;
}
