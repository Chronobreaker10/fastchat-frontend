import type { Chat, CreateChatRequest, ChatRead } from "../types/chat";

import type { Message } from "../types/common";

import { apiClient } from "./client";

export const chatApi = {
  async create(data: CreateChatRequest): Promise<Message> {
    const response = await apiClient.post("/chats", {
      body: JSON.stringify(data),
    });
    return response;
  },

  async getMyChats(): Promise<Chat[]> {
    const response = await apiClient.get("/chats");
    return response;
  },

  async getChat(
    id: string,
    params: Record<string, string> = { limit: "3" },
  ): Promise<ChatRead> {
    const q = new URLSearchParams(params).toString();

    const response = await apiClient.get(`/chats/${id}?${q}`);
    return response;
  },
};
