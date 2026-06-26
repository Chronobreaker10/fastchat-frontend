import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "../types/auth";
import type { ApiResponse } from "../types/common";

import { apiClient } from "./client";

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const formData = new URLSearchParams();

    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const response = await apiClient.post<AuthResponse>("/auth/token", {
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response) {
      throw new Error("Не удалось выполнить вход");
    }

    return response;
  },

  async register(data: RegisterRequest): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>("/auth/register", {
      body: JSON.stringify(data),
    });

    if (!response) {
      throw new Error("Не удалось зарегистрироваться");
    }

    return response;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>("/users/me");

    if (!response) {
      throw new Error("Не удалось получить данные пользователя");
    }

    return response;
  },

  async logout(): Promise<ApiResponse | null> {
    return apiClient.post<ApiResponse>("/auth/logout");
  },
};
