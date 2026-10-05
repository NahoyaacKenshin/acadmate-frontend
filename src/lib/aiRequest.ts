import { useSystemStore } from '@/src/store/systemStore';
import { useAuthStore } from '@/src/features/auth/auth.store';

export type AIErrorType =
  | 'OFFLINE'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'AUTH_EXPIRED'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_TYPE'
  | 'RATE_LIMITED'
  | 'AI_BUSY'
  | 'GATEWAY_TIMEOUT'
  | 'SERVER'
  | 'EMPTY_RESULT'
  | 'UNKNOWN';

export interface ClassifiedAIError {
  type: AIErrorType;
  message: string;
  retryable: boolean;
  raw?: unknown;
}

export const AI_ERROR_MESSAGES: Record<AIErrorType, { message: string; retryable: boolean }> = {
  OFFLINE: {
    message: "You're offline. Please connect to the internet and try again.",
    retryable: true,
  },
  TIMEOUT: {
    message: 'The request took too long. Check your connection and try again.',
    retryable: true,
  },
  CANCELLED: {
    message: 'Operation was cancelled.',
    retryable: false,
  },
  AUTH_EXPIRED: {
    message: 'Your session has expired. Please sign in again.',
    retryable: false,
  },
  FILE_TOO_LARGE: {
    message: 'Your file exceeds the 10 MB limit. Please select a smaller file.',
    retryable: false,
  },
  UNSUPPORTED_TYPE: {
    message: 'That file type is not supported. Please use a PDF, Word doc, or image.',
    retryable: false,
  },
  RATE_LIMITED: {
    message: 'AI service rate limit reached. Please wait a moment before trying again.',
    retryable: true,
  },
  AI_BUSY: {
    message: 'The AI service is temporarily busy. Please try again in a moment.',
    retryable: true,
  },
  GATEWAY_TIMEOUT: {
    message: 'Server took too long to respond. Please try again.',
    retryable: true,
  },
  SERVER: {
    message: 'Server error encountered. Please try again later.',
    retryable: true,
  },
  EMPTY_RESULT: {
    message: "We couldn't detect any classes or schedule dates in this document. Please ensure the file is clear and right-side up.",
    retryable: true,
  },
  UNKNOWN: {
    message: 'Something went wrong. Please check your connection and try again.',
    retryable: true,
  },
};

/**
 * Checks if device is currently online based on system store.
 * Throws a classified OFFLINE error if offline.
 */
export function assertOnline(): void {
  const isOnline = useSystemStore.getState().isOnline;
  if (!isOnline) {
    const info = AI_ERROR_MESSAGES.OFFLINE;
    const err = new Error(info.message);
    (err as any).type = 'OFFLINE';
    throw err;
  }
}

/**
 * Classifies an error into a structured AI error with friendly user-facing message.
 */
export function classifyError(err: unknown, status?: number): ClassifiedAIError {
  const errStr = err instanceof Error ? err.message : String(err);
  const lower = errStr.toLowerCase();

  // Explicit type attached
  if ((err as any)?.type && AI_ERROR_MESSAGES[(err as any).type as AIErrorType]) {
    const t = (err as any).type as AIErrorType;
    return { type: t, message: AI_ERROR_MESSAGES[t].message, retryable: AI_ERROR_MESSAGES[t].retryable, raw: err };
  }

  // Cancelled
  if (lower.includes('cancel') || lower.includes('abort')) {
    return { type: 'CANCELLED', message: AI_ERROR_MESSAGES.CANCELLED.message, retryable: false, raw: err };
  }

  // Offline / Network failure
  if (
    lower.includes('network request failed') ||
    lower.includes('unable to resolve host') ||
    lower.includes('offline') ||
    lower.includes('failed to connect') ||
    lower.includes('enotfound')
  ) {
    return { type: 'OFFLINE', message: AI_ERROR_MESSAGES.OFFLINE.message, retryable: true, raw: err };
  }

  // Timeout
  if (lower.includes('timeout') || lower.includes('timed out') || status === 504) {
    const t = status === 504 ? 'GATEWAY_TIMEOUT' : 'TIMEOUT';
    return { type: t, message: AI_ERROR_MESSAGES[t].message, retryable: true, raw: err };
  }

  // HTTP Status Checks
  if (status === 401 || lower.includes('401') || lower.includes('unauthorized') || lower.includes('jwt expired')) {
    return { type: 'AUTH_EXPIRED', message: AI_ERROR_MESSAGES.AUTH_EXPIRED.message, retryable: false, raw: err };
  }

  if (status === 413 || lower.includes('413') || lower.includes('too large') || lower.includes('payload too large')) {
    return { type: 'FILE_TOO_LARGE', message: AI_ERROR_MESSAGES.FILE_TOO_LARGE.message, retryable: false, raw: err };
  }

  if (status === 415 || lower.includes('415') || lower.includes('unsupported') || lower.includes('unsupported file type')) {
    return { type: 'UNSUPPORTED_TYPE', message: AI_ERROR_MESSAGES.UNSUPPORTED_TYPE.message, retryable: false, raw: err };
  }

  if (status === 429 || lower.includes('429') || lower.includes('rate limit') || lower.includes('quota')) {
    return { type: 'RATE_LIMITED', message: AI_ERROR_MESSAGES.RATE_LIMITED.message, retryable: true, raw: err };
  }

  if (status === 503 || lower.includes('503') || lower.includes('ai service is temporarily busy') || lower.includes('cascade exhausted')) {
    return { type: 'AI_BUSY', message: AI_ERROR_MESSAGES.AI_BUSY.message, retryable: true, raw: err };
  }

  if (status && status >= 500) {
    return { type: 'SERVER', message: AI_ERROR_MESSAGES.SERVER.message, retryable: true, raw: err };
  }

  if (lower.includes('empty') || lower.includes('no readable text') || lower.includes('no classes')) {
    return { type: 'EMPTY_RESULT', message: AI_ERROR_MESSAGES.EMPTY_RESULT.message, retryable: true, raw: err };
  }

  return {
    type: 'UNKNOWN',
    message: errStr.length > 0 && errStr.length < 120 ? errStr : AI_ERROR_MESSAGES.UNKNOWN.message,
    retryable: true,
    raw: err,
  };
}

/**
 * Shared in-flight session refresh promise to prevent refresh stampedes
 */
let inFlightRefresh: Promise<boolean> | null = null;

export async function getValidAccessToken(): Promise<string | null> {
  const authStore = useAuthStore.getState();
  return authStore.accessToken;
}

export async function refreshSharedSession(): Promise<boolean> {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }
  inFlightRefresh = (async () => {
    try {
      const refreshed = await useAuthStore.getState().refreshSession();
      return refreshed;
    } catch {
      return false;
    } finally {
      inFlightRefresh = null;
    }
  })();
  return inFlightRefresh;
}
