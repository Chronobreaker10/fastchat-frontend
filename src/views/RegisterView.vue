<script setup>
import { reactive, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { register } from "../api/mockApi";
import { setCurrentUser } from "../store/session";

const router = useRouter();
const form = reactive({
  username: "",
  password: "",
  repeatPassword: ""
});
const isSubmitting = ref(false);
const errorMessage = ref("");

async function onSubmit() {
  isSubmitting.value = true;
  errorMessage.value = "";
  try {
    const user = await register(form.username, form.password, form.repeatPassword);
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
