<script setup>
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
import {
  addParticipant,
  createInvite,
  deleteChat,
  getChatDetails,
  getChatMessages,
  leaveChat,
  removeParticipant,
  sendMessage,
} from "../api/mockApi";
import { clearCurrentUser, sessionState } from "../store/session";
import { formatDateTime } from "../utils/format";
import { chatApi } from "../api/chats";

const SCROLL_LOAD_THRESHOLD = 80;

const route = useRoute();
const router = useRouter();
const chat = ref(null);
const messages = ref([]);
const loading = ref(false);
const initialMessagesLoading = ref(false);
const loadingOlder = ref(false);
const hasMoreOlder = ref(false);
const errorMessage = ref("");
const messagesScrollRef = ref(null);
const loadMoreSentinelRef = ref(null);
const initialScrollDone = ref(false);
let loadMoreObserver = null;

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
const kickLoadingById = ref({});
const kickError = ref("");
const participantsExpanded = ref(false);

const currentUser = computed(() => sessionState.currentUser);
const isOwner = computed(
  () =>
    chat.value &&
    currentUser.value &&
    chat.value.ownerId === currentUser.value.id,
);

function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

function isScrollAtBottom(el, tolerance = 4) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= tolerance;
}

async function scrollToBottom() {
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

async function loadInitialMessages() {
  initialScrollDone.value = false;
  initialMessagesLoading.value = true;
  try {
    const { messages: page, hasMore } = await getChatMessages(
      route.params.id,
      currentUser.value.id,
    );
    messages.value = page;
    hasMoreOlder.value = hasMore;
    initialMessagesLoading.value = false;
    await nextTick();
    await scrollToBottom();
    initialScrollDone.value = true;
    await nextTick();
    await scrollToBottom();
    setupLoadMoreObserver();
  } catch (error) {
    errorMessage.value = error.message;
    initialMessagesLoading.value = false;
  }
}

async function loadOlderMessages() {
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
  const oldestId = messages.value[0].id;

  loadingOlder.value = true;
  try {
    const { messages: page, hasMore } = await getChatMessages(
      route.params.id,
      currentUser.value.id,
      { before: oldestId },
    );
    messages.value = [...page, ...messages.value];
    hasMoreOlder.value = hasMore;
    await nextTick();
    if (el) {
      el.scrollTop = prevScrollTop + (el.scrollHeight - prevHeight);
    }
    setupLoadMoreObserver();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loadingOlder.value = false;
  }
}

function teardownLoadMoreObserver() {
  loadMoreObserver?.disconnect();
  loadMoreObserver = null;
}

function setupLoadMoreObserver() {
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

function onMessagesScroll(event) {
  const el = event.target;
  if (
    el.scrollTop <= SCROLL_LOAD_THRESHOLD &&
    hasMoreOlder.value &&
    !loadingOlder.value &&
    !initialMessagesLoading.value &&
    initialScrollDone.value
  ) {
    loadOlderMessages();
  }
}

async function loadChatMeta() {
  //chat.value = await getChatDetails(route.params.id, currentUser.value.id);
  chat.value = await chatApi.getChat(route.params.id);
}

async function loadChat() {
  loading.value = true;
  errorMessage.value = "";
  messages.value = [];
  hasMoreOlder.value = false;
  initialScrollDone.value = false;
  teardownLoadMoreObserver();
  chat.value = null;

  //try {
  await loadChatMeta();
  loading.value = false;
  await nextTick();
  await loadInitialMessages();
  // } catch (error) {
  //   errorMessage.value = error.message;
  //   chat.value = null;
  //   loading.value = false;
  // }
}

async function onSendMessage() {
  sendLoading.value = true;
  sendError.value = "";
  try {
    const sent = await sendMessage(
      chat.value.id,
      currentUser.value.id,
      messageText.value,
    );
    messageText.value = "";
    messages.value = [...messages.value, sent];
    await scrollToBottom();
  } catch (error) {
    sendError.value = error.message;
  } finally {
    sendLoading.value = false;
  }
}

async function onAddParticipant() {
  participantLoading.value = true;
  participantError.value = "";
  try {
    await addParticipant(
      chat.value.id,
      currentUser.value.id,
      participantForm.username,
    );
    participantForm.username = "";
    await loadChatMeta();
  } catch (error) {
    participantError.value = error.message;
  } finally {
    participantLoading.value = false;
  }
}

async function onCreateInvite() {
  inviteLoading.value = true;
  inviteError.value = "";
  try {
    const { token } = await createInvite(chat.value.id, currentUser.value.id);
    inviteLink.value = `${window.location.origin}/join/${token}`;
  } catch (error) {
    inviteError.value = error.message;
  } finally {
    inviteLoading.value = false;
  }
}

async function onDeleteChat() {
  if (!window.confirm("Delete this chat? This cannot be undone.")) {
    return;
  }

  deleteLoading.value = true;
  deleteError.value = "";
  try {
    await deleteChat(chat.value.id, currentUser.value.id);
    router.push("/chats");
  } catch (error) {
    deleteError.value = error.message;
  } finally {
    deleteLoading.value = false;
  }
}

async function onLeaveChat() {
  leaveLoading.value = true;
  leaveError.value = "";
  try {
    await leaveChat(chat.value.id, currentUser.value.id);
    router.push("/chats");
  } catch (error) {
    leaveError.value = error.message;
  } finally {
    leaveLoading.value = false;
  }
}

async function onKickParticipant(participantId) {
  kickError.value = "";
  kickLoadingById.value = { ...kickLoadingById.value, [participantId]: true };
  try {
    await removeParticipant(chat.value.id, currentUser.value.id, participantId);
    await loadChatMeta();
  } catch (error) {
    kickError.value = error.message;
  } finally {
    kickLoadingById.value = {
      ...kickLoadingById.value,
      [participantId]: false,
    };
  }
}

function logout() {
  clearCurrentUser();
  router.push("/login");
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
onUnmounted(teardownLoadMoreObserver);
</script>

<template>
  <div class="page chat-page">
    <header class="topbar card">
      <RouterLink class="secondary link-button" to="/chats"
        >Back to chats</RouterLink
      >
      <div class="topbar-actions">
        <span class="username">{{ currentUser?.username }}</span>
        <button class="secondary" @click="logout">Logout</button>
      </div>
    </header>

    <section class="card" v-if="loading">
      <p>Loading chat...</p>
    </section>

    <section class="card" v-else-if="errorMessage && !chat">
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
              Loading older messages...
            </p>
            <p v-else class="messages-load-more meta">
              Scroll up for older messages
            </p>
            <div
              ref="loadMoreSentinelRef"
              class="load-more-sentinel"
              aria-hidden="true"
            />
          </div>

          <p
            v-if="initialMessagesLoading"
            class="messages-load-more messages-loading"
          >
            Loading messages...
          </p>

          <ul class="messages">
            <li
              v-if="!initialMessagesLoading && messages.length === 0"
              class="meta messages-empty"
            >
              No messages yet.
            </li>
            <li
              v-for="message in messages"
              :key="message.id"
              class="message-item"
            >
              <div class="message-head">
                <strong>{{ message.authorUsername }}</strong>
                <span class="meta">{{
                  formatDateTime(message.createdAt)
                }}</span>
              </div>
              <p>{{ message.text }}</p>
            </li>
          </ul>
        </div>
        <form class="message-compose" @submit.prevent="onSendMessage">
          <input
            v-model="messageText"
            placeholder="Type your message..."
            required
          />
          <button :disabled="sendLoading" type="submit">
            {{ sendLoading ? "Sending..." : "Send" }}
          </button>
        </form>
        <p v-if="sendError" class="error message-compose-error">
          {{ sendError }}
        </p>
        <p v-if="errorMessage" class="error message-compose-error">
          {{ errorMessage }}
        </p>
      </section>

      <aside class="card chat-sidebar">
        <h1 class="chat-sidebar-title">{{ chat.title }}</h1>
        <p v-if="chat.messageCount != null" class="meta">
          {{ chat.messageCount }} messages total
        </p>

        <div class="sidebar-section">
          <button
            type="button"
            class="collapsible-toggle"
            :aria-expanded="participantsExpanded"
            @click="participantsExpanded = !participantsExpanded"
          >
            <span>Participants ({{ chat.members.length }})</span>
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
                :key="participant.id"
                class="participant-item"
              >
                <span>
                  {{ participant.username }}
                  <span v-if="participant.id === chat.ownerId" class="meta"
                    >(owner)</span
                  >
                </span>
                <button
                  v-if="isOwner && participant.id !== chat.ownerId"
                  class="danger small"
                  :disabled="kickLoadingById[participant.id]"
                  @click="onKickParticipant(participant.id)"
                >
                  {{ kickLoadingById[participant.id] ? "Removing..." : "Kick" }}
                </button>
              </li>
            </ul>
            <p v-if="kickError" class="error">{{ kickError }}</p>
          </div>
        </div>

        <template v-if="isOwner">
          <div class="sidebar-section">
            <h2 class="sidebar-heading">Invite</h2>
            <div class="invite-row">
              <button :disabled="inviteLoading" @click="onCreateInvite">
                {{ inviteLoading ? "Generating..." : "Generate invite link" }}
              </button>
              <input v-if="inviteLink" :value="inviteLink" readonly />
            </div>
            <p v-if="inviteError" class="error">{{ inviteError }}</p>
          </div>

          <div class="sidebar-section">
            <h2 class="sidebar-heading">Add participant</h2>
            <form class="sidebar-form" @submit.prevent="onAddParticipant">
              <input
                v-model="participantForm.username"
                placeholder="Username to add"
                required
              />
              <button :disabled="participantLoading" type="submit">
                {{ participantLoading ? "Adding..." : "Add" }}
              </button>
            </form>
            <p v-if="participantError" class="error">{{ participantError }}</p>
          </div>

          <button
            class="danger delete-chat-button"
            :disabled="deleteLoading"
            @click="onDeleteChat"
          >
            {{ deleteLoading ? "Deleting..." : "Delete chat" }}
          </button>
          <p v-if="deleteError" class="error">{{ deleteError }}</p>
        </template>

        <template v-else>
          <button
            class="secondary leave-chat-button"
            :disabled="leaveLoading"
            @click="onLeaveChat"
          >
            {{ leaveLoading ? "Leaving..." : "Leave chat" }}
          </button>
          <p v-if="leaveError" class="error">{{ leaveError }}</p>
        </template>
      </aside>
    </div>
  </div>
</template>
