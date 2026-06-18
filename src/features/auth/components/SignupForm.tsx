import { Link, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '@/src/features/auth/auth.store';

export function SignupForm() {
  const router = useRouter();
  const { signup, isLoading, error } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    const result = await signup({ name: name.trim(), email: email.trim(), password });

    if (result === 'verification-required') {
      router.replace({ pathname: '/verify-email', params: { email: email.trim() } } as unknown as Href);
    }
  };

  return (
    <View className="flex-1 justify-center bg-background px-6">
      <Text className="text-4xl font-bold text-foreground">Create account</Text>
      <Text className="mt-2 text-base text-muted-foreground">Use your school email and a strong password.</Text>

      <View className="mt-8 gap-4">
        <TextInput
          placeholder="Name"
          value={name}
          onChangeText={setName}
          className="rounded-xl border border-border bg-card px-4 py-4 text-foreground"
        />
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

      <Text className="mt-3 text-xs text-muted-foreground">Password must be at least 8 characters and include one uppercase letter and one number.</Text>

      {error ? <Text className="mt-4 text-sm text-red-500">{error}</Text> : null}

      <Pressable
        disabled={isLoading}
        onPress={handleSubmit}
        className="mt-6 items-center rounded-xl bg-primary py-4 active:opacity-80 disabled:opacity-60"
      >
        {isLoading ? <ActivityIndicator /> : <Text className="font-bold text-primary-foreground">Sign up</Text>}
      </Pressable>

      <Link href={'/login' as Href} className="mt-6 text-center text-primary">
        Already have an account?
      </Link>
    </View>
  );
}
