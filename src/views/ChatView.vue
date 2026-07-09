<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { chatApi } from "../api/chats";
import { messageApi } from "../api/messages";
import NotificationsBell from "../components/NotificationsBell.vue";
import MessageStatusIndicator from "../components/MessageStatusIndicator.vue";
import { useAuth } from "../composables/useAuth";
import { useKeyedAsyncAction } from "../composables/useAsyncAction";
import type { ChatMember, ChatRead } from "../types/chat";
import type {
  ChatWebSocketPayload,
  MessagePayload,
  MessageWithSender,
} from "../types/message";
import { formatDateTime } from "../utils/format";
import { getErrorMessage } from "../utils/errors";

const SCROLL_LOAD_THRESHOLD = 80;

const route = useRoute();
const router = useRouter();
const { currentUser, username, logout } = useAuth();

const chat = ref<ChatRead | null>(null);
const messages = ref<MessageWithSender[]>([]);
const loading = ref(false);
const loadingOlder = ref(false);
const hasMoreOlder = ref(false);
const errorMessage = ref("");
const messagesScrollRef = ref<HTMLElement | null>(null);
const loadMoreSentinelRef = ref<HTMLElement | null>(null);
const initialScrollDone = ref(false);
let loadMoreObserver: IntersectionObserver | null = null;

const messageText = ref("");
const sendLoading = ref(false);
const sendError = ref("");

const participantForm = reactive({ username: "" });
const participantLoading = ref(false);
const participantError = ref("");

const inviteLoading = ref(false);
const inviteError = ref("");
const inviteLink = ref("");

const deleteLoading = ref(false);
const deleteError = ref("");
const leaveLoading = ref(false);
const leaveError = ref("");
const kickError = ref("");
const deleteMessageError = ref("");
const editMessageError = ref("");
const editingMessageId = ref<number | null>(null);
const editText = ref("");
const participantsExpanded = ref(false);

const { loadingByKey: kickLoadingById, execute: executeKick } =
  useKeyedAsyncAction();
const {
  loadingByKey: deleteMessageLoadingById,
  execute: executeDeleteMessage,
} = useKeyedAsyncAction();
const { loadingByKey: editMessageLoadingById, execute: executeEditMessage } =
  useKeyedAsyncAction();

const chatId = computed(() => String(route.params.id));

const ws = new WebSocket(
  `wss://${import.meta.env.VITE_API_HOST ?? "localhost"}/api/v1/chats/${chatId.value}/ws`,
);

ws.onmessage = (event: MessageEvent<string>) => {
  const data = JSON.parse(event.data) as ChatWebSocketPayload;

  switch (data.event) {
    case "message_deleted": {
      messages.value = messages.value.filter(
        (message) => message.id !== data.payload,
      );
      break;
    }
    case "message_updated": {
      const updatedMessage = data.payload as MessagePayload;
      messages.value = messages.value.map((message) =>
        message.id === updatedMessage.message.id
          ? { ...message, text: updatedMessage.message.text }
          : message,
      );
      break;
    }
    case "sent_message": {
      const newMessage = data.payload as MessagePayload;
      const index = messages.value.findIndex(
        (item) => item.temp_id === newMessage.temp_id,
      );
      if (index !== -1) {
        messages.value[index] = newMessage.message;
      } else {
        messages.value.push(newMessage.message);
        scrollToBottom();
        ws.send(
          JSON.stringify({
            action: "message_read",
            payload: {
              message_id: newMessage.message.id,
            },
          }),
        );
      }
      break;
    }
    case "left_user":
    case "joined_user": {
      messages.value = [
        ...messages.value,
        {
          text: data.payload as string,
          created_at: new Date().toISOString(),
          is_system: true,
        },
      ];
      if (data.event === "left_user" && chat.value) {
        chat.value.members = chat.value.members.filter(
          (member) => member.user.id !== data.details,
        );
      }
      if (data.event === "joined_user") {
        chat.value?.members.push(data.details as ChatMember);
      }
      scrollToBottom();
      break;
    }
    case "connect_user":
      chat.value?.online_members.push(data.payload as number);
      break;
    case "disconnect_user": {
      if (chat.value) {
        chat.value.online_members = chat.value.online_members.filter(
          (item) => item !== data.payload,
        );
      }
      break;
    }
    case "read_message": {
      const messageIds = data.payload as number[];
      messages.value = messages.value.map((message) =>
        message.id && messageIds.includes(message.id)
          ? { ...message, message_status: "READ" }
          : message,
      );
      break;
    }
  }
};

const isOwner = computed(
  () =>
    chat.value != null &&
    currentUser.value != null &&
    chat.value.user_id === currentUser.value.id,
);

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function isScrollAtBottom(el: HTMLElement, tolerance = 4): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= tolerance;
}

async function scrollToBottom(): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await nextTick();
    await waitForPaint();

    const el = messagesScrollRef.value;
    if (!el) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      continue;
    }

    el.scrollTop = el.scrollHeight;

    if (isScrollAtBottom(el)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function loadInitialMessages(chatData: ChatRead): Promise<void> {
  initialScrollDone.value = false;
  messages.value = chatData.messages;
  hasMoreOlder.value = messages.value.length <= chatData.total_messages;
  await nextTick();
  await scrollToBottom();
  initialScrollDone.value = true;
  await nextTick();
  await scrollToBottom();
  setupLoadMoreObserver();
}

async function loadOlderMessages(): Promise<void> {
  if (
    !initialScrollDone.value ||
    !hasMoreOlder.value ||
    loadingOlder.value ||
    messages.value.length === 0
  ) {
    return;
  }

  const el = messagesScrollRef.value;
  const prevHeight = el?.scrollHeight ?? 0;
  const prevScrollTop = el?.scrollTop ?? 0;
  const oldestMessage = messages.value[0];

  if (!oldestMessage.id) {
    return;
  }

  loadingOlder.value = true;

  try {
    const response = await chatApi.getChatMessages(chatId.value, {
      date: oldestMessage.created_at,
      entity_id: String(oldestMessage.id),
    });
    messages.value = [...response, ...messages.value];
    hasMoreOlder.value = response.length >= 10;
    await nextTick();

    if (el) {
      el.scrollTop = prevScrollTop + (el.scrollHeight - prevHeight);
    }

    setupLoadMoreObserver();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loadingOlder.value = false;
  }
}

function teardownLoadMoreObserver(): void {
  loadMoreObserver?.disconnect();
  loadMoreObserver = null;
}

function setupLoadMoreObserver(): void {
  teardownLoadMoreObserver();

  const root = messagesScrollRef.value;
  const sentinel = loadMoreSentinelRef.value;

  if (!root || !sentinel || !hasMoreOlder.value || !initialScrollDone.value) {
    return;
  }

  loadMoreObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && !isScrollAtBottom(root)) {
        loadOlderMessages();
      }
    },
    { root, rootMargin: "0px", threshold: 0 },
  );
  loadMoreObserver.observe(sentinel);
}

function onMessagesScroll(event: Event): void {
  const el = event.target as HTMLElement;

  if (
    el.scrollTop <= SCROLL_LOAD_THRESHOLD &&
    hasMoreOlder.value &&
    !loadingOlder.value &&
    initialScrollDone.value
  ) {
    loadOlderMessages();
  }
}

async function loadChatMeta(): Promise<void> {
  chat.value = await chatApi.getChat(chatId.value);
}

async function loadChat(): Promise<void> {
  loading.value = true;
  errorMessage.value = "";
  messages.value = [];
  hasMoreOlder.value = false;
  initialScrollDone.value = false;
  teardownLoadMoreObserver();
  onCancelEdit();
  chat.value = null;

  try {
    await loadChatMeta();
    loading.value = false;
    await nextTick();

    if (chat.value) {
      await loadInitialMessages(chat.value);
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
    chat.value = null;
    loading.value = false;
  }
}

async function onSendMessage(): Promise<void> {
  if (!chat.value) {
    return;
  }

  sendLoading.value = true;
  sendError.value = "";

  try {
    const tempId = crypto.randomUUID();

    const newMessage: MessageWithSender = {
      temp_id: tempId,
      chat_id: chat.value.id,
      text: messageText.value,
      created_at: new Date().toISOString(),
      sender: currentUser.value ?? undefined,
      message_status: "SENDING",
      is_system: false,
    };
    messages.value.push(newMessage);
    await scrollToBottom();

    await messageApi.send({
      temp_id: tempId,
      chat_id: chat.value.id,
      text: messageText.value,
    });
    messageText.value = "";
    //ws.send(JSON.stringify(newMessage));
  } catch (error) {
    sendError.value = getErrorMessage(error);
  } finally {
    sendLoading.value = false;
  }
}

async function onAddParticipant(): Promise<void> {
  if (!chat.value) {
    return;
  }

  participantLoading.value = true;
  participantError.value = "";

  try {
    await chatApi.inviteToChat(chat.value.id, participantForm.username);
    participantForm.username = "";
    await loadChatMeta();
  } catch (error) {
    participantError.value = getErrorMessage(error);
  } finally {
    participantLoading.value = false;
  }
}

async function onCreateInvite(): Promise<void> {
  if (!chat.value) {
    return;
  }

  inviteLoading.value = true;
  inviteError.value = "";

  try {
    const { token } = await chatApi.getInviteToken(chat.value.id);
    inviteLink.value = `${window.location.origin}/join/${token}`;
  } catch (error) {
    inviteError.value = getErrorMessage(error);
  } finally {
    inviteLoading.value = false;
  }
}

async function onDeleteChat(): Promise<void> {
  if (
    !chat.value ||
    !window.confirm("Удалить этот чат? Это действие необратимо.")
  ) {
    return;
  }

  deleteLoading.value = true;
  deleteError.value = "";

  try {
    await chatApi.deleteChat(chat.value.id);
    await router.push("/chats");
  } catch (error) {
    deleteError.value = getErrorMessage(error);
  } finally {
    deleteLoading.value = false;
  }
}

async function onLeaveChat(): Promise<void> {
  if (!chat.value) {
    return;
  }

  leaveLoading.value = true;
  leaveError.value = "";

  try {
    await chatApi.leaveChat(chat.value.id);
    await router.push("/chats");
  } catch (error) {
    leaveError.value = getErrorMessage(error);
  } finally {
    leaveLoading.value = false;
  }
}

function canEditMessage(message: MessageWithSender): boolean {
  return (
    !message.is_system &&
    message.id != null &&
    message.sender?.id === currentUser.value?.id
  );
}

function onStartEdit(message: MessageWithSender): void {
  if (message.id == null) {
    return;
  }

  editMessageError.value = "";
  editingMessageId.value = message.id;
  editText.value = message.text;
}

function onCancelEdit(): void {
  editingMessageId.value = null;
  editText.value = "";
  editMessageError.value = "";
}

async function onSaveEdit(messageId: number): Promise<void> {
  const trimmedText = editText.value.trim();

  if (!trimmedText) {
    editMessageError.value = "Текст сообщения не может быть пустым.";
    return;
  }

  editMessageError.value = "";

  await executeEditMessage(
    messageId,
    async () => {
      const response = await messageApi.update(messageId, {
        text: trimmedText,
      });
      const updatedMessage = response.details.message;

      messages.value = messages.value.map((message) =>
        message.id === messageId
          ? { ...message, text: updatedMessage.text }
          : message,
      );
      onCancelEdit();
    },
    (message) => {
      editMessageError.value = message;
    },
  );
}

async function onDeleteMessage(messageId: number): Promise<void> {
  if (!window.confirm("Удалить это сообщение?")) {
    return;
  }

  deleteMessageError.value = "";

  await executeDeleteMessage(
    messageId,
    async () => {
      await messageApi.delete(messageId);
      messages.value = messages.value.filter(
        (message) => message.id !== messageId,
      );
    },
    (message) => {
      deleteMessageError.value = message;
    },
  );
}

async function onKickParticipant(participantId: number): Promise<void> {
  if (!chat.value) {
    return;
  }

  kickError.value = "";

  await executeKick(
    participantId,
    async () => {
      await chatApi.kickMember(chat.value!.id, participantId);
      await loadChatMeta();
    },
    (message) => {
      kickError.value = message;
    },
  );
}

async function onLogout(): Promise<void> {
  await logout((message) => {
    errorMessage.value = message;
  });
}

watch(
  () => route.params.id,
  () => {
    if (currentUser.value) {
      loadChat();
    }
  },
);

watch(hasMoreOlder, (hasMore) => {
  if (!hasMore) {
    teardownLoadMoreObserver();
    return;
  }

  nextTick(() => setupLoadMoreObserver());
});

onMounted(loadChat);
onUnmounted(() => {
  ws.close();
  teardownLoadMoreObserver();
});
</script>

<template>
  <div class="page chat-page">
    <header class="topbar card">
      <RouterLink class="secondary link-button" to="/chats">
        К списку чатов
      </RouterLink>
      <div class="topbar-actions">
        <NotificationsBell />
        <span class="username">{{ username }}</span>
        <button class="secondary" type="button" @click="onLogout">Выйти</button>
      </div>
    </header>

    <section v-if="loading" class="card">
      <p>Загрузка чата...</p>
    </section>

    <section v-else-if="errorMessage && !chat" class="card">
      <p class="error">{{ errorMessage }}</p>
    </section>

    <div v-else-if="chat" class="chat-layout">
      <section class="card chat-messages-panel">
        <div
          ref="messagesScrollRef"
          class="messages-scroll"
          @scroll.passive="onMessagesScroll"
        >
          <div
            v-if="hasMoreOlder && initialScrollDone"
            class="messages-scroll-top"
          >
            <p v-if="loadingOlder" class="messages-load-more">
              Загрузка старых сообщений...
            </p>
            <p v-else class="messages-load-more meta">
              Прокрутите вверх, чтобы загрузить более ранние сообщения
            </p>
            <div
              ref="loadMoreSentinelRef"
              class="load-more-sentinel"
              aria-hidden="true"
            />
          </div>

          <ul class="messages">
            <li v-if="messages.length === 0" class="meta messages-empty">
              Сообщений пока нет.
            </li>
            <li
              v-for="message in messages"
              :key="message.id ?? message.created_at"
              class="message-item"
            >
              <div class="message-head">
                <strong v-if="!message.is_system">{{
                  message.sender?.username
                }}</strong>
                <span class="meta">{{
                  formatDateTime(message.created_at)
                }}</span>
              </div>
              <div class="message-body">
                <form
                  v-if="editingMessageId === message.id"
                  class="message-edit-form"
                  @submit.prevent="onSaveEdit(message.id!)"
                >
                  <input
                    v-model="editText"
                    required
                    :disabled="editMessageLoadingById[message.id!]"
                  />
                  <div class="message-edit-actions">
                    <button
                      type="submit"
                      class="small"
                      :disabled="editMessageLoadingById[message.id!]"
                    >
                      {{
                        editMessageLoadingById[message.id!]
                          ? "Сохранение..."
                          : "Сохранить"
                      }}
                    </button>
                    <button
                      type="button"
                      class="secondary small"
                      :disabled="editMessageLoadingById[message.id!]"
                      @click="onCancelEdit"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
                <template v-else>
                  <p>{{ message.text }}</p>
                  <div
                    v-if="canEditMessage(message) && message.id != null"
                    class="message-actions"
                  >
                    <button
                      type="button"
                      class="message-edit-btn"
                      :disabled="editMessageLoadingById[message.id]"
                      title="Редактировать сообщение"
                      aria-label="Редактировать сообщение"
                      @click="onStartEdit(message)"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path
                          d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                        />
                        <path
                          d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="message-delete-btn"
                      :disabled="deleteMessageLoadingById[message.id]"
                      :title="
                        deleteMessageLoadingById[message.id]
                          ? 'Удаление...'
                          : 'Удалить сообщение'
                      "
                      :aria-label="
                        deleteMessageLoadingById[message.id]
                          ? 'Удаление сообщения'
                          : 'Удалить сообщение'
                      "
                      @click="onDeleteMessage(message.id)"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path
                          d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                        />
                      </svg>
                    </button>
                  </div>
                </template>
              </div>
              <div class="message-foot">
                <MessageStatusIndicator
                  v-if="message.message_status"
                  :status="message.message_status"
                />
              </div>
            </li>
          </ul>
        </div>
        <form class="message-compose" @submit.prevent="onSendMessage">
          <input
            v-model="messageText"
            placeholder="Введите сообщение..."
            required
          />
          <button :disabled="sendLoading" type="submit">
            {{ sendLoading ? "Отправка..." : "Отправить" }}
          </button>
        </form>
        <p v-if="sendError" class="error message-compose-error">
          {{ sendError }}
        </p>
        <p v-if="errorMessage" class="error message-compose-error">
          {{ errorMessage }}
        </p>
        <p v-if="deleteMessageError" class="error message-compose-error">
          {{ deleteMessageError }}
        </p>
        <p v-if="editMessageError" class="error message-compose-error">
          {{ editMessageError }}
        </p>
      </section>

      <aside class="card chat-sidebar">
        <h1 class="chat-sidebar-title">{{ chat.name }}</h1>
        <p class="meta">
          Сейчас в чате {{ chat.online_members.length }} пользователей.
        </p>
        <p v-if="chat.total_messages != null" class="meta">
          Всего сообщений: {{ chat.total_messages }}
        </p>

        <div class="sidebar-section">
          <button
            type="button"
            class="collapsible-toggle"
            :aria-expanded="participantsExpanded"
            @click="participantsExpanded = !participantsExpanded"
          >
            <span>Участники ({{ chat.members.length }})</span>
            <span
              class="collapsible-chevron"
              :class="{ expanded: participantsExpanded }"
              >▼</span
            >
          </button>
          <div v-show="participantsExpanded" class="collapsible-body">
            <ul class="participants-list">
              <li
                v-for="participant in chat.members"
                :key="participant.user.id"
                class="participant-item"
              >
                <div class="d-flex align-items-center">
                  <span
                    class="online-indicator"
                    :class="[
                      chat.online_members.includes(participant.user.id)
                        ? 'online-color'
                        : 'offline-color',
                    ]"
                  ></span>
                  {{ participant.user.username }}
                  <span
                    v-if="participant.user.id === chat.user_id"
                    class="member-meta"
                    >(владелец)</span
                  >
                </div>
                <button
                  v-if="isOwner && participant.user.id !== chat.user_id"
                  class="danger small"
                  type="button"
                  :disabled="kickLoadingById[participant.user.id]"
                  @click="onKickParticipant(participant.user.id)"
                >
                  {{
                    kickLoadingById[participant.user.id]
                      ? "Удаление..."
                      : "Исключить"
                  }}
                </button>
              </li>
            </ul>
            <p v-if="kickError" class="error">{{ kickError }}</p>
          </div>
        </div>

        <div class="sidebar-section">
          <h2 class="sidebar-heading">Приглашение</h2>
          <div class="invite-row">
            <button
              type="button"
              :disabled="inviteLoading"
              @click="onCreateInvite"
            >
              {{ inviteLoading ? "Создание..." : "Создать ссылку-приглашение" }}
            </button>
            <input v-if="inviteLink" :value="inviteLink" readonly />
          </div>
          <p v-if="inviteError" class="error">{{ inviteError }}</p>
        </div>

        <div class="sidebar-section">
          <h2 class="sidebar-heading">Добавить участника</h2>
          <form class="sidebar-form" @submit.prevent="onAddParticipant">
            <input
              v-model="participantForm.username"
              placeholder="Имя пользователя"
              required
            />
            <button
              :disabled="participantLoading"
              type="submit"
              class="success"
            >
              {{ participantLoading ? "Добавление..." : "Добавить" }}
            </button>
          </form>
          <p v-if="participantError" class="error">{{ participantError }}</p>
        </div>

        <template v-if="isOwner">
          <button
            class="danger delete-chat-button"
            type="button"
            :disabled="deleteLoading"
            @click="onDeleteChat"
          >
            {{ deleteLoading ? "Удаление..." : "Удалить чат" }}
          </button>
          <p v-if="deleteError" class="error">{{ deleteError }}</p>
        </template>

        <template v-else>
          <button
            class="secondary leave-chat-button"
            type="button"
            :disabled="leaveLoading"
            @click="onLeaveChat"
          >
            {{ leaveLoading ? "Выход..." : "Покинуть чат" }}
          </button>
          <p v-if="leaveError" class="error">{{ leaveError }}</p>
        </template>
      </aside>
    </div>
  </div>
</template>
