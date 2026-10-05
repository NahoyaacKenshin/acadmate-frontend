import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/src/components/ui/text';
import { useTheme } from '@/src/theme/useTheme';

interface AuthScaffoldProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function AuthScaffold({ title, subtitle, children, footer }: AuthScaffoldProps) {
  const { colors, isDark } = useTheme();

  // Responsive horizontal padding based on screen width
  const horizontalPadding = SCREEN_WIDTH < 380 ? 20 : 28;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontalPadding },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.cardContainer}>
            {/* Minimalist Brand Header */}
            <View style={styles.brandHeader}>
              <View style={[styles.logoWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Image
                  source={require('../../../../assets/images/new-splash-favicon-icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.brandName, { color: colors.foreground }]}>
                Acad<Text style={styles.brandAccent}>Mate</Text>
              </Text>
            </View>

            {/* Editorial Heading & Subtitle */}
            <View style={styles.titleSection}>
              <Text style={[styles.titleText, { color: colors.foreground }]}>{title}</Text>
              <Text style={[styles.subtitleText, { color: colors.mutedForeground }]}>
                {subtitle}
              </Text>
            </View>

            {/* Form Content */}
            <View style={styles.formContainer}>{children}</View>

            {/* Optional Footer Link */}
            {footer && <View style={styles.footerWrap}>{footer}</View>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  logoWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 24,
    height: 24,
  },
  brandName: {
    fontSize: 19,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: '#6366F1',
  },
  titleSection: {
    marginBottom: 28,
  },
  titleText: {
    fontSize: SCREEN_WIDTH < 380 ? 25 : 28,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: SCREEN_WIDTH < 380 ? 30 : 34,
  },
  subtitleText: {
    fontSize: 14.5,
    marginTop: 6,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  formContainer: {
    width: '100%',
  },
  footerWrap: {
    marginTop: 28,
    alignItems: 'center',
  },
});
