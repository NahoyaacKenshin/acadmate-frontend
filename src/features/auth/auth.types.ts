export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: 'USER' | 'ADMIN';
  emailVerified?: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
  refreshExpiresIn?: string;
};

export type AuthResponse = {
  code: number;
  status: 'success' | 'error';
  message?: string;
  data?: {
    user?: AuthUser;
    tokens?: AuthTokens;
  };
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = {
  name: string;
  email: string;
  password: string;
};
