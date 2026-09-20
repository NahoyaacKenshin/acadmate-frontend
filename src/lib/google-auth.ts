import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

/**
 * Configure Google Sign-In. Call this once at app startup (e.g., in _layout.tsx).
 * webClientId = the Web Client ID from Google Cloud Console (NOT the Android/iOS client ID).
 */
export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    // Request offline access so the server can verify the idToken
    offlineAccess: false,
  });
}

/**
 * Opens the native Google Sign-In dialog.
 * @returns The Google ID token string on success.
 * @throws A user-friendly error string on failure.
 */
export async function promptGoogleSignIn(): Promise<string> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    // The idToken is inside response.data in the newer API versions
    const idToken = response.data?.idToken;

    if (!idToken) {
      throw new Error('No ID token returned from Google Sign-In. Please try again.');
    }

    return idToken;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code: string }).code;

      if (code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('CANCELLED');
      }
      if (code === statusCodes.IN_PROGRESS) {
        throw new Error('A sign-in is already in progress. Please wait.');
      }
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services is not available on this device.');
      }
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Google Sign-In failed. Please try again.');
  }
}

/**
 * Signs the user out of Google (clears cached credentials on the device).
 * Should be called alongside your own app logout.
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Non-critical: ignore errors from Google sign-out
  }
}
