import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  TextInput,
  View,
  Pressable,
  StyleSheet,
} from 'react-native';
import { authApi } from '@/src/features/auth/auth.api';
import { Text } from '@/src/components/ui/text';
import { Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react-native';
import { AuthScaffold } from './AuthScaffold';
import { useTheme } from '@/src/theme/useTheme';
import { formatAuthErrorMessage } from '../auth.error';

type FieldErrors = {
  token?: string;
  password?: string;
  confirmPassword?: string;
};

export function ResetPasswordForm() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
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
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

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
      errors.password = 'Include at least one uppercase letter.';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Include at least one number.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
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
      setError(
        formatAuthErrorMessage(err, 'Unable to reset password. Please try again.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.replace('/login' as Href);
  };

  if (isSuccess) {
    return (
      <AuthScaffold
        title="Password updated"
        subtitle="Your password has been reset successfully. You can now sign in with your new credentials."
      >
        <View style={styles.successCard}>
          <View
            style={[
              styles.successIconWrap,
              {
                backgroundColor: isDark ? 'rgba(34, 197, 94, 0.14)' : '#DCFCE7',
                borderColor: isDark ? 'rgba(34, 197, 94, 0.28)' : '#BBF7D0',
              },
            ]}
          >
            <CheckCircle2 size={32} color={isDark ? '#4ADE80' : '#16A34A'} />
          </View>

          <Pressable
            onPress={handleGoToLogin}
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
          >
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
              Proceed to sign in
            </Text>
          </Pressable>
        </View>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      title="Create new password"
      subtitle="Choose a secure password for your account"
      footer={
        <Pressable onPress={handleGoToLogin} hitSlop={10} style={styles.backBtnRow}>
          <ArrowLeft size={16} color={colors.foreground} />
          <Text style={[styles.backBtnText, { color: colors.foreground }]}>Back to sign in</Text>
        </Pressable>
      }
    >
      <View style={styles.formGap}>
        {/* Token input if missing from deep link */}
        {!initialToken ? (
          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Reset Token</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
              spellCheck={false}
              placeholder="Paste the reset token from your email"
              placeholderTextColor={colors.mutedForeground}
              value={token}
              onChangeText={(val) => {
                setToken(val);
                if (fieldErrors.token) setFieldErrors((e) => ({ ...e, token: undefined }));
              }}
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  borderColor: fieldErrors.token ? colors.destructive : colors.inputBorder,
                  color: colors.foreground,
                },
              ]}
            />
            {fieldErrors.token ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {fieldErrors.token}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* New Password */}
        <View style={styles.inputGroup}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>New Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
              spellCheck={false}
              placeholder="Enter new password"
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

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            Confirm New Password
          </Text>
          <View style={styles.passwordWrap}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
              spellCheck={false}
              placeholder="Re-enter new password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={(val) => {
                setConfirmPassword(val);
                if (fieldErrors.confirmPassword)
                  setFieldErrors((e) => ({ ...e, confirmPassword: undefined }));
              }}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
              style={[
                styles.input,
                styles.passwordInput,
                {
                  backgroundColor: colors.input,
                  borderColor: fieldErrors.confirmPassword
                    ? colors.destructive
                    : confirmFocused
                      ? colors.ring
                      : colors.inputBorder,
                  color: colors.foreground,
                },
              ]}
            />
            <Pressable
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              hitSlop={12}
              style={styles.eyeBtn}
            >
              {showConfirmPassword ? (
                <EyeOff size={18} color={colors.mutedForeground} />
              ) : (
                <Eye size={18} color={colors.mutedForeground} />
              )}
            </Pressable>
          </View>
          {fieldErrors.confirmPassword ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {fieldErrors.confirmPassword}
            </Text>
          ) : null}
        </View>

        {/* API-level Error */}
        {error ? (
          <View
            style={[
              styles.errorBox,
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
          disabled={isLoading}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: colors.primary,
              opacity: isLoading ? 0.6 : pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
              Reset password
            </Text>
          )}
        </Pressable>
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
  errorBox: {
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
    width: '100%',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  backBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  successCard: {
    alignItems: 'center',
    gap: 20,
    paddingVertical: 12,
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
