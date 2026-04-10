"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { TrainingAssignment } from "@/types";

const store = createEntityStore<TrainingAssignment>("harmoniq_training_assignments", [], {
  stripFields: [],
});

export const TrainingAssignmentsProvider = store.Provider;
export const useTrainingAssignmentsStore = store.useStore;
