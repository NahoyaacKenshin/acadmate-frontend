// MUST BE THE VERY FIRST IMPORTS
import '@azure/core-asynciterator-polyfill';
import '../global.css';

import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import 'react-native-reanimated';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';

import { AppProviders } from '@/src/providers/AppProviders';
import { configureGoogleSignIn } from '@/src/lib/google-auth';
import { useTheme } from '@/src/theme/useTheme';

// Configure Google Sign-In once at the top level before any rendering
configureGoogleSignIn();

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors, isDark } = useTheme();

  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Inter: Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
  });

  const [isAnimationDone, setIsAnimationDone] = useState(false);

  // Logo animation values
  const logoScale = useSharedValue(0.65);
  const logoOpacity = useSharedValue(0);

  // Text animation values
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(16);

  // Overall overlay fade-out
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {});

      // Phase 1: Logo settles in with smooth, subtle spring
      logoOpacity.value = withTiming(1, { duration: 450 });
      logoScale.value = withSpring(1, { damping: 14, stiffness: 70 });

      // Phase 2: Brand typography slides up cleanly beneath logo
      textOpacity.value = withDelay(400, withTiming(1, { duration: 450 }));
      textTranslateY.value = withDelay(
        400,
        withSpring(0, { damping: 16, stiffness: 90 })
      );

      // Phase 3: Hold comfortably, then seamlessly fade out the overlay
      overlayOpacity.value = withDelay(
        2200,
        withTiming(0, { duration: 500 }, () => {
          runOnJS(setIsAnimationDone)(true);
        })
      );
    }
  }, [loaded]);

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const overlayAnimStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!loaded) {
    return null;
  }

  return (
    <AppProviders>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="intro" options={{ headerShown: false }} />
        </Stack>

        {!isAnimationDone && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.splashOverlay,
              { backgroundColor: colors.background },
              overlayAnimStyle,
            ]}
          >
            {/* Minimalist elevated logo badge */}
            <Animated.View
              style={[
                styles.logoBadge,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
                logoAnimStyle,
              ]}
            >
              <Image
                source={require('../assets/images/new-splash-favicon-icon.png')}
                style={styles.splashLogo}
                resizeMode="contain"
              />
            </Animated.View>

            {/* App name & modern tagline */}
            <Animated.View style={[styles.textContainer, textAnimStyle]}>
              <Text style={[styles.appName, { color: colors.foreground }]}>
                Acad<Text style={styles.brandAccent}>Mate</Text>
              </Text>
              <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
                Academic Companion
              </Text>
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 64,
    height: 64,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 22,
  },
  appName: {
    fontFamily: 'Inter-Bold',
    fontSize: 34,
    letterSpacing: -0.8,
    fontWeight: '800',
  },
  brandAccent: {
    color: '#6366F1',
  },
  tagline: {
    fontFamily: 'Inter',
    fontSize: 12,
    marginTop: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
});
