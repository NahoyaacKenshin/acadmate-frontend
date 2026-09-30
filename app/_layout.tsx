// MUST BE THE VERY FIRST IMPORTS
import '@azure/core-asynciterator-polyfill';
import '../global.css';

import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppProviders } from '@/src/providers/AppProviders';
import { configureGoogleSignIn } from '@/src/lib/google-auth';

// Configure Google Sign-In once at the top level before any rendering
configureGoogleSignIn();

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Inter: Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
  });

  const [isAnimationDone, setIsAnimationDone] = useState(false);

  // Logo animation values
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);

  // Text animation values
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  // Overall overlay fade-out
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {});

      // Phase 1: Logo bounces in (0ms) — slower, smoother entrance
      logoOpacity.value = withTiming(1, { duration: 500 });
      logoScale.value = withSpring(1, { damping: 12, stiffness: 60 });

      // Phase 2: App name slides up (after 600ms) — give logo time to settle
      textOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
      textTranslateY.value = withDelay(
        600,
        withSpring(0, { damping: 16, stiffness: 90 })
      );

      // Phase 3: Hold for a comfortable read, then gently fade out
      // Total visible time: logo in by ~600ms, text in by ~1200ms, hold until ~2800ms
      overlayOpacity.value = withDelay(
        2800,
        withTiming(0, { duration: 600 }, () => {
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
      <View style={styles.container}>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="intro" options={{ headerShown: false }} />
        </Stack>

        {!isAnimationDone && (
          <Animated.View pointerEvents="none" style={[styles.splashOverlay, overlayAnimStyle]}>
            {/* Logo */}
            <Animated.Image
              source={require('../assets/images/new-splash-favicon-icon.png')}
              style={[styles.splashLogo, logoAnimStyle]}
              resizeMode="contain"
            />

            {/* App name — slides up beneath logo */}
            <Animated.View style={[styles.textContainer, textAnimStyle]}>
              <Text style={styles.appName}>
                <Text style={styles.appNameAccent}>Acad</Text>Mate
              </Text>
              <Text style={styles.tagline}>Your academic companion</Text>
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#10131C' },
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#10131C',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  splashLogo: {
    width: 160,
    height: 160,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  appName: {
    fontFamily: 'Inter-Bold',
    fontSize: 36,
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  appNameAccent: {
    color: '#7C6EF7', // violet accent matching app theme
  },
  tagline: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});

