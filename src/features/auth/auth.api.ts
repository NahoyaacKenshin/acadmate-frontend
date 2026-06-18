import { apiRequest } from '@/src/lib/api';
import type { AuthResponse, LoginInput, SignupInput } from './auth.types';

export const authApi = {
  login: (input: LoginInput) => apiRequest<AuthResponse>('/auth/v1/login', { method: 'POST', body: input }),
  signup: (input: SignupInput) => apiRequest<AuthResponse>('/auth/v1/signup', { method: 'POST', body: input }),
  logout: (refreshToken?: string | null) =>
    apiRequest<AuthResponse>('/auth/v1/logout', {
      method: 'POST',
      body: refreshToken ? { refreshToken } : undefined,
    }),
  refresh: (refreshToken: string) =>
    apiRequest<AuthResponse>('/auth/v1/refresh-token', {
      method: 'POST',
      body: { refreshToken },
    }),
  getMe: (accessToken?: string | null) =>
    apiRequest<AuthResponse>('/auth/v1/me', {
      method: 'GET',
      token: accessToken,
    }),
  resendEmailVerification: (email: string) =>
    apiRequest<AuthResponse>('/auth/v1/resend-email-verification', {
      method: 'POST',
      body: { email },
    }),
};
