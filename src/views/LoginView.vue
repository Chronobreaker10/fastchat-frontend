<script setup>
import { reactive, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { login } from "../api/mockApi";
import { setCurrentUser } from "../store/session";

const router = useRouter();
const form = reactive({
  username: "",
  password: ""
});
const isSubmitting = ref(false);
const errorMessage = ref("");

async function onSubmit() {
  isSubmitting.value = true;
  errorMessage.value = "";
  try {
    const user = await login(form.username, form.password);
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
      <h1>FastChat Login</h1>
      <label>
        Username
        <input v-model="form.username" required />
      </label>
      <label>
        Password
        <input v-model="form.password" type="password" required />
      </label>
      <button :disabled="isSubmitting" type="submit">
        {{ isSubmitting ? "Signing in..." : "Login" }}
      </button>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p class="helper">
        No account?
        <RouterLink to="/register">Register</RouterLink>
      </p>
    </form>
  </div>
</template>
