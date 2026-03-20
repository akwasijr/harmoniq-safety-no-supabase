"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { AssetInspection } from "@/types";

const mockAssetInspections: AssetInspection[] = [
  {
    id: "ins1",
    asset_id: "asset_2",
    inspector_id: "user_1",
    checklist_id: null,
    result: "pass",
    notes: "All components in good condition. Brakes responsive, fluid levels normal.",
    media_urls: [],
    incident_id: null,
    inspected_at: "2024-01-28T09:30:00Z",
    created_at: "2024-01-28T09:30:00Z",
  },
  {
    id: "ins2",
    asset_id: "asset_3",
    inspector_id: "user_6",
    checklist_id: null,
    result: "fail",
    notes: "Harness stitching shows wear on left shoulder strap. Lanyard connector latch stiff. Recommend immediate replacement.",
    media_urls: [],
    incident_id: null,
    inspected_at: "2024-01-27T14:15:00Z",
    created_at: "2024-01-27T14:15:00Z",
  },
  {
    id: "ins3",
    asset_id: "asset_4",
    inspector_id: "user_3",
    checklist_id: null,
    result: "pass",
    notes: "Vehicle pre-trip check complete. Tires, lights, mirrors all satisfactory.",
    media_urls: [],
    incident_id: null,
    inspected_at: "2024-01-26T07:00:00Z",
    created_at: "2024-01-26T07:00:00Z",
  },
  {
    id: "ins4",
    asset_id: "asset_5",
    inspector_id: "user_2",
    checklist_id: null,
    result: "needs_attention",
    notes: "Ground cable insulation showing minor cracks. Gas flow meter reading slightly off calibration. Schedule recalibration within 2 weeks.",
    media_urls: [],
    incident_id: null,
    inspected_at: "2024-01-25T11:45:00Z",
    created_at: "2024-01-25T11:45:00Z",
  },
  {
    id: "ins5",
    asset_id: "asset_1",
    inspector_id: "user_1",
    checklist_id: null,
    result: "pass",
    notes: "Belt tension within spec. Emergency stops tested and functional. Guards in place.",
    media_urls: [],
    incident_id: null,
    inspected_at: "2024-01-24T16:00:00Z",
    created_at: "2024-01-24T16:00:00Z",
  },
  {
    id: "ins6",
    asset_id: "asset_6",
    inspector_id: "user_5",
    checklist_id: null,
    result: "pass",
    notes: "Extinguisher pressure gauge in green zone. Pin and tamper seal intact. Last serviced 6 months ago.",
    media_urls: [],
    incident_id: null,
    inspected_at: "2024-01-23T10:20:00Z",
    created_at: "2024-01-23T10:20:00Z",
  },
];

const store = createEntityStore<AssetInspection>("harmoniq_asset_inspections", mockAssetInspections);

export const AssetInspectionsProvider = store.Provider;
export const useAssetInspectionsStore = store.useStore;
