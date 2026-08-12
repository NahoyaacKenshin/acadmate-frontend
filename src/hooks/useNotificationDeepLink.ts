import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

export function useNotificationDeepLink() {
  useEffect(() => {
    // Handle tapping notification while app is running (foreground/background)
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (!data) return;

      const { type, taskId, notebookId } = data;

      switch (type) {
        case 'class':
          router.push('/(app)/calendar');
          break;
        case 'task':
          router.push('/(app)/tasks');
          break;
        case 'study':
          if (notebookId) {
            router.push({
              pathname: '/(app)/notebook-chat',
              params: { id: notebookId },
            } as any);
          }
          break;
        default:
          break;
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
