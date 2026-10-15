import { Tabs } from 'expo-router';
import { Home, CalendarDays, Book, Settings, ListTodo } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/useTheme';

function TabBarButton(props: any) {
  const { isDark } = useTheme();
  const { style, children, onPress, onLongPress, href, ...rest } = props;

  if (href === null) {
    return null;
  }

  return (
    <Pressable
      {...rest}
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{
        color: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
        borderless: true,
        radius: 28,
      }}
      style={(state: any) => [
        style,
        styles.tabBarButton,
        state.pressed && {
          backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.06)',
          opacity: 0.88,
          transform: [{ scale: 0.95 }],
        },
        state.hovered && !state.pressed && {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(99, 102, 241, 0.04)',
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

export default function AppLayout() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Dynamically calculate bottom offset based on system navigation mode (3-button vs gesture) or iOS home bar
  const bottomOffset = insets.bottom > 0
    ? insets.bottom + (Platform.OS === 'android' ? 10 : 8)
    : (Platform.OS === 'ios' ? 24 : 16);

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.foreground,
        tabBarButton: (props) => <TabBarButton {...props} />,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 8),
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          borderWidth: 0,
          borderRadius: 0,
          shadowOpacity: 0,
          elevation: 0,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter',
          fontSize: 10.5,
          fontWeight: '600',
          marginTop: 3,
          marginBottom: 0,
          includeFontPadding: false,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: colors.mutedForeground,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={21} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <CalendarDays size={21} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => <ListTodo size={21} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="notebook"
        options={{
          title: 'Notebooks',
          tabBarIcon: ({ color }) => <Book size={21} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={21} color={color} strokeWidth={2} />,
        }}
      />
      {/* Hidden full-screen routes — not shown in tab bar */}
      <Tabs.Screen
        name="schedule-upload"
        options={{
          href: null,
          headerShown: false,
          title: 'Scan Schedule',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="schedule-confirm"
        options={{
          href: null,
          headerShown: false,
          title: 'Review Your Schedule',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="task-upload"
        options={{
          href: null,
          headerShown: false,
          title: 'Scan Tasks',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="task-confirm"
        options={{
          href: null,
          headerShown: false,
          title: 'Review Scanned Tasks',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="notebook/[id]"
        options={{
          href: null,
          headerShown: false,
          title: 'Notebook',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="notebook-chat"
        options={{
          href: null,
          headerShown: false,
          title: 'AI Notebook Chat',
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarButton: {
    borderRadius: 12,
    marginHorizontal: 3,
    marginVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
