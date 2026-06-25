<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { sessionState } from "../store/session";
import { chatApi } from "../api/chats";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const errorMessage = ref("");

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await chatApi.joinByInvite(route.params.token);
    router.replace(`/chats/${response.details.chat_id}`);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="auth-page">
    <div class="card auth-card">
      <h1>Join chat</h1>
      <p v-if="loading">Joining chat via invite...</p>
      <template v-else>
        <p class="error" v-if="errorMessage">{{ errorMessage }}</p>
        <button @click="$router.push('/chats')">Back to chats</button>
      </template>
    </div>
  </div>
</template>
