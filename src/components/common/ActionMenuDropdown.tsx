import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  StyleProp,
  ViewStyle,
  Text,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/src/theme/useTheme';

export interface ActionMenuItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  iconBg: string;
  onPress: () => void;
}

export function useActionMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const openMenu = useCallback(() => {
    setIsMounted(true);
    setIsOpen(true);
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 240,
      damping: 18,
      mass: 0.8,
    }).start();
  }, [anim]);

  const closeMenu = useCallback((onFinished?: () => void) => {
    setIsOpen(false);
    Animated.timing(anim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
        if (typeof onFinished === 'function') {
          onFinished();
        }
      }
    });
  }, [anim]);

  const toggleMenu = useCallback(() => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [isOpen, closeMenu, openMenu]);

  return {
    isOpen,
    isMounted,
    anim,
    openMenu,
    closeMenu,
    toggleMenu,
  };
}

export interface ActionMenuButtonProps {
  isOpen: boolean;
  onPress: () => void;
  anim: Animated.Value;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function ActionMenuButton({
  isOpen,
  onPress,
  anim,
  style,
  accessibilityLabel = 'Toggle action menu',
}: ActionMenuButtonProps) {
  const { colors, isDark } = useTheme();

  const iconRotateDeg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.triggerBtn,
        {
          backgroundColor: isOpen ? '#6366F1' : colors.card,
          borderColor: isOpen ? '#6366F1' : colors.border,
        },
        isOpen && styles.triggerBtnActive,
        pressed && styles.triggerBtnPressed,
        style,
      ]}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[
          styles.iconWrap,
          {
            transform: [{ rotate: iconRotateDeg }],
          },
        ]}
      >
        <Plus size={20} color={isOpen ? '#FFFFFF' : '#6366F1'} strokeWidth={2.5} />
      </Animated.View>
    </Pressable>
  );
}

export interface ActionMenuDropdownProps {
  isMounted: boolean;
  isOpen?: boolean;
  anim: Animated.Value;
  onClose: () => void;
  items: ActionMenuItem[];
  top?: number;
  right?: number;
  width?: number;
}

export function ActionMenuDropdown({
  isMounted,
  isOpen,
  anim,
  onClose,
  items,
  top = 120,
  right = 16,
  width = 248,
}: ActionMenuDropdownProps) {
  const { colors, isDark } = useTheme();

  if (!isMounted) return null;

  const backdropOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const menuOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const menuScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  const menuTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  const menuTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 0],
  });

  const handleItemPress = (item: ActionMenuItem) => {
    onClose();
    item.onPress();
  };

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          { opacity: backdropOpacity },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => onClose()}
          accessibilityLabel="Dismiss menu"
          accessibilityRole="button"
        />
      </Animated.View>

      {/* Dropdown Menu Card */}
      <Animated.View
        style={[
          styles.menuCard,
          {
            top,
            right,
            width,
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: menuOpacity,
            transform: [
              { translateY: menuTranslateY },
              { translateX: menuTranslateX },
              { scale: menuScale },
            ],
          },
        ]}
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={item.id}>
              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                  },
                ]}
                onPress={() => handleItemPress(item)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View
                  style={[
                    styles.menuItemIconWrap,
                    { backgroundColor: item.iconBg },
                  ]}
                >
                  <Icon size={18} color={item.iconColor} />
                </View>

                <View style={styles.menuItemTextWrap}>
                  <Text style={[styles.menuItemLabel, { color: colors.foreground }]}>{item.label}</Text>
                  {item.subtitle ? (
                    <Text style={[styles.menuItemSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
              </Pressable>

              {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          );
        })}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  triggerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 160,
  },
  triggerBtnActive: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 20,
    zIndex: 170,
  },
  triggerBtnPressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.9,
  },
  iconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 999,
  },
  menuCard: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 1000,
    elevation: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuItemTextWrap: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  menuItemSubtitle: {
    fontSize: 11,
    marginTop: 1,
    lineHeight: 14,
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
  },
});
