import { ENV } from '@/src/config/env';
import { useAuthStore } from '@/src/features/auth/auth.store';

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
  },
};
