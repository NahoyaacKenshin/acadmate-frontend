import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useStatus } from '@powersync/react';
import { WifiOff } from 'lucide-react-native';
import { useTheme } from '@/src/theme/useTheme';

export function OfflineBanner() {
  const status = useStatus();
  const { colors, isDark } = useTheme();

  // If connected, do not render banner
  if (status?.connected) {
    return null;
  }

  const textColor = isDark ? '#F59E0B' : '#B45309';
  const bgColor = isDark ? 'rgba(245, 158, 11, 0.14)' : 'rgba(245, 158, 11, 0.1)';
  const borderColor = isDark ? 'rgba(245, 158, 11, 0.28)' : 'rgba(217, 119, 6, 0.25)';

  return (
    <View style={[styles.banner, { backgroundColor: bgColor, borderColor }]}>
      <WifiOff size={14} color={textColor} />
      <Text style={[styles.bannerText, { color: textColor }]}>
        Offline mode — changes will automatically sync when reconnected
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  bannerText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
  },
});
