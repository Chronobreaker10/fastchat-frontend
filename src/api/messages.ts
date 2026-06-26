import type { ApiResponse, SendMessageDetails } from "../types/common";
import type { CreateMessageRequest } from "../types/message";

import { apiClient } from "./client";

export const messageApi = {
  async send(
    data: CreateMessageRequest,
  ): Promise<ApiResponse<SendMessageDetails>> {
    const response = await apiClient.post<ApiResponse<SendMessageDetails>>(
      "/messages",
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
    await apiClient.delete(`/messages/${id}`);
  },
};
