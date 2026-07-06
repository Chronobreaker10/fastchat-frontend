import { computed } from "vue";

import { notificationsApi } from "../api/notifications";
import {
  notificationsState,
  unreadNotificationsCount,
} from "../store/notifications";
import { getErrorMessage } from "../utils/errors";

export function useNotifications() {
  const notifications = computed(() => notificationsState.items);
  const unreadCount = unreadNotificationsCount;
  const loading = computed(() => notificationsState.loading);
  const error = computed(() => notificationsState.error);

  async function loadNotifications(): Promise<void> {
    notificationsState.loading = true;
    notificationsState.error = "";

    try {
      notificationsState.items = await notificationsApi.getAll();
    } catch (err) {
      notificationsState.error = getErrorMessage(err);
    } finally {
      notificationsState.loading = false;
    }
  }

  async function markAsRead(ids: Set<string>): Promise<void> {
    const notifications = notificationsState.items.filter((item) =>
      ids.has(item.id),
    );

    if (notifications.length === 0) {
      return;
    }

    for (const notification of notifications) {
      notification.is_read = true;
    }

    try {
      await notificationsApi.markAsRead(ids);
    } catch {
      for (const notification of notifications) {
        notification.is_read = false;
      }
      throw new Error("Не удалось отметить уведомления как прочитанные");
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    markAsRead,
  };
}
