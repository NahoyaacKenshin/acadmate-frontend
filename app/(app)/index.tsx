import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useAuthStore } from '@/src/features/auth/auth.store';

export default function HomeScreen() {
  const { user, logout, isLoading } = useAuthStore();

  return (
    <View className="flex-1 bg-background px-6 py-10">
      <Text className="text-3xl font-bold text-foreground">Acadmate is connected</Text>
      <Text className="mt-2 text-base text-muted-foreground">Your frontend can now restore and verify backend auth sessions.</Text>

      <View className="mt-8 rounded-2xl border border-border bg-card p-5">
        <Text className="text-sm font-semibold uppercase text-muted-foreground">Signed in as</Text>
        <Text className="mt-2 text-xl font-bold text-foreground">{user?.name ?? 'Acadmate user'}</Text>
        <Text className="mt-1 text-muted-foreground">{user?.email ?? 'No email returned'}</Text>
        <Text className="mt-1 text-muted-foreground">Role: {user?.role ?? 'USER'}</Text>
      </View>

      <Link href={'/profile' as Href} className="mt-8 text-primary">
        View profile
      </Link>

      <Pressable
        disabled={isLoading}
        onPress={logout}
        className="mt-auto items-center rounded-xl bg-primary py-4 active:opacity-80 disabled:opacity-60"
      >
        <Text className="font-bold text-primary-foreground">Log out</Text>
      </Pressable>
    </View>
  );
}
