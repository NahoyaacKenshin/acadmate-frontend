import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, TextInput, View, Pressable } from 'react-native';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { Eye, EyeOff } from 'lucide-react-native';
import { Image } from 'react-native';

type FieldErrors = {
  email?: string;
  password?: string;
};

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    clearError();
  }, []);

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!email.trim()) {
      errors.email = 'Please enter your email address.';
    } else if (!validateEmail(email.trim())) {
      errors.email = 'That doesn\'t look like a valid email address. Please check and try again.';
    }

    if (!password) {
      errors.password = 'Please enter your password.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await login({ email: email.trim(), password });
  };

  const handleGoToSignup = () => {
    clearError();
    router.push('/signup' as Href);
  };

  const handleGoToForgotPassword = () => {
    clearError();
    router.push('/forgot-password' as Href);
  };

  return (
    <View className="flex-1 justify-center bg-background px-8">
      <View className="mb-8 items-center">
        <Image
          source={require('../../../../assets/images/logo.png')}
          style={{ width: 90, height: 90, marginBottom: 12 }}
          resizeMode="contain"
        />
        <Text className="text-3xl font-bold text-foreground font-sans">Welcome Back</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground font-sans">
          Log in to continue your journey with AcadMate.
        </Text>
      </View>

      <View className="gap-5">
        {/* Email */}
        <View>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email Address"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={(val) => { setEmail(val); setFieldErrors((e) => ({ ...e, email: undefined })); }}
            className="rounded-2xl border border-border bg-input/50 px-5 py-4 text-foreground font-sans text-base"
          />
          {fieldErrors.email ? (
            <Text className="mt-1 ml-1 text-xs text-red-500 font-sans">{fieldErrors.email}</Text>
          ) : null}
        </View>

        {/* Password */}
        <View>
          <View className="relative">
            <TextInput
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(val) => { setPassword(val); setFieldErrors((e) => ({ ...e, password: undefined })); }}
              className="rounded-2xl border border-border bg-input/50 px-5 py-4 pr-12 text-foreground font-sans text-base"
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-4"
            >
              {showPassword ? (
                <EyeOff size={24} color="#94A3B8" />
              ) : (
                <Eye size={24} color="#94A3B8" />
              )}
            </Pressable>
          </View>
          {fieldErrors.password ? (
            <Text className="mt-1 ml-1 text-xs text-red-500 font-sans">{fieldErrors.password}</Text>
          ) : null}

          <Pressable onPress={handleGoToForgotPassword} className="mt-2 self-end">
            <Text className="text-sm text-primary font-sans font-medium">Forgot Password?</Text>
          </Pressable>
        </View>
      </View>

      {/* API-level error (e.g. wrong credentials) */}
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
            <Text className="font-bold text-lg font-sans">Log In</Text>
          )}
        </Button>
      </View>

      <Pressable onPress={handleGoToSignup} className="mt-8">
        <Text className="text-center text-primary font-bold font-sans text-base">
          Don't have an account? Sign up
        </Text>
      </Pressable>
    </View>
  );
}
