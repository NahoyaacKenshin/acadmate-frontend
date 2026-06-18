const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const ENV = {
  API_URL: trimTrailingSlash(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api'),
};
