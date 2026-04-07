"use client";

import * as React from "react";
import { createEntityStore } from "@/stores/create-entity-store";
import type { User } from "@/types";
import { normalizeUser, normalizeUserUpdates } from "@/lib/assignment-utils";

const store = createEntityStore<User>("harmoniq_users", [], {
  stripFields: ["full_name"],
});

export const UsersStoreProvider = store.Provider;
export function useUsersStore() {
  const base = store.useStore();

  const items = React.useMemo(() => base.items.map(normalizeUser), [base.items]);

  const add = React.useCallback(
    (user: User) => {
      base.add(normalizeUser(user));
    },
    [base],
  );

  const update = React.useCallback(
    (id: string, updates: Partial<User>) => {
      base.update(id, normalizeUserUpdates(updates));
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
