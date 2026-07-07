import { ServiceResponse } from "../types/common";
import type { Notification } from "../types/notification";

import { apiClient } from "./client";

export const notificationsApi = {
  async getAll(): Promise<Notification[]> {
    const response = await apiClient.get<Notification[]>(
      "/service/notifications/",
    );

    if (!response) {
      throw new Error("Не удалось загрузить уведомления");
    }

    return response;
  },

  async markAsRead(ids: Set<string>): Promise<void> {
    const response = await apiClient.patch<ServiceResponse>(
      "/service/notifications/",
      {
        body: JSON.stringify({ notifications_ids: [...ids] }),
      },
    );

    if (!response || !response.success) {
      throw new Error("Не удалось обновить уведомления");
    }
  },
};
