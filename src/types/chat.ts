import { Message, MessageWithSender } from "./message";
import { User } from "./auth";

export interface Chat {
  id: string;
  name: string;
  created_at: string;
  last_message?: Message;
}

export interface ChatRead {
  id: string;
  name: string;
  created_at: string;
  message: MessageWithSender[];
  members: User[];
}

export interface CreateChatRequest {
  name: string;
}

export interface InviteResponse {
  token: string;
  chat_name: string;
}
