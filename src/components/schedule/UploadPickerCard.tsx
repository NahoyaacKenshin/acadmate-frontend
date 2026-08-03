import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/src/components/ui/text';

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
  accent = '#6C8EFF',
}: UploadPickerCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      disabled={isLoading}
      android_ripple={{ color: 'rgba(108, 142, 255, 0.1)', borderless: false }}
    >
      {/* Icon container */}
      <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
        {isLoading ? <ActivityIndicator color={accent} size="small" /> : icon}
      </View>

      {/* Text */}
      <View style={styles.textWrap}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
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
    backgroundColor: '#161A26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A3143',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  cardPressed: {
    opacity: 0.75,
    backgroundColor: '#1A1F2E',
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
    color: '#ffffff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
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
  },
});

