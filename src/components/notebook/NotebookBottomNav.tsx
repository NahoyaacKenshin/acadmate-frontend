import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/src/components/ui/text';
import { useTheme } from '@/src/theme/useTheme';
import { Files, Wrench } from 'lucide-react-native';

export type NotebookTab = 'sources' | 'tools';

interface NotebookBottomNavProps {
  activeTab: NotebookTab;
  onTabChange: (tab: NotebookTab) => void;
  sourcesCount?: number;
  toolsCount?: number;
}

export function NotebookBottomNav({
  activeTab,
  onTabChange,
  sourcesCount = 0,
  toolsCount = 0,
}: NotebookBottomNavProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = createStyles(colors, isDark, insets.bottom);

  return (
    <View style={styles.container}>
      {/* Sources Tab */}
      <Pressable
        onPress={() => onTabChange('sources')}
        accessibilityRole="tab"
        accessibilityLabel="Notebook Sources"
        accessibilityState={{ selected: activeTab === 'sources' }}
        style={[
          styles.tabButton,
          activeTab === 'sources' && styles.tabButtonActive,
        ]}
      >
        <Files
          size={18}
          color={activeTab === 'sources' ? '#6366F1' : colors.mutedForeground}
          strokeWidth={activeTab === 'sources' ? 2.3 : 1.8}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === 'sources' ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Sources
        </Text>
        {sourcesCount > 0 && (
          <View
            style={[
              styles.badge,
              activeTab === 'sources' ? styles.badgeActive : styles.badgeInactive,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                activeTab === 'sources' ? styles.badgeTextActive : styles.badgeTextInactive,
              ]}
            >
              {sourcesCount}
            </Text>
          </View>
        )}
      </Pressable>

      <View style={styles.divider} />

      {/* Tools Tab */}
      <Pressable
        onPress={() => onTabChange('tools')}
        accessibilityRole="tab"
        accessibilityLabel="Study Tools"
        accessibilityState={{ selected: activeTab === 'tools' }}
        style={[
          styles.tabButton,
          activeTab === 'tools' && styles.tabButtonActive,
        ]}
      >
        <Wrench
          size={18}
          color={activeTab === 'tools' ? '#6366F1' : colors.mutedForeground}
          strokeWidth={activeTab === 'tools' ? 2.3 : 1.8}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === 'tools' ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Tools
        </Text>
        {toolsCount > 0 && (
          <View
            style={[
              styles.badge,
              activeTab === 'tools' ? styles.badgeActive : styles.badgeInactive,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                activeTab === 'tools' ? styles.badgeTextActive : styles.badgeTextInactive,
              ]}
            >
              {toolsCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean, bottomInset: number) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
      paddingBottom: bottomInset > 0 ? bottomInset : Platform.OS === 'ios' ? 16 : 10,
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: isDark ? 0.35 : 0.06,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 40,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginHorizontal: 4,
      gap: 7,
    },
    tabButtonActive: {
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
    },
    tabLabel: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 13,
      letterSpacing: -0.2,
      includeFontPadding: false,
      flexShrink: 0,
    },
    tabLabelActive: {
      color: '#6366F1',
      fontWeight: '700',
    },
    tabLabelInactive: {
      color: colors.mutedForeground,
      fontWeight: '600',
    },
    divider: {
      width: 1,
      height: 22,
      backgroundColor: colors.border,
      marginHorizontal: 4,
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 10,
      marginLeft: 2,
      flexShrink: 0,
    },
    badgeActive: {
      backgroundColor: '#6366F1',
    },
    badgeInactive: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F4F4F5',
    },
    badgeText: {
      fontFamily: 'Inter-Bold',
      fontSize: 11,
      includeFontPadding: false,
      flexShrink: 0,
    },
    badgeTextActive: {
      color: '#FFFFFF',
    },
    badgeTextInactive: {
      color: colors.mutedForeground,
    },
  });
