import { Tabs } from 'expo-router';
import { Home, CalendarDays, Book, Settings, ListTodo } from 'lucide-react-native';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: '#10131C',
        },
        headerTintColor: '#ffffff',
        tabBarStyle: {
          backgroundColor: '#10131C',
          borderTopColor: '#2A3143',
        },
        tabBarActiveTintColor: '#6C8EFF',
        tabBarInactiveTintColor: '#94A3B8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => <ListTodo size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notebook"
        options={{
          title: 'Notebook',
          tabBarIcon: ({ color, size }) => <Book size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
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


