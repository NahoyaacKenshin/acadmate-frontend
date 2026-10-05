export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  background: string;
  card: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  inputBorder: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  ring: string;
}

export const lightColors: ThemeColors = {
  background: '#FAFAFA',
  card: '#FFFFFF',
  foreground: '#09090B',
  muted: '#F4F4F5',
  mutedForeground: '#71717A',
  border: '#E4E4E7',
  input: '#FFFFFF',
  inputBorder: '#E4E4E7',
  primary: '#0F172A',
  primaryForeground: '#FFFFFF',
  secondary: '#F4F4F5',
  secondaryForeground: '#18181B',
  accent: '#F4F4F5',
  accentForeground: '#0F172A',
  destructive: '#DC2626',
  destructiveForeground: '#FFFFFF',
  ring: '#2563EB',
};

export const darkColors: ThemeColors = {
  background: '#090A0F',
  card: '#12141D',
  foreground: '#F8FAFC',
  muted: '#181B26',
  mutedForeground: '#94A3B8',
  border: '#232736',
  input: '#12141D',
  inputBorder: '#232736',
  primary: '#F8FAFC',
  primaryForeground: '#090A0F',
  secondary: '#181B26',
  secondaryForeground: '#F8FAFC',
  accent: '#181B26',
  accentForeground: '#6C8EFF',
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  ring: '#3B82F6',
};
