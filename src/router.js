import { createRouter, createWebHistory } from "vue-router";
import { sessionState, setCurrentUser } from "./store/session";
import LoginView from "./views/LoginView.vue";
import RegisterView from "./views/RegisterView.vue";
import ChatsView from "./views/ChatsView.vue";
import ChatView from "./views/ChatView.vue";
import JoinView from "./views/JoinView.vue";
import { authApi } from "./api/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/chats", meta: { requiresAuth: true } },
    { path: "/login", component: LoginView, meta: { guestOnly: true } },
    {
      path: "/register",
      component: RegisterView,
      meta: { guestOnly: true },
    },
    { path: "/chats", component: ChatsView, meta: { requiresAuth: true } },
    { path: "/chats/:id", component: ChatView, meta: { requiresAuth: true } },
    { path: "/join/:token", component: JoinView, meta: { requiresAuth: true } },
  ],
});

router.beforeEach(async (to) => {
  if (!sessionState.currentUser) {
    try {
      const user = await authApi.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      // Ignore error
    }
  }
  if (to.meta.requiresAuth && !sessionState.currentUser) {
    return "/login";
  }
  if (to.meta.guestOnly && sessionState.currentUser) {
    return "/chats";
  }
  return true;
});

export default router;
