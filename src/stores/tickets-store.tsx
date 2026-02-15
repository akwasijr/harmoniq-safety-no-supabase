"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import { mockTickets } from "@/mocks/data";
import type { Ticket } from "@/types";

const store = createEntityStore<Ticket>("harmoniq_tickets", mockTickets, {
  stripFields: ["assignee", "creator"],
});

export const TicketsStoreProvider = store.Provider;
export const useTicketsStore = store.useStore;
