import { User } from "./auth";

export interface Message {
  id: number;
  sender_username: string;
  created_at: string;
  text: string;
  chat_id: string;
}

export interface MessageWithSender {
  id: number;
  sender: User;
  created_at: string;
  text: string;
  chat_id: string;
}
