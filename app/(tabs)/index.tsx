import { useQuery } from '@powersync/react';
import { FlatList, Pressable, Text, View } from 'react-native';

interface UserRow {
  id: string;
  name: string;
  email: string;
}

export default function TabOneScreen() {
  // Real-time reactive query hooked to local SQLite state.
  // Updates instantaneously if backend changes stream down.
  const { data: users } = useQuery<UserRow>("SELECT * FROM users ORDER BY created_at DESC");

  return (
    <View className="flex-1 bg-background p-6 justify-center">
      <Text className="text-2xl font-sans font-bold text-foreground mb-4">
        Acadmate Sync Node
      </Text>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="p-4 border border-border bg-popover rounded-xl mb-3">
            <Text className="text-base font-semibold text-foreground">{item.name}</Text>
            <Text className="text-sm text-muted-foreground">{item.email}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text className="text-sm text-muted-foreground italic p-4 text-center">
            No local records synced yet.
          </Text>
        }
      />

      <Pressable 
        className="w-full bg-primary py-4 rounded-xl items-center active:opacity-80"
        onPress={() => console.log('Insert local write to powerSync database')}
      >
        <Text className="text-primary-foreground font-bold font-sans">
          Trigger Local Database Write
        </Text>
      </Pressable>
    </View>
  );
}