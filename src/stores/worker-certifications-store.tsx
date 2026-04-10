"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { WorkerCertification } from "@/types";

const store = createEntityStore<WorkerCertification>("harmoniq_worker_certifications", [], {
  stripFields: [],
});

export const WorkerCertificationsProvider = store.Provider;
export const useWorkerCertificationsStore = store.useStore;
