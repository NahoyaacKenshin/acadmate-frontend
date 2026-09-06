import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

export function useNotificationDeepLink() {
  useEffect(() => {
    function handleNotificationResponse(response: Notifications.NotificationResponse) {
      const data = response.notification?.request?.content?.data;
      if (!data) return;

      const { type, notebookId } = data;

      switch (type) {
        case 'class':
        case 'exam':
        case 'exam_week':
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
    }

    // 1. Cold start: check if app was opened via notification tap
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationResponse(response);
      }
    });

    // 2. Foreground / background tap listener
    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      subscription.remove();
    };
  }, []);
}

