import type { User } from "./auth";
import type { ChatMember } from "./chat";

export interface MessagePreview {
  id: number;
  sender_username: string;
  created_at: string;
  text: string;
  chat_id: string;
}

export interface MessageWithSender {
  id?: number;
  sender?: User;
  created_at: string;
  text: string;
  chat_id?: string;
  is_system: boolean;
}

export interface ChatWebSocketPayload {
  event: "sent_message" | "left_user" | "joined_user" | "message_deleted";
  payload: MessageWithSender | string | number;
  details?: ChatMember | string | number;
}

export interface CreateMessageRequest {
  text: string;
  chat_id: string;
}
