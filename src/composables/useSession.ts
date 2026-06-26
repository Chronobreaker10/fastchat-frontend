import { computed } from "vue";

import { sessionState } from "../store/session";

export function useSession() {
  const currentUser = computed(() => sessionState.currentUser);
  const username = computed(
    () => sessionState.currentUser?.username ?? "неизвестно",
  );

  return {
    sessionState,
    currentUser,
    username,
  };
}
