import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useStatus } from '@powersync/react';
import { Text } from '@/src/components/ui/text';
import { WifiOff } from 'lucide-react-native';

export function OfflineBanner() {
  const status = useStatus();

  // If connected, do not render banner
  if (status?.connected) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <WifiOff size={14} color="#FCD34D" />
      <Text style={styles.bannerText}>
        Offline mode — changes will automatically sync when reconnected
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#272010',
    borderBottomWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FCD34D',
  },
});
