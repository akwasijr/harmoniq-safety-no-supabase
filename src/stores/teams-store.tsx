"use client";

import * as React from "react";
import { createEntityStore } from "@/stores/create-entity-store";
import { mockTeams } from "@/mocks/data";
import type { Team } from "@/types";
import { normalizeTeam, normalizeTeamUpdates } from "@/lib/assignment-utils";

const store = createEntityStore<Team>("harmoniq_teams", mockTeams, {
  stripFields: ["incidents"],
});

export const TeamsStoreProvider = store.Provider;
export function useTeamsStore() {
  const base = store.useStore();

  const items = React.useMemo(() => base.items.map(normalizeTeam), [base.items]);

  const add = React.useCallback(
    (team: Team) => {
      base.add(normalizeTeam(team));
    },
    [base],
  );

  const update = React.useCallback(
    (id: string, updates: Partial<Team>) => {
      base.update(id, normalizeTeamUpdates(updates));
    },
    [base],
  );

  return {
    ...base,
    items,
    add,
    update,
  };
}
