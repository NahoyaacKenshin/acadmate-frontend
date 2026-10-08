import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, TextInput, View, Pressable, StyleSheet } from 'react-native';
import { authApi } from '@/src/features/auth/auth.api';
import { Text } from '@/src/components/ui/text';
import { AuthScaffold } from './AuthScaffold';
import { useTheme } from '@/src/theme/useTheme';
import { ArrowLeft } from 'lucide-react-native';
import { formatAuthErrorMessage } from '../auth.error';

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);

  const validate = (): boolean => {
    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      return false;
    }
    if (!validateEmail(email.trim())) {
      setEmailError('Enter a valid email address.');
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
      setMessage(
        response.message ??
          'If this email is registered, a password reset link has been sent to your inbox.'
      );
    } catch (err) {
      setError(
        formatAuthErrorMessage(err, 'Unable to send password reset email. Please try again.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/login' as Href);
  };

  return (
    <AuthScaffold
      title="Reset password"
      subtitle="Enter your registered email address and we will send you instructions to reset your password"
      footer={
        <Pressable onPress={handleGoToLogin} hitSlop={10} style={styles.backBtnRow}>
          <ArrowLeft size={16} color={colors.foreground} />
          <Text style={[styles.backBtnText, { color: colors.foreground }]}>Back to sign in</Text>
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
              if (emailError) setEmailError(null);
            }}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            style={[
              styles.input,
              {
                backgroundColor: colors.input,
                borderColor: emailError
                  ? colors.destructive
                  : emailFocused
                    ? colors.ring
                    : colors.inputBorder,
                color: colors.foreground,
              },
            ]}
          />
          {emailError ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>{emailError}</Text>
          ) : null}
        </View>

        {/* Success Message Banner */}
        {message ? (
          <View
            style={[
              styles.messageBox,
              {
                backgroundColor: isDark ? 'rgba(37, 99, 235, 0.12)' : '#EFF6FF',
                borderColor: isDark ? 'rgba(37, 99, 235, 0.28)' : '#BFDBFE',
              },
            ]}
          >
            <Text
              style={[
                styles.messageText,
                { color: isDark ? '#93C5FD' : '#1E40AF' },
              ]}
            >
              {message}
            </Text>
          </View>
        ) : null}

        {/* Error Banner */}
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
              Send reset link
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
  errorText: {
    fontSize: 12.5,
    marginTop: 2,
    marginLeft: 2,
    fontFamily: 'Inter',
  },
  messageBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
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
    marginTop: 4,
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
});
