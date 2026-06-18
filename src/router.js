import { createRouter, createWebHistory } from "vue-router";
import { sessionState } from "./store/session";
import LoginView from "./views/LoginView.vue";
import RegisterView from "./views/RegisterView.vue";
import ChatsView from "./views/ChatsView.vue";
import ChatView from "./views/ChatView.vue";
import JoinView from "./views/JoinView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/chats" },
    { path: "/login", component: LoginView, meta: { guestOnly: true } },
    { path: "/register", component: RegisterView, meta: { guestOnly: true } },
    { path: "/chats", component: ChatsView, meta: { requiresAuth: true } },
    { path: "/chats/:id", component: ChatView, meta: { requiresAuth: true } },
    { path: "/join/:token", component: JoinView, meta: { requiresAuth: true } }
  ]
});

router.beforeEach((to) => {
  const isAuthenticated = Boolean(sessionState.currentUser);
  if (to.meta.requiresAuth && !isAuthenticated) {
    return "/login";
  }
  if (to.meta.guestOnly && isAuthenticated) {
    return "/chats";
  }
  return true;
});

export default router;
