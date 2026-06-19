<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { clearCurrentUser, sessionState } from "../store/session";
import { createChat, getChatsForUser } from "../api/mockApi";
import { formatDateTime } from "../utils/format";
import { authApi } from "../api/auth";
import { chatApi } from "../api/chats";

const router = useRouter();
const chats = ref([]);
const loading = ref(false);
const errorMessage = ref("");
const createError = ref("");
const createLoading = ref(false);
const createForm = reactive({ title: "" });

const username = computed(
  () => sessionState.currentUser?.username ?? "unknown",
);
const currentUserId = computed(() => sessionState.currentUser?.id ?? "");

async function loadChats() {
  if (!currentUserId.value) {
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  try {
    chats.value = await chatApi.getMyChats();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

async function onCreateChat() {
  createError.value = "";
  if (!createForm.title) {
    createError.value = "Name is required.";
    return;
  }
  if (createForm.title.length < 3) {
    createError.value = "Name must contain at least 3 characters.";
    return;
  }
  if (createForm.title.length > 100) {
    createError.value = "Name must not exceed 100 characters.";
    return;
  }
  createLoading.value = true;
  try {
    const chat = await chatApi.create({ name: createForm.title });
    createForm.title = "";
    await loadChats();
    // router.push(`/chats/${chat.id}`);
  } catch (error) {
    createError.value = error.message;
  } finally {
    createLoading.value = false;
  }
}

async function logout() {
  if (!sessionState.currentUser) {
    return;
  }
  try {
    clearCurrentUser();
    await authApi.logout();
    router.push("/login");
  } catch (error) {
    errorMessage.value = error.message;
  }
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
        <input
          v-model="createForm.title"
          placeholder="Chat title"
          required
          minlength="3"
          maxlength="100"
        />
        <button :disabled="createLoading" type="submit">
          {{ createLoading ? "Creating..." : "Create" }}
        </button>
      </form>
      <p v-if="createError" class="error">{{ createError }}</p>
    </section>

    <section class="card">
      <div class="section-header">
        <h2>Chats list</h2>
        <button class="secondary" :disabled="loading" @click="loadChats">
          Refresh
        </button>
      </div>
      <p v-if="loading">Loading chats...</p>
      <p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-else-if="chats.length === 0">You are not in any chats yet.</p>

      <ul v-else class="chat-list">
        <li v-for="chat in chats" :key="chat.id" class="chat-list-item">
          <RouterLink :to="`/chats/${chat.id}`" class="chat-link">
            <div class="chat-title-row">
              <strong>{{ chat.name }}</strong>
            </div>
            <p v-if="chat.last_message" class="last-message">
              {{ chat.last_message.sender_username }}:
              {{ chat.last_message.text }}
            </p>
            <p v-else class="last-message">No messages yet.</p>
            <p class="meta">
              {{
                chat.last_message
                  ? formatDateTime(chat.last_message.created_at)
                  : "No activity"
              }}
            </p>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
