import { useRouter } from "vue-router";

import { authApi } from "../api/auth";
import { clearNotifications } from "../store/notifications";
import { clearCurrentUser, setCurrentUser } from "../store/session";
import type { LoginRequest, RegisterRequest } from "../types/auth";
import { getErrorMessage } from "../utils/errors";

import { useSession } from "./useSession";

export function useAuth() {
  const router = useRouter();
  const { currentUser, username } = useSession();

  async function fetchAndSetCurrentUser() {
    const user = await authApi.getCurrentUser();
    setCurrentUser(user);
    return user;
  }

  async function logout(onError?: (message: string) => void): Promise<void> {
    if (!currentUser.value) {
      return;
    }

    try {
      clearCurrentUser();
      clearNotifications();
      await authApi.logout();
      await router.push("/login");
    } catch (error) {
      onError?.(getErrorMessage(error));
    }
  }

  async function loginAndRedirect(credentials: LoginRequest): Promise<void> {
    await authApi.login(credentials);
    await fetchAndSetCurrentUser();
    await router.push("/chats");
  }

  async function registerAndRedirect(data: RegisterRequest): Promise<void> {
    await authApi.register(data);
    await fetchAndSetCurrentUser();
    await router.push("/chats");
  }

  return {
    currentUser,
    username,
    fetchAndSetCurrentUser,
    logout,
    loginAndRedirect,
    registerAndRedirect,
  };
}
