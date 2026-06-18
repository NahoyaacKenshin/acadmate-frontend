import { Text, View } from 'react-native';
import { useAuthStore } from '@/src/features/auth/auth.store';

export default function ProfileScreen() {
  const { user } = useAuthStore();

  return (
    <View className="flex-1 bg-background px-6 py-10">
      <Text className="text-3xl font-bold text-foreground">Profile</Text>
      <View className="mt-8 gap-3 rounded-2xl border border-border bg-card p-5">
        <Text className="text-foreground">ID: {user?.id ?? 'Unavailable'}</Text>
        <Text className="text-foreground">Name: {user?.name ?? 'Unavailable'}</Text>
        <Text className="text-foreground">Email: {user?.email ?? 'Unavailable'}</Text>
        <Text className="text-foreground">Role: {user?.role ?? 'Unavailable'}</Text>
      </View>
    </View>
  );
}
