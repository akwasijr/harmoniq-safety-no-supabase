"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import { mockUsers } from "@/mocks/data";
import type { User } from "@/types";

const store = createEntityStore<User>("harmoniq_users", mockUsers);

export const UsersStoreProvider = store.Provider;
export const useUsersStore = store.useStore;
