import { Tabs } from 'expo-router';
import { Home, CalendarDays, Book, Settings, ListTodo, WifiOff } from 'lucide-react-native';
import { View, StyleSheet, Platform } from 'react-native';
import { useSystemStore } from '@/src/store/systemStore';
import { Text } from '@/src/components/ui/text';

export default function AppLayout() {
  const { isOnline } = useSystemStore();

  return (
    <>
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
      {!isOnline && (
        <View style={styles.offlineBannerAbsolute} pointerEvents="none">
          <WifiOff size={16} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.offlineText}>Offline: AI features unavailable. Changes will sync later.</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  offlineBannerAbsolute: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    backgroundColor: '#F59E0B',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 999,
  },
  offlineText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  }
});
