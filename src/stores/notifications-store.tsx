"use client";

import { createEntityStore } from "@/stores/create-entity-store";

export interface Notification {
  id: string;
  company_id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  source: string | null;
  source_id: string | null;
  read: boolean;
  created_at: string;
  updated_at: string;
}

const store = createEntityStore<Notification>("harmoniq_notifications", [], {
  tableName: "notifications",
});

export const NotificationsStoreProvider = store.Provider;
export const useNotificationsStore = store.useStore;
