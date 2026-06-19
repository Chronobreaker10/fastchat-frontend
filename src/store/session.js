import { reactive } from "vue";

export const sessionState = reactive({
  currentUser: null,
});

export function setCurrentUser(user) {
  sessionState.currentUser = user;
}

export function clearCurrentUser() {
  sessionState.currentUser = null;
}
