import { reactive } from "vue";

const SESSION_KEY = "fastchat_session";

export const sessionState = reactive({
  currentUser: null
});

export function setCurrentUser(user) {
  sessionState.currentUser = user;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearCurrentUser() {
  sessionState.currentUser = null;
  localStorage.removeItem(SESSION_KEY);
}

export function restoreSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return;
  }

  try {
    sessionState.currentUser = JSON.parse(raw);
  } catch (_error) {
    localStorage.removeItem(SESSION_KEY);
    sessionState.currentUser = null;
  }
}
