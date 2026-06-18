import { Link, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { authApi } from '@/src/features/auth/auth.api';

export function VerifyEmailPrompt() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [message, setMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const resend = async () => {
    if (!email) return;

    setIsSending(true);
    setMessage(null);

    try {
      const response = await authApi.resendEmailVerification(email);
      setMessage(response.message ?? 'Verification email sent.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to resend verification email.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-background px-6">
      <Text className="text-4xl font-bold text-foreground">Check your email</Text>
      <Text className="mt-3 text-base text-muted-foreground">
        We created your account. Verify {email ?? 'your email'} before logging in.
      </Text>

      {message ? <Text className="mt-6 text-sm text-foreground">{message}</Text> : null}

      <Pressable
        disabled={!email || isSending}
        onPress={resend}
        className="mt-8 items-center rounded-xl bg-primary py-4 active:opacity-80 disabled:opacity-60"
      >
        {isSending ? <ActivityIndicator /> : <Text className="font-bold text-primary-foreground">Resend verification email</Text>}
      </Pressable>

      <Link href={'/login' as Href} className="mt-6 text-center text-primary">
        Back to login
      </Link>
    </View>
  );
}
