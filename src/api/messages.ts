import type { ApiResponse, SendMessageDetails } from "../types/common";
import type {
  CreateMessageRequest,
  UpdateMessageRequest,
} from "../types/message";

import { apiClient } from "./client";

export const messageApi = {
  async send(
    data: CreateMessageRequest,
  ): Promise<ApiResponse<SendMessageDetails>> {
    const response = await apiClient.post<ApiResponse<SendMessageDetails>>(
      "/api/v1/messages",
      {
        body: JSON.stringify(data),
      },
    );

    if (!response) {
      throw new Error("Не удалось отправить сообщение");
    }

    return response;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/messages/${id}`);
  },

  async update(
    id: number,
    data: UpdateMessageRequest,
  ): Promise<ApiResponse<SendMessageDetails>> {
    const response = await apiClient.patch<ApiResponse<SendMessageDetails>>(
      `/api/v1/messages/${id}`,
      {
        body: JSON.stringify(data),
      },
    );

    if (!response) {
      throw new Error("Не удалось изменить сообщение");
    }

    return response;
  },

  async markAsRead(chatId: string, messageIds: number[]): Promise<void> {
    await apiClient.post(`/api/v1/chats/${chatId}/messages/read`, {
      body: JSON.stringify({ message_ids: messageIds }),
    });
  },
};
