<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";

import { chatApi } from "../api/chats";
import { useAuth } from "../composables/useAuth";
import { useAsyncAction } from "../composables/useAsyncAction";
import type { Chat } from "../types/chat";
import { formatDateTime } from "../utils/format";
import { getErrorMessage } from "../utils/errors";
import { validateLength, validateRequired } from "../utils/validation";

const { username, logout } = useAuth();

const chats = ref<Chat[]>([]);
const {
  loading,
  error: errorMessage,
  execute: executeLoadChats,
} = useAsyncAction();
const createError = ref("");
const createLoading = ref(false);
const createForm = reactive({ title: "" });

async function loadChats(): Promise<void> {
  await executeLoadChats(async () => {
    chats.value = await chatApi.getMyChats();
  });
}

async function onCreateChat(): Promise<void> {
  createError.value = "";

  const requiredError = validateRequired(createForm.title, "Название");
  if (requiredError) {
    createError.value = requiredError;
    return;
  }

  const lengthError = validateLength(createForm.title, 3, 100, "Название");
  if (lengthError) {
    createError.value = lengthError;
    return;
  }

  createLoading.value = true;

  try {
    await chatApi.create({ name: createForm.title });
    createForm.title = "";
    await loadChats();
  } catch (error) {
    createError.value = getErrorMessage(error);
  } finally {
    createLoading.value = false;
  }
}

async function onLogout(): Promise<void> {
  await logout((message) => {
    errorMessage.value = message;
  });
}

onMounted(loadChats);
</script>

<template>
  <div class="page">
    <header class="topbar card">
      <h1>Мои чаты</h1>
      <div class="topbar-actions">
        <span class="username">{{ username }}</span>
        <button class="secondary" type="button" @click="onLogout">Выйти</button>
      </div>
    </header>

    <section class="card create-chat">
      <h2>Создать чат</h2>
      <form class="inline-form" @submit.prevent="onCreateChat">
        <input
          v-model="createForm.title"
          placeholder="Название чата"
          required
          minlength="3"
          maxlength="100"
        />
        <button :disabled="createLoading" type="submit" class="success">
          {{ createLoading ? "Создание..." : "Создать" }}
        </button>
      </form>
      <p v-if="createError" class="error">{{ createError }}</p>
    </section>

    <section class="card">
      <div class="section-header">
        <h2>Список чатов</h2>
        <button
          class="secondary"
          type="button"
          :disabled="loading"
          @click="loadChats"
        >
          Обновить
        </button>
      </div>
      <p v-if="loading">Загрузка чатов...</p>
      <p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-else-if="chats.length === 0">Вы пока не состоите ни в одном чате.</p>

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
            <p v-else class="last-message">Сообщений пока нет.</p>
            <p class="meta">
              {{
                chat.last_message
                  ? formatDateTime(chat.last_message.created_at)
                  : "Нет активности"
              }}
            </p>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
