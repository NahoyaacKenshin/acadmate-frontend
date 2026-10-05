import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View, Pressable, StyleSheet } from 'react-native';
import { authApi } from '@/src/features/auth/auth.api';
import { Text } from '@/src/components/ui/text';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { AuthScaffold } from './AuthScaffold';
import { useTheme } from '@/src/theme/useTheme';

export function VerifyEmailPrompt() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [message, setMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resend = async () => {
    if (!email) return;

    setIsSending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await authApi.resendEmailVerification(email);
      setMessage(response.message ?? 'A new verification email has been sent to your inbox.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to resend verification email. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleGoToLogin = () => {
    router.replace('/login' as Href);
  };

  return (
    <AuthScaffold
      title="Check your email"
      subtitle={`We sent a verification link to ${email ?? 'your email address'}. Please verify your account before signing in.`}
      footer={
        <Pressable onPress={handleGoToLogin} hitSlop={10} style={styles.backBtnRow}>
          <ArrowLeft size={16} color={colors.foreground} />
          <Text style={[styles.backBtnText, { color: colors.foreground }]}>Back to sign in</Text>
        </Pressable>
      }
    >
      <View style={styles.contentWrap}>
        <View
          style={[
            styles.mailIconCard,
            {
              backgroundColor: isDark ? '#141722' : '#F4F4F5',
              borderColor: colors.border,
            },
          ]}
        >
          <Mail size={36} color={colors.foreground} />
        </View>

        {/* Message Banner */}
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
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={resend}
          disabled={!email || isSending}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: colors.primary,
              opacity: !email || isSending ? 0.6 : pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            },
          ]}
        >
          {isSending ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
              Resend verification email
            </Text>
          )}
        </Pressable>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    alignItems: 'center',
    gap: 20,
    width: '100%',
  },
  mailIconCard: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  messageBox: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  errorBox: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
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
    width: '100%',
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
