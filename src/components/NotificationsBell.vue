<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { useNotifications } from "../composables/useNotifications";
import { formatDateTime } from "../utils/format";
import { addNotification } from "../store/notifications";

const props = withDefaults(
  defineProps<{
    autoLoad?: boolean;
  }>(),
  {
    autoLoad: true,
  },
);

const {
  notifications,
  unreadCount,
  loading,
  error,
  loadNotifications,
  markAsRead,
} = useNotifications();

const isOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const markingAsReadIds = ref<Set<string>>(new Set());

const eventSource = new EventSource(
  `https://${import.meta.env.VITE_API_HOST ?? "localhost"}/service/notifications/events`,
  {
    withCredentials: true,
  },
);

function onNewNotification(event: MessageEvent) {
  addNotification({
    ...JSON.parse(event.data),
    read_at: false,
  });
}

eventSource.addEventListener("new_notification", onNewNotification);

const hasUnread = computed(() => unreadCount.value > 0);

function toggleDropdown(): void {
  isOpen.value = !isOpen.value;
}

function onDocumentClick(event: MouseEvent): void {
  if (!isOpen.value || !rootRef.value) {
    return;
  }

  if (!rootRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
}

async function onNotificationMouseEnter(
  id: string,
  isRead: boolean,
): Promise<void> {
  if (isRead || markingAsReadIds.value.has(id)) {
    return;
  }
  markingAsReadIds.value.add(id);
  const notification = notifications.value.find((item) => item.id == id);
  if (notification) notification.is_read = true;
}

const updateNotificationsInterval = setInterval(async () => {
  try {
    if (markingAsReadIds.value.size > 0)
      await markAsRead(markingAsReadIds.value);
  } catch {
    // Ошибка уже обработана в composable (откат is_read).
  } finally {
    markingAsReadIds.value.clear();
  }
}, 5000);

watch(isOpen, (open) => {
  if (open && props.autoLoad) {
    void loadNotifications();
  }
});

onMounted(() => {
  if (props.autoLoad) {
    void loadNotifications();
  }

  document.addEventListener("click", onDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener("click", onDocumentClick);
  eventSource.removeEventListener("new_notification", onNewNotification);
  eventSource.close();
  clearInterval(updateNotificationsInterval);
});
</script>

<template>
  <div ref="rootRef" class="notifications-bell">
    <button
      type="button"
      class="notifications-bell-trigger"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      aria-label="Уведомления"
      @click.stop="toggleDropdown"
    >
      <svg
        class="notifications-bell-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
        />
      </svg>
      <span
        v-if="hasUnread"
        class="notifications-bell-badge"
        aria-hidden="true"
      />
    </button>

    <div v-if="isOpen" class="notifications-dropdown card" @click.stop>
      <div class="notifications-dropdown-header">
        <h2 class="notifications-dropdown-title">Уведомления</h2>
      </div>

      <p v-if="loading" class="notifications-dropdown-message">
        Загрузка уведомлений...
      </p>

      <p v-else-if="error" class="error notifications-dropdown-message">
        {{ error }}
      </p>

      <p
        v-else-if="notifications.length === 0"
        class="notifications-dropdown-message"
      >
        Уведомлений пока нет.
      </p>

      <ul v-else class="notifications-list">
        <li
          v-for="notification in notifications"
          :key="notification.id"
          class="notifications-list-item"
          :class="{ unread: !notification.is_read }"
          @mouseenter="
            onNotificationMouseEnter(notification.id, notification.is_read)
          "
        >
          <span
            v-if="!notification.is_read"
            class="notifications-unread-dot"
            aria-hidden="true"
          />
          <div class="notifications-list-content">
            <p class="notifications-text">{{ notification.body }}</p>
            <p class="meta notifications-time">
              {{ formatDateTime(notification.created_at) }}
            </p>
            <RouterLink
              :to="`/chats/${notification.chat_id}`"
              class="notifications-chat-link"
              @click="isOpen = false"
            >
              {{ notification.chat_id }}
            </RouterLink>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.notifications-bell {
  position: relative;
}

.notifications-bell-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: #e5e7eb;
  color: #111827;
  border-radius: 8px;
}

.notifications-bell-trigger:hover {
  background: #d1d5db;
}

.notifications-bell-icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.notifications-bell-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2563eb;
  border: 2px solid #e5e7eb;
}

.notifications-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  width: min(360px, calc(100vw - 32px));
  padding: 0;
  overflow: hidden;
}

.notifications-dropdown-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.notifications-dropdown-title {
  font-size: 15px;
  font-weight: 600;
}

.notifications-dropdown-message {
  margin: 0;
  padding: 16px;
  font-size: 14px;
  color: #6b7280;
}

.notifications-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 320px;
  overflow-y: auto;
}

.notifications-list-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.notifications-list-item:last-child {
  border-bottom: none;
}

.notifications-list-item.unread {
  background: #f8fafc;
}

.notifications-list-item:hover {
  background: #f3f4f6;
}

.notifications-unread-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: #2563eb;
}

.notifications-list-content {
  min-width: 0;
  flex: 1;
}

.notifications-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}

.notifications-time {
  margin-top: 4px;
}

.notifications-chat-link {
  display: inline-block;
  margin-top: 6px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.notifications-chat-link:hover {
  text-decoration: underline;
}
</style>
