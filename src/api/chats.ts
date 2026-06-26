import type {
  Chat,
  ChatRead,
  CreateChatRequest,
  InviteResponse,
} from "../types/chat";
import type { ApiResponse } from "../types/common";
import type { MessageWithSender } from "../types/message";

import { apiClient } from "./client";

export const chatApi = {
  async create(data: CreateChatRequest): Promise<ApiResponse<{ id: string }>> {
    const response = await apiClient.post<ApiResponse<{ id: string }>>("/chats", {
      body: JSON.stringify(data),
    });

    if (!response) {
      throw new Error("Не удалось создать чат");
    }

    return response;
  },

  async getMyChats(): Promise<Chat[]> {
    const response = await apiClient.get<Chat[]>("/chats");

    if (!response) {
      throw new Error("Не удалось загрузить список чатов");
    }

    return response;
  },

  async getChat(id: string): Promise<ChatRead> {
    const response = await apiClient.get<ChatRead>(`/chats/${id}`);

    if (!response) {
      throw new Error("Не удалось загрузить чат");
    }

    return response;
  },

  async getChatMessages(
    id: string,
    params: Record<string, string> = { limit: "10" },
  ): Promise<MessageWithSender[]> {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient.get<MessageWithSender[]>(
      `/chats/${id}/messages?${query}`,
    );

    if (!response) {
      throw new Error("Не удалось загрузить сообщения");
    }

    return response;
  },

  async inviteToChat(id: string, username: string): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>(`/chats/${id}/members`, {
      body: JSON.stringify({ username }),
    });

    if (!response) {
      throw new Error("Не удалось добавить участника");
    }

    return response;
  },

  async getInviteToken(id: string): Promise<InviteResponse> {
    const response = await apiClient.get<InviteResponse>(`/chats/${id}/invite`);

    if (!response) {
      throw new Error("Не удалось получить ссылку-приглашение");
    }

    return response;
  },

  async joinByInvite(token: string): Promise<ApiResponse<{ chat_id: string }>> {
    const response = await apiClient.post<ApiResponse<{ chat_id: string }>>(
      "/chats/invite",
      {
        body: JSON.stringify({ invite_token: token }),
      },
    );

    if (!response) {
      throw new Error("Не удалось присоединиться к чату");
    }

    return response;
  },

  async leaveChat(id: string): Promise<ApiResponse | null> {
    return apiClient.delete<ApiResponse>(`/chats/${id}/members`);
  },

  async kickMember(id: string, userId: number): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(
      `/chats/${id}/members/${userId}`,
    );

    if (!response) {
      throw new Error("Не удалось удалить участника");
    }

    return response;
  },

  async deleteChat(id: string): Promise<ApiResponse | null> {
    return apiClient.delete<ApiResponse>(`/chats/${id}`);
  },
};
