import { Tabs } from 'expo-router';
import { Home, CalendarDays, Book, Settings, ListTodo, WifiOff } from 'lucide-react-native';
import { View, StyleSheet, Platform } from 'react-native';
import { useStatus } from '@powersync/react';
import { useSystemStore } from '@/src/store/systemStore';
import { Text } from '@/src/components/ui/text';

export default function AppLayout() {
  const { isOnline } = useSystemStore();
  const powerSyncStatus = useStatus();
  const isDisconnected = !isOnline || (powerSyncStatus && !powerSyncStatus.connected);

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
      {isDisconnected && (
        <View style={styles.offlineBannerAbsolute} pointerEvents="none">
          <WifiOff size={14} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.offlineText}>Offline: Changes saved locally & will sync when reconnected.</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  offlineBannerAbsolute: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 16,
    right: 16,
    backgroundColor: '#D97706',
    paddingVertical: 9,
    paddingHorizontal: 14,
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
    fontSize: 12,
    fontWeight: '600',
  }
});

