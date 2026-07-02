import { clearCurrentUser, setExpired, sessionState } from "../store/session";
import router from "../router";

interface ApiErrorBody {
  message?: string;
  detail?: Array<{ msg?: string }>;
}

interface RequestOptions {
  headers?: Record<string, string>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  credentials?: RequestCredentials;
  body?: string | FormData | URLSearchParams;
}

const API_PREFIX = "/api/v1";
const BASE_URL = `${import.meta.env.VITE_API_SCHEME ?? "http"}://${import.meta.env.VITE_API_HOST ?? "localhost"}:${import.meta.env.VITE_API_PORT ?? ""}${API_PREFIX}`;

function parseErrorMessage(errorData: ApiErrorBody, status: number): string {
  const detailMessage = errorData.detail?.[0]?.msg;

  return errorData.message || detailMessage || `Ошибка HTTP: ${status}`;
}

export const apiClient = {
  async request<T = unknown>(
    endpoint: string,
    options: RequestOptions,
  ): Promise<T | null> {
    const url = `${BASE_URL}${endpoint}`;

    const optionsWithDefaults: RequestInit = {
      ...options,
      headers: options.headers || { "Content-Type": "application/json" },
      credentials: options.credentials || "include",
    };

    try {
      let response = await fetch(url, optionsWithDefaults);

      if (response.status === 401) {
        if (!sessionState.expired) {
          const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
            ...optionsWithDefaults,
            method: "POST",
          });
          if (refreshResponse.status === 401) {
            clearCurrentUser();
            setExpired(true);
            if (router.currentRoute.value.path !== "/login") {
              await router.push("/login");
            }
            throw new Error("Время сессии истекло");
          }
          response = await fetch(url, optionsWithDefaults);
        } else {
          clearCurrentUser();
          if (router.currentRoute.value.path !== "/login") {
            await router.push("/login");
          }
          throw new Error("Время сессии истекло");
        }
      }

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({}))) as ApiErrorBody;
        throw new Error(parseErrorMessage(errorData, response.status));
      }

      if (response.status === 204) {
        return null;
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error("Ошибка при выполнении запроса к API:", error);
      throw error;
    }
  },

  get<T = unknown>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T | null> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  },

  post<T = unknown>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T | null> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
    });
  },

  put<T = unknown>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T | null> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
    });
  },

  patch<T = unknown>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T | null> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
    });
  },

  delete<T = unknown>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T | null> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  },
};
