"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import { mockTeams } from "@/mocks/data";
import type { Team } from "@/types";

const store = createEntityStore<Team>("harmoniq_teams", mockTeams, {
  stripFields: ["incidents"],
});

export const TeamsStoreProvider = store.Provider;
export const useTeamsStore = store.useStore;
