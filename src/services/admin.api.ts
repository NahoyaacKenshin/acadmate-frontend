import { ENV } from '@/src/config/env';
import { useAuthStore } from '@/src/features/auth/auth.store';
import * as FileSystem from 'expo-file-system/legacy';

const getHeaders = () => {
  const token = useAuthStore.getState().accessToken;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  let response = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers || {}) },
  });

  if (response.status === 401) {
    const refreshed = await useAuthStore.getState().refreshSession();
    if (refreshed) {
      response = await fetch(url, {
        ...options,
        headers: { ...getHeaders(), ...(options.headers || {}) },
      });
    }
  }

  return response;
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
};

export interface AdminAnalyticsData {
  users: {
    total: number;
    admins: number;
    students: number;
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
  };
  content: {
    subjects: number;
    classSchedules: number;
    calendarEvents: number;
    examWeeks: number;
  };
  adminConfig: {
    semesterRules: number;
    programMappings: number;
  };
  programDistribution: { programName: string; studentSet: string }[];
  recentUsers: { id: string; name: string | null; email: string | null; role: string; createdAt: string }[];
}

export const AdminApiService = {
  getAnalytics: async (): Promise<{ status: string; data: AdminAnalyticsData }> => {
    const response = await fetchWithAuth(`${ENV.API_URL}/admin/analytics`, {
      method: 'GET',
    });
    return handleResponse(response);
  },

  // SemesterRules
  listSemesterRules: async () => {
    const response = await fetchWithAuth(`${ENV.API_URL}/admin/semester-rules`, {
      method: 'GET',
    });
    return handleResponse(response);
  },

  createSemesterRule: async (data: { startDate: string; endDate?: string | null; dayOfWeek: number; setType: 'A' | 'B'; label?: string | null }) => {
    const response = await fetchWithAuth(`${ENV.API_URL}/admin/semester-rules`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateSemesterRule: async (id: string, data: { startDate?: string; endDate?: string | null; dayOfWeek?: number; setType?: 'A' | 'B'; label?: string | null }) => {
    const response = await fetchWithAuth(`${ENV.API_URL}/admin/semester-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteSemesterRule: async (id: string) => {
    const response = await fetchWithAuth(`${ENV.API_URL}/admin/semester-rules/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  // ProgramMappings
  listProgramMappings: async () => {
    const response = await fetchWithAuth(`${ENV.API_URL}/admin/program-mappings`, {
      method: 'GET',
    });
    return handleResponse(response);
  },

  createProgramMapping: async (data: { programName: string; studentSet: 'A' | 'B' }) => {
    const response = await fetchWithAuth(`${ENV.API_URL}/admin/program-mappings`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateProgramMapping: async (id: string, data: { programName?: string; studentSet?: 'A' | 'B' }) => {
    const response = await fetchWithAuth(`${ENV.API_URL}/admin/program-mappings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteProgramMapping: async (id: string) => {
    const response = await fetchWithAuth(`${ENV.API_URL}/admin/program-mappings/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  parseAdminFeature: async (file: { uri: string; name: string; type: string }, feature: string) => {
    const token = useAuthStore.getState().accessToken;

    // Use FileSystem.uploadAsync (same as student scanner) to correctly handle
    // content://, file://, and gallery image URIs on Android & iOS.
    let result = await FileSystem.uploadAsync(
      `${ENV.API_URL}/schedule-parser/parse-admin`,
      file.uri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: file.type || 'image/jpeg',
        parameters: { feature },
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    // Retry once on 401 with refreshed token
    if (result.status === 401) {
      const refreshed = await useAuthStore.getState().refreshSession();
      if (!refreshed) throw new Error('Session expired. Please log in again.');
      const newToken = useAuthStore.getState().accessToken;
      result = await FileSystem.uploadAsync(
        `${ENV.API_URL}/schedule-parser/parse-admin`,
        file.uri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType: file.type || 'image/jpeg',
          parameters: { feature },
          headers: {
            ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
          },
        }
      );
    }

    if (result.status < 200 || result.status >= 300) {
      let msg = `Server error (${result.status})`;
      try { msg = JSON.parse(result.body)?.message || msg; } catch {}
      throw new Error(msg);
    }

    return JSON.parse(result.body);
  },
};
