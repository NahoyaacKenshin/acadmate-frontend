import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Text } from '@/src/components/ui/text';
import { Bell, BookOpen, CheckSquare, Sparkles, X, GraduationCap } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface ActiveNotification {
  id: string;
  title: string;
  body: string;
  data: Record<string, any>;
}

export function InAppNotificationBanner() {
  const insets = useSafeAreaInsets();
  const [activeNotification, setActiveNotification] = useState<ActiveNotification | null>(null);
  const translateY = useSharedValue(-150);
  const opacity = useSharedValue(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    translateY.value = withTiming(-150, { duration: 250 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setActiveNotification)(null);
    });
  };

  const handlePress = () => {
    if (!activeNotification) return;
    const { data } = activeNotification;
    dismiss();

    if (!data) return;
    const { type, notebookId } = data;
    if (type === 'class' || type === 'exam' || type === 'exam_week') {
      router.push('/(app)/calendar');
    } else if (type === 'task') {
      router.push('/(app)/tasks');
    } else if (type === 'study' && notebookId) {
      router.push({
        pathname: '/(app)/notebook-chat',
        params: { id: notebookId },
      } as any);
    }
  };

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const { request } = notification;
      const content = request.content;

      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      setActiveNotification({
        id: request.identifier,
        title: content.title || 'AcadMate Alert',
        body: content.body || '',
        data: (content.data as Record<string, any>) || {},
      });

      translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 200 });

      // Auto dismiss after 4.5 seconds
      dismissTimerRef.current = setTimeout(() => {
        dismiss();
      }, 4500);
    });

    return () => {
      subscription.remove();
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!activeNotification) return null;

  const type = activeNotification.data?.type;
  let IconComponent = Bell;
  let iconColor = '#6C8EFF';
  let badgeBg = 'rgba(108, 142, 255, 0.15)';

  if (type === 'class') {
    IconComponent = Bell;
    iconColor = '#6C8EFF';
    badgeBg = 'rgba(108, 142, 255, 0.15)';
  } else if (type === 'task') {
    IconComponent = CheckSquare;
    iconColor = '#10B981';
    badgeBg = 'rgba(16, 185, 129, 0.15)';
  } else if (type === 'study') {
    IconComponent = BookOpen;
    iconColor = '#A78BFA';
    badgeBg = 'rgba(167, 139, 250, 0.15)';
  } else if (type === 'exam' || type === 'exam_week') {
    IconComponent = GraduationCap;
    iconColor = '#8B5CF6';
    badgeBg = 'rgba(139, 92, 246, 0.15)';
  } else if (type === 'test') {
    IconComponent = Sparkles;
    iconColor = '#F59E0B';
    badgeBg = 'rgba(245, 158, 11, 0.15)';
  }

  const topOffset = Math.max(insets.top, Platform.OS === 'android' ? 12 : 8) + 6;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: topOffset },
        animatedStyle,
      ]}
    >
      <Pressable style={styles.content} onPress={handlePress}>
        <View style={[styles.iconBadge, { backgroundColor: badgeBg }]}>
          <IconComponent size={20} color={iconColor} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {activeNotification.title}
          </Text>
          {activeNotification.body ? (
            <Text style={styles.body} numberOfLines={2}>
              {activeNotification.body}
            </Text>
          ) : null}
        </View>

        <Pressable
          style={styles.closeBtn}
          onPress={(e) => {
            e.stopPropagation();
            dismiss();
          }}
        >
          <X size={16} color="#94A3B8" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A26',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A3143',
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  body: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 6,
  },
});
