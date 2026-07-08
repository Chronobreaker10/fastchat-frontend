export type MessageDeliveryStatus = "SENDING" | "DELIVERED" | "READ";

export const MESSAGE_STATUS_LABELS: Record<MessageDeliveryStatus, string> = {
  SENDING: "Отправляется",
  DELIVERED: "Доставлено",
  READ: "Просмотрено",
};

export function resolveMessageStatus(
  status: MessageDeliveryStatus | undefined,
): MessageDeliveryStatus {
  return status ?? "SENDING";
}
