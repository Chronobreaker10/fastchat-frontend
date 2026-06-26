<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

import { chatApi } from "../api/chats";
import { useAsyncAction } from "../composables/useAsyncAction";

const route = useRoute();
const router = useRouter();
const { loading, error, execute } = useAsyncAction();

onMounted(async () => {
  await execute(async () => {
    const token = String(route.params.token);
    const response = await chatApi.joinByInvite(token);
    await router.replace(`/chats/${response.details.chat_id}`);
  });
});
</script>

<template>
  <div class="auth-page">
    <div class="card auth-card">
      <h1>Присоединение к чату</h1>
      <p v-if="loading">Присоединение по приглашению...</p>
      <template v-else>
        <p v-if="error" class="error">{{ error }}</p>
        <button @click="router.push('/chats')">К списку чатов</button>
      </template>
    </div>
  </div>
</template>
