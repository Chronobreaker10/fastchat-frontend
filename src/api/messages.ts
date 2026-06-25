import type { Message } from "../types/common";
import { CreateMessageRequest } from "../types/message";

import { apiClient } from "./client";

export const messageApi = {
  async send(data: CreateMessageRequest): Promise<Message> {
    const response = await apiClient.post("/messages", {
      body: JSON.stringify(data),
    });
    return response;
  },
};
