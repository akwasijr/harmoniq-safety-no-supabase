"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import { mockRiskEvaluations } from "@/mocks/data";
import type { RiskEvaluation } from "@/types";

const store = createEntityStore<RiskEvaluation>(
  "harmoniq_risk_evaluations",
  mockRiskEvaluations
);

export const RiskEvaluationsProvider = store.Provider;
export const useRiskEvaluationsStore = store.useStore;
