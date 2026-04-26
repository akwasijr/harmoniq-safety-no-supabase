"use client";

import { createEntityStore } from "@/stores/create-entity-store";

export interface CustomEvent {
  id: string;
  company_id: string;
  creator_id: string;
  title: string;
  description: string;
  date: string;
  event_type: "safety_meeting" | "drill" | "audit" | "training" | "inspection" | "other";
  shared_with: string[];
  share_all: boolean;
  physical_location: string;
  meeting_link: string;
  attachments: string[];
  created_at: string;
  updated_at: string;
}

const store = createEntityStore<CustomEvent>("harmoniq_custom_events", [], {
  tableName: "custom_events",
});

export const CustomEventsStoreProvider = store.Provider;
export const useCustomEventsStore = store.useStore;
