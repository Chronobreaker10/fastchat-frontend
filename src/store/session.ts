import { reactive } from "vue";

import type { User } from "../types/auth";

interface SessionState {
  currentUser: User | null;
  expired: boolean;
}

export const sessionState = reactive<SessionState>({
  currentUser: null,
  expired: false,
});

export function setCurrentUser(user: User): void {
  sessionState.currentUser = user;
  sessionState.expired = false;
}

export function clearCurrentUser(): void {
  sessionState.currentUser = null;
}

export function setExpired(expired: boolean): void {
  sessionState.expired = expired;
}
