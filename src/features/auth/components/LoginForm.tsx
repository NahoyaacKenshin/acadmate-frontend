import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '@/src/features/auth/auth.store';

export function LoginForm() {
  const { login, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    await login({ email: email.trim(), password });
  };

  return (
    <View className="flex-1 justify-center bg-background px-6">
      <Text className="text-4xl font-bold text-foreground">Welcome back</Text>
      <Text className="mt-2 text-base text-muted-foreground">Log in to connect Acadmate to your backend session.</Text>

      <View className="mt-8 gap-4">
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          className="rounded-xl border border-border bg-card px-4 py-4 text-foreground"
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          className="rounded-xl border border-border bg-card px-4 py-4 text-foreground"
        />
      </View>

      {error ? <Text className="mt-4 text-sm text-red-500">{error}</Text> : null}

      <Pressable
        disabled={isLoading}
        onPress={handleSubmit}
        className="mt-6 items-center rounded-xl bg-primary py-4 active:opacity-80 disabled:opacity-60"
      >
        {isLoading ? <ActivityIndicator /> : <Text className="font-bold text-primary-foreground">Log in</Text>}
      </Pressable>

      <Link href={'/signup' as Href} className="mt-6 text-center text-primary">
        Create an account
      </Link>
    </View>
  );
}
