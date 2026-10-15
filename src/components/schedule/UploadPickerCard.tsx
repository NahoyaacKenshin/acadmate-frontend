import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useTheme } from '@/src/theme/useTheme';

interface UploadPickerCardProps {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  onPress: () => void;
  isLoading?: boolean;
  accent?: string;
}

/**
 * Tappable card used on the Upload Schedule screen to let users choose
 * how to provide their schedule (PDF/DOCX, gallery image, or camera).
 */
export function UploadPickerCard({
  icon,
  label,
  subtitle,
  onPress,
  isLoading = false,
  accent = '#6366F1',
}: UploadPickerCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        pressed && {
          backgroundColor: isDark ? colors.muted : '#F4F4F5',
        },
      ]}
      onPress={onPress}
      disabled={isLoading}
      android_ripple={{ color: 'rgba(99, 102, 241, 0.1)', borderless: false }}
    >
      {/* Icon container */}
      <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
        {isLoading ? <ActivityIndicator color={accent} size="small" /> : icon}
      </View>

      {/* Text */}
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>

      {/* Chevron */}
      <View style={styles.chevron}>
        <Text style={[styles.chevronText, { color: accent }]}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
    includeFontPadding: false,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
  },
  chevron: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '300',
    includeFontPadding: false,
  },
});


