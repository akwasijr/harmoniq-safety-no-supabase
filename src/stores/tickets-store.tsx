"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import { mockTickets } from "@/mocks/data";
import type { Ticket } from "@/types";

const store = createEntityStore<Ticket>("harmoniq_tickets", mockTickets, {
  columnMap: {
    created_by: "reporter_id",
    incident_ids: "incident_id",
  },
  stripFields: ["assignee", "creator", "assigned_groups", "incidents"],
  realtimeSubscribe: true,
});

export const TicketsStoreProvider = store.Provider;
export const useTicketsStore = store.useStore;
