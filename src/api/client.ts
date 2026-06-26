import { sessionState, clearCurrentUser } from "../store/session";

interface RequestOptions {
  headers?: Record<string, string>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  credentials?: "include" | "omit" | "same-origin";
  body?: string | FormData | URLSearchParams;
}

const BASE_URL = "http://localhost:8000/api/v1";

export const apiClient = {
  async request(endpoint: string, options: RequestOptions) {
    const url = `${BASE_URL}${endpoint}`;

    const optionsWithDefaults = {
      ...options,
      headers: options.headers || { "Content-Type": "application/json" },
      credentials: options.credentials || "include",
    };

    try {
      const response = await fetch(url, optionsWithDefaults);

      if (response.status === 401) {
        clearCurrentUser();
      }

      // Если сервер вернул ошибку, обрабатываем её
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            errorData.detail[0].msg ||
            `Ошибка HTTP: ${response.status}`,
        );
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Ошибка при выполнении запроса к API:", error);
      throw error;
    }
  },

  get(endpoint: string, options: RequestOptions = {}) {
    return this.request(endpoint, {
      ...options,
      method: "GET",
    });
  },

  post(endpoint: string, options: RequestOptions = {}) {
    return this.request(endpoint, {
      ...options,
      method: "POST",
    });
  },

  put(endpoint: string, options: RequestOptions = {}) {
    return this.request(endpoint, {
      ...options,
      method: "PUT",
    });
  },

  patch(endpoint: string, options: RequestOptions = {}) {
    return this.request(endpoint, {
      ...options,
      method: "PATCH",
    });
  },

  delete(endpoint: string, options: RequestOptions = {}) {
    return this.request(endpoint, {
      ...options,
      method: "DELETE",
    });
  },
};
