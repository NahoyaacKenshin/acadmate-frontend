import { Text, View } from 'react-native';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useUserStore } from '@/src/store/userStore';
import { GraduationCap, BookOpen, CalendarDays, CheckCircle } from 'lucide-react-native';
import AdminDashboardScreen from './admin';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { nickname } = useUserStore();

  // Priority: nickname → first word of account name → fallback
  const displayName = nickname || user?.name?.split(' ')[0] || 'Student';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Good Morning', emoji: '☀️' };
    if (hour >= 12 && hour < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
    if (hour >= 17 && hour < 21) return { text: 'Good Evening', emoji: '🌇' };
    return { text: 'Good Night', emoji: '🌙' };
  };

  const greeting = getGreeting();

  if (user?.role === 'ADMIN') {
    return <AdminDashboardScreen />;
  }

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      {/* Greeting */}
      <View className="mb-8">
        <Text className="text-muted-foreground text-base font-sans">{greeting.text} {greeting.emoji}</Text>
        <Text className="text-3xl font-bold text-foreground font-sans mt-1">
          {displayName} 👋
        </Text>
      </View>

      {/* Quick Stats Cards */}
      <View className="gap-4">
        <View className="flex-row gap-4">
          <View className="flex-1 rounded-2xl border border-border bg-muted p-5">
            <View className="h-10 w-10 rounded-xl bg-primary/20 items-center justify-center mb-3">
              <CheckCircle size={20} color="#6C8EFF" />
            </View>
            <Text className="text-2xl font-bold text-foreground font-sans">0</Text>
            <Text className="text-sm text-muted-foreground font-sans mt-1">Tasks Due</Text>
          </View>

          <View className="flex-1 rounded-2xl border border-border bg-muted p-5">
            <View className="h-10 w-10 rounded-xl bg-primary/20 items-center justify-center mb-3">
              <CalendarDays size={20} color="#6C8EFF" />
            </View>
            <Text className="text-2xl font-bold text-foreground font-sans">0</Text>
            <Text className="text-sm text-muted-foreground font-sans mt-1">Events Today</Text>
          </View>
        </View>

        <View className="flex-row gap-4">
          <View className="flex-1 rounded-2xl border border-border bg-muted p-5">
            <View className="h-10 w-10 rounded-xl bg-primary/20 items-center justify-center mb-3">
              <BookOpen size={20} color="#6C8EFF" />
            </View>
            <Text className="text-2xl font-bold text-foreground font-sans">0</Text>
            <Text className="text-sm text-muted-foreground font-sans mt-1">Notebooks</Text>
          </View>

          <View className="flex-1 rounded-2xl border border-border bg-muted p-5">
            <View className="h-10 w-10 rounded-xl bg-primary/20 items-center justify-center mb-3">
              <GraduationCap size={20} color="#6C8EFF" />
            </View>
            <Text className="text-2xl font-bold text-foreground font-sans">0</Text>
            <Text className="text-sm text-muted-foreground font-sans mt-1">Subjects</Text>
          </View>
        </View>
      </View>

      {/* Activity Placeholder */}
      <View className="mt-8">
        <Text className="text-lg font-bold text-foreground font-sans mb-4">Recent Activity</Text>
        <View className="rounded-2xl border border-border bg-muted p-6 items-center justify-center">
          <Text className="text-muted-foreground font-sans text-center">
            No activity yet. Start by adding tasks or uploading notes!
          </Text>
        </View>
      </View>
    </View>
  );
}
