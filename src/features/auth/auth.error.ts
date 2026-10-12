export const USER_FRIENDLY_NETWORK_ERROR =
  'No internet connection. Please check your Wi-Fi or mobile data and try again.';

export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const raw =
    typeof error === 'string'
      ? error
      : (error as any)?.message || (error as any)?.toString?.() || '';
  const lower = raw.toLowerCase();

  const code = (error as any)?.code ? String((error as any).code) : '';

  // Google Play Services status codes (7: NETWORK_ERROR, 12500: SIGN_IN_FAILED, 8: INTERNAL_ERROR)
  if (code === '7' || code === 'NETWORK_ERROR' || code === '12500' || code === '8') {
    return true;
  }

  // Common network error strings and native exceptions
  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('network error') ||
    lower.includes('net::') ||
    lower.includes('offline') ||
    lower.includes('internet') ||
    lower.includes('connection') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('failed to connect') ||
    lower.includes('unable to resolve host') ||
    lower.includes('sockettimeoutexception') ||
    lower.includes('connectexception') ||
    lower.includes('unknownhostexception') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('ehostunreach') ||
    lower.includes('apiexception: 7') ||
    lower.includes('apiexception: 12500') ||
    lower.includes('apiexception: 8') ||
    lower.includes('sign_in_failed') ||
    lower.startsWith('7:') ||
    lower.startsWith('12500:') ||
    lower.startsWith('8:')
  ) {
    return true;
  }

  return false;
}

export function formatAuthErrorMessage(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred. Please try again.'
): string {
  if (isNetworkError(error)) {
    return USER_FRIENDLY_NETWORK_ERROR;
  }

  if (error instanceof Error) {
    if (error.message && error.message.trim().length > 0) {
      if (error.message.includes('ApiException:')) {
        return USER_FRIENDLY_NETWORK_ERROR;
      }
      return error.message;
    }
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return fallbackMessage;
}
