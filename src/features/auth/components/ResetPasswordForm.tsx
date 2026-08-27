import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, TextInput, View } from 'react-native';
import { authApi } from '@/src/features/auth/auth.api';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { Eye, EyeOff } from 'lucide-react-native';

type FieldErrors = {
  token?: string;
  password?: string;
  confirmPassword?: string;
};

export function ResetPasswordForm() {
  const router = useRouter();
  const { token: initialToken } = useLocalSearchParams<{ token?: string }>();

  const [token, setToken] = useState(initialToken ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!token.trim()) {
      errors.token = 'Reset token is missing. Please use the link from your email.';
    }

    if (!password) {
      errors.password = 'Please enter a new password.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must include at least one uppercase letter (e.g. "A").';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must include at least one number (e.g. "1").';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match. Please re-enter your new password.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    setError(null);

    try {
      await authApi.resetPassword(token.trim(), password);
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.replace('/login' as Href);
  };

  if (isSuccess) {
    return (
      <View className="flex-1 justify-center bg-background px-8">
        <View className="mb-8 items-center">
          <Image
            source={require('../../../../assets/images/logo.png')}
            style={{ width: 90, height: 90, marginBottom: 12 }}
            resizeMode="contain"
          />
          <Text className="text-3xl font-bold text-foreground font-sans">Password Reset!</Text>
          <Text className="mt-2 text-center text-sm text-muted-foreground font-sans">
            Your password has been successfully updated. You can now log in with your new credentials.
          </Text>
        </View>

        <View className="mt-4">
          <Button onPress={handleGoToLogin} className="rounded-2xl h-14">
            <Text className="font-bold text-lg font-sans">Proceed to Log In</Text>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center bg-background px-8">
      <View className="mb-8 items-center">
        <Image
          source={require('../../../../assets/images/logo.png')}
          style={{ width: 90, height: 90, marginBottom: 12 }}
          resizeMode="contain"
        />
        <Text className="text-3xl font-bold text-foreground font-sans">Reset Password</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground font-sans">
          Create a new, strong password for your AcadMate account.
        </Text>
      </View>

      <View className="gap-5">
        {!initialToken ? (
          <View>
            <TextInput
              placeholder="Reset Token"
              placeholderTextColor="#94A3B8"
              value={token}
              onChangeText={(val) => { setToken(val); setFieldErrors((e) => ({ ...e, token: undefined })); }}
              className="rounded-2xl border border-border bg-input/50 px-5 py-4 text-foreground font-sans text-base"
            />
            {fieldErrors.token ? (
              <Text className="mt-1 ml-1 text-xs text-red-500 font-sans">{fieldErrors.token}</Text>
            ) : null}
          </View>
        ) : null}

        {/* New Password */}
        <View>
          <View className="relative">
            <TextInput
              placeholder="New Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(val) => { setPassword(val); setFieldErrors((e) => ({ ...e, password: undefined, confirmPassword: undefined })); }}
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
          ) : (
            <Text className="mt-1 ml-1 text-xs text-muted-foreground font-sans">
              Min. 8 characters, one uppercase letter, and one number.
            </Text>
          )}
        </View>

        {/* Confirm Password */}
        <View>
          <View className="relative">
            <TextInput
              placeholder="Confirm New Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={(val) => { setConfirmPassword(val); setFieldErrors((e) => ({ ...e, confirmPassword: undefined })); }}
              className="rounded-2xl border border-border bg-input/50 px-5 py-4 pr-12 text-foreground font-sans text-base"
            />
            <Pressable
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-4"
            >
              {showConfirmPassword ? (
                <EyeOff size={24} color="#94A3B8" />
              ) : (
                <Eye size={24} color="#94A3B8" />
              )}
            </Pressable>
          </View>
          {fieldErrors.confirmPassword ? (
            <Text className="mt-1 ml-1 text-xs text-red-500 font-sans">{fieldErrors.confirmPassword}</Text>
          ) : null}
        </View>
      </View>

      {/* API-level error */}
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
            <Text className="font-bold text-lg font-sans">Reset Password</Text>
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
