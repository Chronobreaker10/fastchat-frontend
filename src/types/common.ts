export interface ApiResponse<TDetails = Record<string, unknown>> {
  message: string;
  details: TDetails;
}

export interface JoinChatDetails {
  chat_id: string;
}

export interface SendMessageDetails {
  message: import("./message").MessageWithSender;
}
