import type { MessagePreview, MessageWithSender } from "./message";
import type { User } from "./auth";

export interface Chat {
  id: string;
  name: string;
  created_at: string;
  last_message?: MessagePreview;
}

export interface ChatMember {
  user: User;
}

export interface ChatRead {
  id: string;
  name: string;
  created_at: string;
  user_id: number;
  messages: MessageWithSender[];
  total_messages: number;
  members: ChatMember[];
}

export interface CreateChatRequest {
  name: string;
}

export interface InviteResponse {
  token: string;
  chat_name: string;
}
