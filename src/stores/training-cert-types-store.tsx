"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { TrainingCertificationType } from "@/types";

const store = createEntityStore<TrainingCertificationType>("harmoniq_training_cert_types", [], {
  stripFields: [],
});

export const TrainingCertTypesProvider = store.Provider;
export const useTrainingCertTypesStore = store.useStore;
