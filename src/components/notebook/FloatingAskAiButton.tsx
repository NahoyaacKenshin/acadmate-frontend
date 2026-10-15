import React from 'react';
import { Pressable, StyleSheet, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/src/components/ui/text';
import { useTheme } from '@/src/theme/useTheme';
import { Sparkles } from 'lucide-react-native';

interface FloatingAskAiButtonProps {
  onPress: () => void;
  label?: string;
  position?: 'left' | 'right';
}

export function FloatingAskAiButton({
  onPress,
  label = 'Ask AI',
  position = 'right',
}: FloatingAskAiButtonProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = createStyles(colors, isDark, insets.bottom, position);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Ask AI about notebook materials"
      style={({ pressed }) => [
        styles.fab,
        pressed && styles.fabPressed,
      ]}
    >
      <View style={styles.contentWrap}>
        <Sparkles size={16} color="#FFFFFF" strokeWidth={2.4} />
        <Text style={styles.fabLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (
  colors: any,
  isDark: boolean,
  bottomInset: number,
  position: 'left' | 'right' = 'right'
) => {
  // Height of bottom nav is ~58 + bottomInset
  const bottomNavHeight = 58 + (bottomInset > 0 ? bottomInset : Platform.OS === 'ios' ? 16 : 10);
  const bottomOffset = bottomNavHeight + 12;

  return StyleSheet.create({
    fab: {
      position: 'absolute',
      bottom: bottomOffset,
      ...(position === 'left' ? { left: 16 } : { right: 16 }),
      backgroundColor: '#6366F1',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 22,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.45 : 0.35,
      shadowRadius: 10,
      elevation: 7,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      zIndex: 50,
    },
    fabPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.96 }],
    },
    contentWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    fabLabel: {
      color: '#FFFFFF',
      fontFamily: 'Inter-Bold',
      fontSize: 13,
      letterSpacing: -0.2,
      includeFontPadding: false,
      flexShrink: 0,
    },
  });
};
