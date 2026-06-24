import { View } from 'react-native';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { LogOut, User, Bell, Info } from 'lucide-react-native';

export default function SettingsScreen() {
  const { user, logout, isLoading } = useAuthStore();

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      {/* Profile Card */}
      <View className="rounded-2xl border border-border bg-muted p-5 mb-8">
        <View className="flex-row items-center gap-4">
          <View className="h-14 w-14 rounded-full bg-primary items-center justify-center">
            <User size={24} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground font-sans">
              {user?.name ?? 'Acadmate User'}
            </Text>
            <Text className="text-sm text-muted-foreground font-sans">
              {user?.email ?? 'No email'}
            </Text>
          </View>
        </View>
      </View>

      {/* Settings Options */}
      <View className="gap-3">
        <View className="flex-row items-center gap-4 rounded-2xl border border-border bg-muted px-5 py-4">
          <Bell size={20} color="#6C8EFF" />
          <Text className="flex-1 text-foreground font-sans text-base">Notifications</Text>
          <Text className="text-muted-foreground font-sans text-sm">Coming Soon</Text>
        </View>

        <View className="flex-row items-center gap-4 rounded-2xl border border-border bg-muted px-5 py-4">
          <Info size={20} color="#6C8EFF" />
          <Text className="flex-1 text-foreground font-sans text-base">About AcadMate</Text>
          <Text className="text-muted-foreground font-sans text-sm">v1.0.0</Text>
        </View>
      </View>

      {/* Sign Out Button */}
      <View className="mt-auto mb-10">
        <Button
          disabled={isLoading}
          onPress={logout}
          variant="destructive"
          className="rounded-2xl h-14 flex-row items-center justify-center gap-3"
        >
          <LogOut size={18} color="#ffffff" />
          <Text className="font-bold text-lg font-sans">Sign Out</Text>
        </Button>
      </View>
    </View>
  );
}
