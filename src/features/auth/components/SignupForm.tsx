import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  TextInput,
  View,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { Text } from '@/src/components/ui/text';
import { Eye, EyeOff } from 'lucide-react-native';
import { GoogleSignInButton } from './GoogleSignInButton';
import { promptGoogleSignIn } from '@/src/lib/google-auth';
import { AuthScaffold } from './AuthScaffold';
import { useTheme } from '@/src/theme/useTheme';
import { formatAuthErrorMessage } from '../auth.error';

type FieldErrors = {
  email?: string;
  password?: string;
};

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function SignupForm() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { signup, loginWithGoogle, isLoading, error, clearError, setError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!email.trim()) {
      errors.email = 'Please enter your email address.';
    } else if (!validateEmail(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Please enter a password.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Include at least one uppercase letter.';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Include at least one number.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    clearError();
    if (!validate()) return;

    try {
      const result = await signup({ email: email.trim(), password });
      if (result === 'verification-required') {
        router.push(`/verify-email?email=${encodeURIComponent(email.trim())}` as Href);
      }
    } catch {
      // API error handled via auth store
    }
  };

  const handleGoToLogin = () => {
    clearError();
    router.push('/login' as Href);
  };

  const handleGoogleSignIn = async () => {
    clearError();
    setGoogleLoading(true);
    try {
      const idToken = await promptGoogleSignIn();
      await loginWithGoogle(idToken);
    } catch (err) {
      if (err instanceof Error && err.message === 'CANCELLED') return;
      const message = formatAuthErrorMessage(
        err,
        'Unable to connect to Google. Please check your internet connection and try again.'
      );
      setError(message);
      Alert.alert('Sign-Up Error', message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthScaffold
      title="Create account"
      subtitle="Start organizing your coursework and schedule"
      footer={
        <Pressable onPress={handleGoToLogin} hitSlop={10}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Already have an account?{' '}
            <Text style={[styles.footerLink, { color: colors.foreground }]}>Log in</Text>
          </Text>
        </Pressable>
      }
    >
      <View style={styles.formGap}>
        {/* Email Field */}
        <View style={styles.inputGroup}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            importantForAutofill="no"
            textContentType="none"
            spellCheck={false}
            keyboardType="email-address"
            placeholder="name@university.edu"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }));
            }}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            style={[
              styles.input,
              {
                backgroundColor: colors.input,
                borderColor: fieldErrors.email
                  ? colors.destructive
                  : emailFocused
                    ? colors.ring
                    : colors.inputBorder,
                color: colors.foreground,
              },
            ]}
          />
          {fieldErrors.email ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {fieldErrors.email}
            </Text>
          ) : null}
        </View>

        {/* Password Field */}
        <View style={styles.inputGroup}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
              spellCheck={false}
              placeholder="Create a strong password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
              }}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              style={[
                styles.input,
                styles.passwordInput,
                {
                  backgroundColor: colors.input,
                  borderColor: fieldErrors.password
                    ? colors.destructive
                    : passwordFocused
                      ? colors.ring
                      : colors.inputBorder,
                  color: colors.foreground,
                },
              ]}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={12}
              style={styles.eyeBtn}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff size={18} color={colors.mutedForeground} />
              ) : (
                <Eye size={18} color={colors.mutedForeground} />
              )}
            </Pressable>
          </View>
          {fieldErrors.password ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {fieldErrors.password}
            </Text>
          ) : (
            <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
              Minimum 8 characters, with 1 uppercase letter and 1 number.
            </Text>
          )}
        </View>

        {/* API-level Error Banner */}
        {error ? (
          <View
            style={[
              styles.apiErrorBox,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
              },
            ]}
          >
            <Text style={[styles.apiErrorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={isLoading || googleLoading}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: colors.primary,
              opacity: isLoading || googleLoading ? 0.6 : pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
              Create account
            </Text>
          )}
        </Pressable>

        {/* OR Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>OR</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Google Sign-Up */}
        <GoogleSignInButton
          onPress={handleGoogleSignIn}
          isLoading={googleLoading}
          label="Sign up with Google"
        />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  formGap: {
    gap: 18,
  },
  inputGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: 'Inter',
  },
  passwordWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12,
    marginTop: 2,
    marginLeft: 2,
    lineHeight: 16,
    fontFamily: 'Inter',
  },
  errorText: {
    fontSize: 12.5,
    marginTop: 2,
    marginLeft: 2,
    fontFamily: 'Inter',
  },
  apiErrorBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  apiErrorText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  submitBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontWeight: '700',
  },
});
