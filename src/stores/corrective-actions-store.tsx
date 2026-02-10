"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { CorrectiveAction } from "@/types";

const store = createEntityStore<CorrectiveAction>("harmoniq_corrective_actions", []);

export const CorrectiveActionsProvider = store.Provider;
export const useCorrectiveActionsStore = store.useStore;
