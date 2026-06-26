<script setup lang="ts">
import { reactive, ref } from "vue";
import { RouterLink } from "vue-router";

import { useAuth } from "../composables/useAuth";
import { getErrorMessage } from "../utils/errors";
import { validateLength, validateRequired } from "../utils/validation";

const { registerAndRedirect } = useAuth();

const form = reactive({
  username: "",
  password: "",
  repeatPassword: "",
});
const isSubmitting = ref(false);
const errorMessage = ref("");

async function onSubmit(): Promise<void> {
  errorMessage.value = "";

  const requiredError =
    validateRequired(form.username, "Имя пользователя") ||
    validateRequired(form.password, "Пароль") ||
    validateRequired(form.repeatPassword, "Повтор пароля");

  if (requiredError) {
    errorMessage.value = requiredError;
    return;
  }

  const usernameError = validateLength(
    form.username,
    3,
    100,
    "Имя пользователя",
  );
  if (usernameError) {
    errorMessage.value = usernameError;
    return;
  }

  const passwordError = validateLength(form.password, 5, 100, "Пароль");
  if (passwordError) {
    errorMessage.value = passwordError;
    return;
  }

  if (form.password !== form.repeatPassword) {
    errorMessage.value = "Пароли не совпадают.";
    return;
  }

  isSubmitting.value = true;

  try {
    await registerAndRedirect({
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
      <h1>Регистрация</h1>
      <label>
        Имя пользователя
        <input v-model="form.username" required />
      </label>
      <label>
        Пароль
        <input v-model="form.password" type="password" required />
      </label>
      <label>
        Повторите пароль
        <input v-model="form.repeatPassword" type="password" required />
      </label>
      <button :disabled="isSubmitting" type="submit">
        {{ isSubmitting ? "Создание..." : "Зарегистрироваться" }}
      </button>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p class="helper">
        Уже есть аккаунт?
        <RouterLink to="/login">Войти</RouterLink>
      </p>
    </form>
  </div>
</template>
