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

    // Explicitly clear any existing Google session cache so that Google Play Services / iOS
    // always presents the native Account Chooser dialog, allowing the user to select an account.
    try {
      await GoogleSignin.signOut();
    } catch {
      // Non-critical: ignore if no user was signed in
    }

    const response = await GoogleSignin.signIn();

    // The idToken is inside response.data in the newer API versions
    const idToken = response.data?.idToken;

    if (!idToken) {
      throw new Error('No ID token returned from Google Sign-In. Please try again.');
    }

    return idToken;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = String((error as { code: string | number }).code);

      if (code === statusCodes.SIGN_IN_CANCELLED || code === '12501') {
        throw new Error('CANCELLED');
      }
      if (code === statusCodes.IN_PROGRESS) {
        throw new Error('A sign-in is already in progress. Please wait.');
      }
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services is not available on this device.');
      }
      // Status code 7 is NETWORK_ERROR in Google Play Services
      if (
        code === '7' ||
        code === 'NETWORK_ERROR' ||
        (statusCodes as any).NETWORK_ERROR === code
      ) {
        throw new Error('No internet connection. Please check your Wi-Fi or cellular data and try again.');
      }
    }

    const rawMessage = (error as any)?.message ? String((error as any).message) : '';
    const lowerMsg = rawMessage.toLowerCase();
    if (
      lowerMsg.includes('network') ||
      lowerMsg.includes('offline') ||
      lowerMsg.includes('internet') ||
      lowerMsg.includes('connection') ||
      lowerMsg.includes('failed to connect') ||
      lowerMsg.includes('timeout')
    ) {
      throw new Error('No internet connection. Please check your Wi-Fi or cellular data and try again.');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(rawMessage || 'Google Sign-In failed. Please check your internet connection.');
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
