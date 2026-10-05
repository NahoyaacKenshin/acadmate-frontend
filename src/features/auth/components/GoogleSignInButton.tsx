import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View, StyleSheet } from 'react-native';
import { Text } from '@/src/components/ui/text';
import Svg, { Path, G, ClipPath, Rect, Defs } from 'react-native-svg';
import { useTheme } from '@/src/theme/useTheme';

type GoogleSignInButtonProps = {
  onPress: () => void | Promise<void>;
  isLoading?: boolean;
  label?: string;
};

/** Official Google "G" logo in SVG */
function GoogleGLogo({ size = 19 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <ClipPath id="clip">
          <Rect width="24" height="24" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#clip)">
        <Path
          d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
          fill="#4285F4"
        />
        <Path
          d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z"
          fill="#34A853"
        />
        <Path
          d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
          fill="#FBBC05"
        />
        <Path
          d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
          fill="#EA4335"
        />
      </G>
    </Svg>
  );
}

export function GoogleSignInButton({
  onPress,
  isLoading = false,
  label = 'Continue with Google',
}: GoogleSignInButtonProps) {
  const { colors, isDark } = useTheme();
  const [pressed, setPressed] = useState(false);

  const handlePress = async () => {
    if (isLoading) return;
    setPressed(true);
    try {
      await onPress();
    } finally {
      setPressed(false);
    }
  };

  const backgroundColor = isDark
    ? pressed
      ? '#1C2030'
      : '#141722'
    : pressed
      ? '#F4F4F5'
      : '#FFFFFF';

  const borderColor = isDark
    ? pressed
      ? '#383E54'
      : '#272B3B'
    : pressed
      ? '#D4D4D8'
      : '#E4E4E7';

  return (
    <Pressable
      onPress={handlePress}
      disabled={isLoading}
      style={({ pressed: nativePressed }) => [
        styles.button,
        {
          backgroundColor: nativePressed ? (isDark ? '#1C2030' : '#F4F4F5') : backgroundColor,
          borderColor: nativePressed ? (isDark ? '#383E54' : '#D4D4D8') : borderColor,
          opacity: isLoading ? 0.6 : 1,
          transform: [{ scale: pressed || nativePressed ? 0.985 : 1 }],
        },
      ]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.foreground} />
      ) : (
        <View style={styles.iconWrap}>
          <GoogleGLogo size={19} />
        </View>
      )}
      <Text style={[styles.label, { color: colors.foreground }]}>
        {isLoading ? 'Connecting...' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    height: 50,
    paddingHorizontal: 16,
    width: '100%',
  },
  iconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
