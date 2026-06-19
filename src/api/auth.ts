import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "../types/auth";

import type { Message } from "../types/common";

import { apiClient } from "./client";

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const formData = new URLSearchParams();

    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const response = await apiClient.post("/auth/token", {
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response;
  },

  async register(data: RegisterRequest): Promise<Message> {
    const response = await apiClient.post("/auth/register", {
      body: JSON.stringify(data),
    });
    return response;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get("/users/me");
    return response;
  },

  async logout(): Promise<Message> {
    const response = await apiClient.post("/auth/logout");
    return response;
  },
};
