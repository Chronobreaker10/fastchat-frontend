<script setup lang="ts">
import { reactive, ref } from "vue";
import { RouterLink } from "vue-router";

import { useAuth } from "../composables/useAuth";
import { getErrorMessage } from "../utils/errors";

const { loginAndRedirect } = useAuth();

const form = reactive({
  username: "",
  password: "",
});
const isSubmitting = ref(false);
const errorMessage = ref("");

async function onSubmit(): Promise<void> {
  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    await loginAndRedirect({
      username: form.username,
      password: form.password,
    });
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <form class="card auth-card" @submit.prevent="onSubmit">
      <h1>Вход в FastChat</h1>
      <label>
        Имя пользователя
        <input v-model="form.username" required />
      </label>
      <label>
        Пароль
        <input v-model="form.password" type="password" required />
      </label>
      <button :disabled="isSubmitting" type="submit">
        {{ isSubmitting ? "Вход..." : "Войти" }}
      </button>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p class="helper">
        Нет аккаунта?
        <RouterLink to="/register">Зарегистрироваться</RouterLink>
      </p>
    </form>
  </div>
</template>
