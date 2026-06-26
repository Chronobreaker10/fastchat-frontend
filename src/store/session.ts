import { reactive } from "vue";

import type { User } from "../types/auth";

interface SessionState {
  currentUser: User | null;
}

export const sessionState = reactive<SessionState>({
  currentUser: null,
});

export function setCurrentUser(user: User): void {
  sessionState.currentUser = user;
}

export function clearCurrentUser(): void {
  sessionState.currentUser = null;
}
