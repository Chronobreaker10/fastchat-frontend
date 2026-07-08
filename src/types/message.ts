import type { User } from "./auth";
import type { ChatMember } from "./chat";
import type { MessageDeliveryStatus } from "../utils/messageStatus";

export type { MessageDeliveryStatus };

export interface MessagePreview {
  id: number;
  sender_username: string;
  created_at: string;
  text: string;
  chat_id: string;
}

export interface MessageWithSender {
  id?: number;
  client_id?: string;
  sender?: User;
  created_at: string;
  text: string;
  chat_id?: string;
  is_system: boolean;
  message_status?: MessageDeliveryStatus;
  temp_id?: string;
}

export interface MessageStatusUpdatePayload {
  id: number;
  status: MessageDeliveryStatus;
}

export interface MessagePayload {
  temp_id?: string;
  message: MessageWithSender;
}

export interface ChatWebSocketPayload {
  event:
    | "sent_message"
    | "left_user"
    | "joined_user"
    | "message_deleted"
    | "message_updated"
    | "message_status_updated"
    | "message_delivered"
    | "message_read"
    | "connect_user"
    | "disconnect_user";
  payload: MessagePayload | MessageStatusUpdatePayload | string | number;
  details?: ChatMember | string | number;
}

export interface CreateMessageRequest {
  text: string;
  chat_id: string;
  temp_id?: string;
}

export interface UpdateMessageRequest {
  text: string;
}
