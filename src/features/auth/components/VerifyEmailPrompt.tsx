import { Link, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { authApi } from '@/src/features/auth/auth.api';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';

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
    <View className="flex-1 justify-center bg-background px-8">
      <View className="mb-10 items-center">
        <Text className="text-4xl font-bold text-foreground font-sans">Check Your Email</Text>
        <Text className="mt-3 text-center text-base text-muted-foreground font-sans">
          We created your account. Verify {email ?? 'your email'} before logging in.
        </Text>
      </View>

      {message ? (
        <View className="rounded-xl bg-accent/50 p-4 mb-6">
          <Text className="text-center text-sm text-foreground font-sans">{message}</Text>
        </View>
      ) : null}

      <View className="mt-2">
        <Button 
          disabled={!email || isSending} 
          onPress={resend} 
          className="rounded-2xl h-14"
        >
          {isSending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="font-bold text-lg font-sans">Resend Verification Email</Text>
          )}
        </Button>
      </View>

      <Link href={'/login' as Href} className="mt-8 text-center text-primary font-bold font-sans text-base">
        Back to Log In
      </Link>
    </View>
  );
}
