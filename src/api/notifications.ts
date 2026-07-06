import type { Notification } from "../types/notification";

import { apiClient } from "./client";

export const notificationsApi = {
  async getAll(): Promise<Notification[]> {
    // const response = await apiClient.get<Notification[]>("/notifications");
    try {
      const response = await fetch("http://localhost:8001/notifications", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Не удалось загрузить уведомления");
      }
      return (await response.json()) as Notification[];
    } catch (error) {
      console.error(error);
      throw error;
    }

    //return response;
  },

  async markAsRead(ids: Set<string>): Promise<void> {
    try {
      const response = await fetch("http://localhost:8001/notifications", {
        method: "PATCH",
        body: JSON.stringify({ notifications_ids: [...ids] }),
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Не удалось обновить уведомления");
      }
      //return (await response.json()) as Notification[];
    } catch (error) {
      console.error(error);
      throw error;
    }

    //await apiClient.patch(`/notifications/${id}/read`);
  },
};
