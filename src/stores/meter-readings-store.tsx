"use client";

import { createEntityStore } from "@/stores/create-entity-store";
import type { MeterReading } from "@/types";

const store = createEntityStore<MeterReading>("harmoniq_meter_readings", []);

export const MeterReadingsProvider = store.Provider;
export const useMeterReadingsStore = store.useStore;
