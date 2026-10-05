import { ENV } from '@/src/config/env';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { getValidAccessToken, refreshSharedSession } from '@/src/lib/aiRequest';

const getHeaders = () => {
  const token = useAuthStore.getState().accessToken;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }
  
  // If response is 204 No Content, don't try to parse JSON
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
};

export const ApiService = {
  // --- Subjects Write-Path ---
  subjects: {
    create: async (data: { name: string; color?: string }) => {
      const response = await fetch(`${ENV.API_URL}/subjects`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
    update: async (id: string, data: { name?: string; color?: string }) => {
      const response = await fetch(`${ENV.API_URL}/subjects/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
    delete: async (id: string) => {
      const response = await fetch(`${ENV.API_URL}/subjects/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
  },

  // --- Tasks Write-Path ---
  tasks: {
    create: async (data: { title: string; description?: string; due_date?: string; subject_id: string }) => {
      const response = await fetch(`${ENV.API_URL}/tasks`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
    update: async (id: string, data: Partial<{ title: string; description: string; due_date: string; subject_id: string; is_completed: boolean }>) => {
      const response = await fetch(`${ENV.API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
    delete: async (id: string) => {
      const response = await fetch(`${ENV.API_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
    breakdown: async (data: { title: string; description?: string | null; dueDate?: string | null }) => {
      const url = `${ENV.API_URL}/tasks/breakdown`;
      const body = JSON.stringify(data);

      const makeRequest = async (token: string | null) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45_000);
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body,
            signal: controller.signal,
          });
          return res;
        } finally {
          clearTimeout(timeoutId);
        }
      };

      try {
        let token = await getValidAccessToken();
        let response = await makeRequest(token);

        if (response.status === 401) {
          const refreshed = await refreshSharedSession();
          if (refreshed) {
            token = await getValidAccessToken();
            response = await makeRequest(token);
          }
        }

        return await handleResponse(response);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          const timeoutErr = new Error('AI breakdown took too long to respond. Please try again.');
          (timeoutErr as any).type = 'TIMEOUT';
          throw timeoutErr;
        }
        throw err;
      }
    },
  },

  // --- Holidays ---
  holidays: {
    get: async (year: number) => {
      const response = await fetch(`${ENV.API_URL}/holidays?year=${year}`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(response);
    }
  },

  // --- Notebooks ---
  notebooks: {
    list: async () => {
      const response = await fetch(`${ENV.API_URL}/notebooks`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
    create: async (data: { title: string; description?: string }) => {
      const response = await fetch(`${ENV.API_URL}/notebooks`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
    get: async (id: string) => {
      const response = await fetch(`${ENV.API_URL}/notebooks/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
    delete: async (id: string) => {
      const response = await fetch(`${ENV.API_URL}/notebooks/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
    update: async (id: string, data: { title?: string; description?: string | null }) => {
      const response = await fetch(`${ENV.API_URL}/notebooks/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
  },

  // --- Notebook Sources ---
  sources: {
    delete: async (notebookId: string, sourceId: string) => {
      const response = await fetch(`${ENV.API_URL}/notebooks/${notebookId}/sources/${sourceId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
    retry: async (notebookId: string, sourceId: string) => {
      const response = await fetch(`${ENV.API_URL}/notebooks/${notebookId}/sources/${sourceId}/retry`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
    update: async (notebookId: string, sourceId: string, data: { fileName?: string; rawText?: string }) => {
      const response = await fetch(`${ENV.API_URL}/notebooks/${notebookId}/sources/${sourceId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
  },

  // --- Notebook Chat (RAG) ---
  chat: {
    send: async (notebookId: string, message: string, sessionId?: string | null) => {
      const url = `${ENV.API_URL}/notebooks/${notebookId}/chat`;
      const body = JSON.stringify({ message, sessionId: sessionId ?? undefined });

      const makeRequest = async (token: string | null) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45_000); // 45s timeout

        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body,
            signal: controller.signal,
          });
          return res;
        } finally {
          clearTimeout(timeoutId);
        }
      };

      try {
        let token = await getValidAccessToken();
        let response = await makeRequest(token);

        if (response.status === 401) {
          const refreshed = await refreshSharedSession();
          if (refreshed) {
            token = await getValidAccessToken();
            response = await makeRequest(token);
          }
        }

        return await handleResponse(response);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          const timeoutErr = new Error('Notebook chat took too long to respond (timeout). Please try again.');
          (timeoutErr as any).type = 'TIMEOUT';
          throw timeoutErr;
        }
        throw err;
      }
    },
    history: async (notebookId: string) => {
      const response = await fetch(`${ENV.API_URL}/notebooks/${notebookId}/chat/history`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
    getSession: async (notebookId: string, sessionId: string) => {
      const response = await fetch(`${ENV.API_URL}/notebooks/${notebookId}/chat/history/${sessionId}`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
    deleteSession: async (notebookId: string, sessionId: string) => {
      const response = await fetch(`${ENV.API_URL}/notebooks/${notebookId}/chat/history/${sessionId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
  },

  // --- User Profile ---
  profile: {
    update: async (data: { name?: string; programName?: string | null }) => {
      const response = await fetch(`${ENV.API_URL}/auth/v1/me`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
  },
};
