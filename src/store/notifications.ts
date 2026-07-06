import { computed, reactive } from "vue";

import type { Notification } from "../types/notification";

interface NotificationsState {
  items: Notification[];
  loading: boolean;
  error: string;
}

export const notificationsState = reactive<NotificationsState>({
  items: [],
  loading: false,
  error: "",
});

export const addNotification = (item: Notification) => {
  notificationsState.items.unshift(item);
};

export const unreadNotificationsCount = computed(
  () => notificationsState.items.filter((item) => !item.is_read).length,
);

export function clearNotifications(): void {
  notificationsState.items = [];
  notificationsState.error = "";
}
