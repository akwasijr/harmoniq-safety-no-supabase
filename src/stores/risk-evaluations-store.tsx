"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { RiskEvaluation } from "@/types";

const store = createEntityStore<RiskEvaluation>(
  "harmoniq_risk_evaluations",
  [],
  { stripFields: ["submitter", "location"], realtimeSubscribe: true }
);

export const RiskEvaluationsProvider = store.Provider;
export const useRiskEvaluationsStore = store.useStore;
