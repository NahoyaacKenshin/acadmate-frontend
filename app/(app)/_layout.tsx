import { Tabs } from 'expo-router';
import { Home, CalendarDays, Book, Settings, ListTodo } from 'lucide-react-native';
import { Platform } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';

export default function AppLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.foreground,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 16,
          right: 16,
          height: 66,
          borderRadius: 22,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 14,
          elevation: 6,
          paddingTop: 7,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter',
          fontSize: 10.5,
          fontWeight: '600',
          marginTop: 3,
          marginBottom: 0,
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
        options={{ href: null, headerShown: false, title: 'Scan Schedule' }}
      />
      <Tabs.Screen
        name="schedule-confirm"
        options={{ href: null, headerShown: false, title: 'Review Your Schedule' }}
      />
      <Tabs.Screen
        name="notebook/[id]"
        options={{ href: null, headerShown: false, title: 'Notebook' }}
      />
      <Tabs.Screen
        name="notebook-chat"
        options={{ href: null, headerShown: false, title: 'AI Notebook Chat' }}
      />
    </Tabs>
  );
}
