import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, TextInput, View } from 'react-native';
import { authApi } from '@/src/features/auth/auth.api';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = (): boolean => {
    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      return false;
    }
    if (!validateEmail(email.trim())) {
      setEmailError('That doesn\'t look like a valid email address. Please check and try again.');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authApi.forgotPassword(email.trim());
      setMessage(response.message ?? 'If this email is registered, a password reset link has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/login' as Href);
  };

  return (
    <View className="flex-1 justify-center bg-background px-8">
      <View className="mb-8 items-center">
        <Image
          source={require('../../../../assets/images/logo.png')}
          style={{ width: 90, height: 90, marginBottom: 12 }}
          resizeMode="contain"
        />
        <Text className="text-3xl font-bold text-foreground font-sans">Forgot Password</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground font-sans">
          Enter your registered email address and we'll send you a password reset link.
        </Text>
      </View>

      <View className="gap-5">
        <View>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email Address"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (emailError) setEmailError(null);
            }}
            className="rounded-2xl border border-border bg-input/50 px-5 py-4 text-foreground font-sans text-base"
          />
          {emailError ? (
            <Text className="mt-1 ml-1 text-xs text-red-500 font-sans">{emailError}</Text>
          ) : null}
        </View>
      </View>

      {message ? (
        <View className="mt-4 rounded-xl bg-accent/50 p-4 border border-border">
          <Text className="text-center text-sm text-foreground font-sans">{message}</Text>
        </View>
      ) : null}

      {error ? <Text className="mt-4 text-center text-sm text-red-500 font-sans">{error}</Text> : null}

      <View className="mt-8">
        <Button
          disabled={isLoading}
          onPress={handleSubmit}
          className="rounded-2xl h-14"
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="font-bold text-lg font-sans">Send Reset Link</Text>
          )}
        </Button>
      </View>

      <Pressable onPress={handleGoToLogin} className="mt-8">
        <Text className="text-center text-primary font-bold font-sans text-base">
          Back to Log In
        </Text>
      </Pressable>
    </View>
  );
}
