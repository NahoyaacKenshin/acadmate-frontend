// MUST BE THE VERY FIRST IMPORTS
import '@azure/core-asynciterator-polyfill';
import '../global.css';

import { Inter_400Regular } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppProviders } from '@/src/providers/AppProviders';

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
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
  });

  const [isAnimationDone, setIsAnimationDone] = useState(false);
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Hide native splash screen
      SplashScreen.hideAsync().catch(() => {});

      // Start custom smooth splash animation
      scale.value = withSpring(1.05, { damping: 12, stiffness: 90 }, () => {
        opacity.value = withTiming(0, { duration: 350 }, () => {
          runOnJS(setIsAnimationDone)(true);
        });
      });
    }
  }, [loaded]);

  const animatedSplashStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
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
          <Animated.View pointerEvents="none" style={[styles.splashOverlay, animatedSplashStyle]}>
            <Animated.Image
              source={require('../assets/images/logo.png')}
              style={styles.splashLogo}
              resizeMode="contain"
            />
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
    width: 180,
    height: 180,
  },
});

