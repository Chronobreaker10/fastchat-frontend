import type {
  Chat,
  CreateChatRequest,
  ChatRead,
  InviteResponse,
} from "../types/chat";

import type { Message } from "../types/common";
import { MessageWithSender } from "../types/message";

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

  async getChat(id: string): Promise<ChatRead> {
    const response = await apiClient.get(`/chats/${id}`);
    return response;
  },

  async getChatMessages(
    id: string,
    params: Record<string, string> = { limit: "10" },
  ): Promise<MessageWithSender[]> {
    const q = new URLSearchParams(params).toString();
    const response = await apiClient.get(`/chats/${id}/messages?${q}`);
    return response;
  },

  async inviteToChat(id: string, username: string): Promise<Message> {
    const response = await apiClient.post(`/chats/${id}/members`, {
      body: JSON.stringify({ username }),
    });
    return response;
  },

  async getInviteToken(id: string): Promise<InviteResponse> {
    const response = await apiClient.get(`/chats/${id}/invite`);
    return response;
  },

  async joinByInvite(token: string): Promise<Message> {
    const response = await apiClient.post("/chats/invite", {
      body: JSON.stringify({ invite_token: token }),
    });
    return response;
  },

  async leaveChat(id: string): Promise<Message> {
    const response = await apiClient.delete(`/chats/${id}/members`);
    return response;
  },

  async kickMember(id: string, user_id: number): Promise<Message> {
    const response = await apiClient.delete(`/chats/${id}/members/${user_id}`);
    return response;
  },

  async deleteChat(id: string, user_id: number): Promise<Message> {
    const response = await apiClient.delete(`/chats/${id}`);
    return response;
  },
};
