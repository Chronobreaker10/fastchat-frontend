<script setup>
import { reactive, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { setCurrentUser } from "../store/session";
import { authApi } from "../api/auth";

const router = useRouter();
const form = reactive({
  username: "",
  password: "",
  repeatPassword: "",
});
const isSubmitting = ref(false);
const errorMessage = ref("");

async function onSubmit() {
  errorMessage.value = "";
  const trimmed = form.username.trim();
  if (!trimmed) {
    errorMessage.value = "Username is required.";
    return;
  }
  if (trimmed.length < 3) {
    errorMessage.value = "Username must contain at least 3 characters.";
    return;
  }
  if (trimmed.length > 100) {
    errorMessage.value = "Username must not exceed 100 characters.";
    return;
  }
  if (form.password.length < 5) {
    errorMessage.value = "Password must contain at least 5 characters.";
    return;
  }
  if (form.password.length > 100) {
    errorMessage.value = "Password must not exceed 100 characters.";
    return;
  }
  if (form.password !== form.repeatPassword) {
    errorMessage.value = "Passwords do not match.";
    return;
  }
  isSubmitting.value = true;
  try {
    await authApi.register({
      username: form.username,
      password: form.password,
    });
    const user = await authApi.getCurrentUser();
    setCurrentUser(user);
    router.push("/chats");
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <form class="card auth-card" @submit.prevent="onSubmit">
      <h1>Create Account</h1>
      <label>
        Username
        <input v-model="form.username" required />
      </label>
      <label>
        Password
        <input v-model="form.password" type="password" required />
      </label>
      <label>
        Repeat password
        <input v-model="form.repeatPassword" type="password" required />
      </label>
      <button :disabled="isSubmitting" type="submit">
        {{ isSubmitting ? "Creating..." : "Register" }}
      </button>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p class="helper">
        Already registered?
        <RouterLink to="/login">Login</RouterLink>
      </p>
    </form>
  </div>
</template>
