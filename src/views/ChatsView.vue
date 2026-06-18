<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { clearCurrentUser, sessionState } from "../store/session";
import { createChat, getChatsForUser } from "../api/mockApi";
import { formatDateTime } from "../utils/format";

const router = useRouter();
const chats = ref([]);
const loading = ref(false);
const errorMessage = ref("");
const createError = ref("");
const createLoading = ref(false);
const createForm = reactive({ title: "" });

const username = computed(() => sessionState.currentUser?.username ?? "unknown");
const currentUserId = computed(() => sessionState.currentUser?.id ?? "");

async function loadChats() {
  if (!currentUserId.value) {
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  try {
    chats.value = await getChatsForUser(currentUserId.value);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

async function onCreateChat() {
  createLoading.value = true;
  createError.value = "";
  try {
    const chat = await createChat(currentUserId.value, createForm.title);
    createForm.title = "";
    router.push(`/chats/${chat.id}`);
  } catch (error) {
    createError.value = error.message;
  } finally {
    createLoading.value = false;
  }
}

function logout() {
  clearCurrentUser();
  router.push("/login");
}

onMounted(loadChats);
</script>

<template>
  <div class="page">
    <header class="topbar card">
      <h1>My chats</h1>
      <div class="topbar-actions">
        <span class="username">{{ username }}</span>
        <button class="secondary" @click="logout">Logout</button>
      </div>
    </header>

    <section class="card create-chat">
      <h2>Create chat</h2>
      <form @submit.prevent="onCreateChat" class="inline-form">
        <input v-model="createForm.title" placeholder="Chat title" required />
        <button :disabled="createLoading" type="submit">
          {{ createLoading ? "Creating..." : "Create" }}
        </button>
      </form>
      <p v-if="createError" class="error">{{ createError }}</p>
    </section>

    <section class="card">
      <div class="section-header">
        <h2>Chats list</h2>
        <button class="secondary" :disabled="loading" @click="loadChats">Refresh</button>
      </div>
      <p v-if="loading">Loading chats...</p>
      <p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-else-if="chats.length === 0">You are not in any chats yet.</p>

      <ul v-else class="chat-list">
        <li v-for="chat in chats" :key="chat.id" class="chat-list-item">
          <RouterLink :to="`/chats/${chat.id}`" class="chat-link">
            <div class="chat-title-row">
              <strong>{{ chat.title }}</strong>
              <span class="meta">{{ chat.participantCount }} participants</span>
            </div>
            <p v-if="chat.lastMessage" class="last-message">
              {{ chat.lastMessage.authorUsername }}: {{ chat.lastMessage.text }}
            </p>
            <p v-else class="last-message">No messages yet.</p>
            <p class="meta">
              {{
                chat.lastMessage
                  ? formatDateTime(chat.lastMessage.createdAt)
                  : "No activity"
              }}
            </p>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
