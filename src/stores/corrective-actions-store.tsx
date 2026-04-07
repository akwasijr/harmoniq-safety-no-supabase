"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { CorrectiveAction } from "@/types";

const mockCorrectiveActions: CorrectiveAction[] = [
  {
    id: "ca-001",
    company_id: "comp_1",
    asset_id: "asset_5",
    inspection_id: "ins4",
    description: "Recalibrate the gas flow meter and replace the cracked ground-cable insulation identified during welding-station inspection.",
    severity: "high",
    assigned_to: "user_2",
    due_date: "2025-02-15",
    status: "in_progress",
    resolution_notes: null,
    completed_at: null,
    created_at: "2025-01-20T09:30:00Z",
    updated_at: "2025-01-22T14:15:00Z",
  },
  {
    id: "ca-002",
    company_id: "comp_1",
    asset_id: "asset_2",
    inspection_id: null,
    description: "Install proximity warning sensors on forklift fleet operating in Warehouse B. Near-miss incident reported between forklift and pedestrian worker.",
    severity: "critical",
    assigned_to: "user_3",
    due_date: "2025-02-01",
    status: "open",
    resolution_notes: null,
    completed_at: null,
    created_at: "2025-01-18T11:00:00Z",
    updated_at: "2025-01-18T11:00:00Z",
  },
  {
    id: "ca-003",
    company_id: "comp_1",
    asset_id: "asset_3",
    inspection_id: "ins2",
    description: "Replace the worn fall-protection harness and stiff lanyard latch flagged during inspection before it returns to service.",
    severity: "critical",
    assigned_to: "user_2",
    due_date: "2025-01-10",
    status: "completed",
    resolution_notes: "Replaced faulty relay switch and rewired emergency circuit. Verified with three consecutive successful stop tests.",
    completed_at: "2025-01-09T16:45:00Z",
    created_at: "2025-01-05T08:00:00Z",
    updated_at: "2025-01-09T16:45:00Z",
  },
];

const store = createEntityStore<CorrectiveAction>("harmoniq_corrective_actions", mockCorrectiveActions, {
  stripFields: ["assigned_to_team_id"],
  realtimeSubscribe: true,
});

export const CorrectiveActionsProvider = store.Provider;
export const useCorrectiveActionsStore = store.useStore;
