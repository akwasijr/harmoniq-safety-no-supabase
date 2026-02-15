"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { InspectionRound } from "@/types";

const mockRounds: InspectionRound[] = [];

const store = createEntityStore<InspectionRound>("harmoniq_inspection_rounds", mockRounds);

export const InspectionRoundsProvider = store.Provider;
export const useInspectionRoundsStore = store.useStore;
