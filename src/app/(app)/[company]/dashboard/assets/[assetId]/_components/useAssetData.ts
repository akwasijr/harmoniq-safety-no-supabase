"use client";

import * as React from "react";
import { mockMaintenanceSchedules, mockDowntimeLogs } from "@/mocks/data";
import { useAssetsStore } from "@/stores/assets-store";
import { useUsersStore } from "@/stores/users-store";
import { useTeamsStore } from "@/stores/teams-store";
import { useAssetInspectionsStore } from "@/stores/inspections-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useMeterReadingsStore } from "@/stores/meter-readings-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import type { MaintenanceSchedule } from "@/types";

export function useAssetData(assetId: string) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  const { items: assets, update: updateAsset, remove: removeAsset, isLoading: isAssetsLoading } = useAssetsStore();
  const { items: users } = useUsersStore();
  const { items: teams } = useTeamsStore();
  const { items: inspections } = useAssetInspectionsStore();
  const { items: incidents } = useIncidentsStore();
  const { items: locations } = useLocationsStore();
  const { items: workOrders } = useWorkOrdersStore();
  const { items: allMeterReadings, add: addMeterReading } = useMeterReadingsStore();

  const asset = assets.find((a) => a.id === assetId);
  const assetInspections = inspections.filter((i) => i.asset_id === assetId);
  const assetIncidents = incidents.filter((i) => i.asset_id === assetId);
  const assetLocation = asset?.location_id ? locations.find((l) => l.id === asset.location_id) : null;
  const assetsAtSameLocation = asset?.location_id
    ? assets.filter((a) => a.location_id === asset.location_id && a.id !== assetId).length
    : 0;
  const departmentOptions = Array.from(
    new Set(users.map((u) => u.department).filter((d): d is string => !!d))
  );
  const assetMeterReadings = allMeterReadings.filter((r) => r.asset_id === assetId);

  // Stats
  const totalInspections = assetInspections.length;
  const passRate = totalInspections > 0
    ? Math.round((assetInspections.filter((i) => i.result === "pass").length / totalInspections) * 100)
    : 0;
  const lastInspectedDays = (() => {
    if (!mounted || assetInspections.length === 0) return null;
    const sorted = [...assetInspections].sort((a, b) => new Date(b.inspected_at).getTime() - new Date(a.inspected_at).getTime());
    const diff = Date.now() - new Date(sorted[0].inspected_at).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  })();

  // Maintenance schedules
  const [schedules, setSchedules] = React.useState<MaintenanceSchedule[]>(() =>
    mockMaintenanceSchedules.filter(s => s.asset_id === assetId)
  );
  React.useEffect(() => {
    setSchedules(mockMaintenanceSchedules.filter(s => s.asset_id === assetId));
  }, [assetId]);

  // Completed work orders as maintenance history
  const maintenanceLogs = React.useMemo(() => {
    return workOrders
      .filter(wo => wo.asset_id === assetId && wo.status === "completed")
      .map(wo => {
        const technician = users.find(u => u.id === wo.assigned_to);
        return {
          id: wo.id,
          asset_id: wo.asset_id || "",
          completed_date: wo.completed_at || wo.updated_at,
          description: wo.title,
          notes: wo.description,
          technician_name: technician?.full_name || "Unassigned",
          hours_spent: wo.actual_hours || 0,
        };
      })
      .sort((a, b) => new Date(b.completed_date).getTime() - new Date(a.completed_date).getTime());
  }, [workOrders, assetId, users]);

  // Downtime
  const downtimeLogs = mockDowntimeLogs.filter(l => l.asset_id === assetId);
  const totalDowntimeHours = downtimeLogs
    .filter(l => l.duration_hours !== null)
    .reduce((sum, l) => sum + (l.duration_hours || 0), 0);
  const activeDowntime = downtimeLogs.find(l => l.end_date === null);
  const downtimeCount = downtimeLogs.length;

  // Helpers
  const isOverdue = (nextDue: string) => new Date(nextDue) < new Date();
  const maintenanceCompliance = schedules.length > 0
    ? Math.round((schedules.filter((s) => !s.is_active || !isOverdue(s.next_due_date)).length / schedules.length) * 100)
    : 100;

  // Health Score
  const healthScore = React.useMemo(() => {
    if (!asset) return 0;
    let score = 100;
    if (totalInspections > 0) score -= (1 - passRate / 100) * 30;
    const overdueSchedules = schedules.filter(s => s.is_active && isOverdue(s.next_due_date)).length;
    const activeSchedules = schedules.filter(s => s.is_active).length;
    if (activeSchedules > 0) score -= (overdueSchedules / activeSchedules) * 25;
    const conditionPenalty: Record<string, number> = { excellent: 0, good: 5, fair: 15, poor: 30, critical: 50 };
    score -= conditionPenalty[asset.condition] || 0;
    if (totalDowntimeHours > 100) score -= 15;
    else if (totalDowntimeHours > 40) score -= 10;
    else if (totalDowntimeHours > 10) score -= 5;
    if (asset.purchase_date) {
      const ageYears = (Date.now() - new Date(asset.purchase_date).getTime()) / (365.25 * 86400000);
      const expectedLife = asset.expected_life_years || 10;
      if (ageYears > expectedLife) score -= 20;
      else if (ageYears > expectedLife * 0.8) score -= 10;
    }
    return Math.max(0, Math.min(100, Math.round(score)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, totalInspections, passRate, schedules, totalDowntimeHours]);

  const healthScoreFactors = React.useMemo(() => {
    if (!asset) return { inspection: 100, maintenance: 100, condition: 100, downtime: 100, age: 100 };
    const inspectionScore = totalInspections > 0
      ? Math.round(Math.max(0, 100 - (1 - passRate / 100) * 30 / 30 * 100))
      : 100;
    const overdueSchedules = schedules.filter(s => s.is_active && isOverdue(s.next_due_date)).length;
    const activeSchedules = schedules.filter(s => s.is_active).length;
    const maintenanceScore = activeSchedules > 0
      ? Math.round(Math.max(0, 100 - (overdueSchedules / activeSchedules) * 100))
      : 100;
    const conditionScoreMap: Record<string, number> = { excellent: 100, good: 83, fair: 60, poor: 30, critical: 0 };
    const conditionScore = conditionScoreMap[asset.condition] ?? 100;
    let downtimeScore = 100;
    if (totalDowntimeHours > 100) downtimeScore = 25;
    else if (totalDowntimeHours > 40) downtimeScore = 50;
    else if (totalDowntimeHours > 10) downtimeScore = 75;
    let ageScore = 100;
    if (asset.purchase_date) {
      const ageYears = (Date.now() - new Date(asset.purchase_date).getTime()) / (365.25 * 86400000);
      const expectedLife = asset.expected_life_years || 10;
      if (ageYears > expectedLife) ageScore = 20;
      else if (ageYears > expectedLife * 0.8) ageScore = 50;
      else ageScore = Math.round(Math.max(0, 100 - (ageYears / expectedLife) * 60));
    }
    return { inspection: inspectionScore, maintenance: maintenanceScore, condition: conditionScore, downtime: downtimeScore, age: ageScore };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, totalInspections, passRate, schedules, totalDowntimeHours]);

  // Certifications
  const certifications = React.useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const rawCerts = [
      { id: "c1", name: "Safety Certificate", certType: "safety", certNumber: "SC-2024-0891", issuingAuthority: "OSHA", expiry: "2025-06-15" },
      { id: "c2", name: "Calibration Certificate", certType: "quality", certNumber: "CAL-2023-1204", issuingAuthority: "ISO Calibration Lab", expiry: "2024-02-28" },
      { id: "c3", name: "ISO 45001 Compliance", certType: "compliance", certNumber: "ISO-45001-2287", issuingAuthority: "BSI Group", expiry: "2025-12-31" },
    ];
    return rawCerts
      .map((cert) => {
        const expiryDate = new Date(cert.expiry);
        const status: "valid" | "expiring" | "expired" = expiryDate < now ? "expired" : expiryDate <= thirtyDaysFromNow ? "expiring" : "valid";
        return { ...cert, status };
      })
      .sort((a, b) => {
        const order = { expired: 0, expiring: 1, valid: 2 };
        return order[a.status] - order[b.status] || new Date(a.expiry).getTime() - new Date(b.expiry).getTime();
      });
  }, []);

  // Mock inspection history
  const inspectionHistory = [
    { id: "i1", date: "2024-01-28", result: "pass", inspector: "John Doe", notes: "All checks passed" },
    { id: "i2", date: "2024-01-21", result: "pass", inspector: "Jane Smith", notes: "Minor wear noted" },
    { id: "i3", date: "2024-01-14", result: "fail", inspector: "John Doe", notes: "Safety guard damaged" },
    { id: "i4", date: "2024-01-07", result: "pass", inspector: "Mike Johnson", notes: "Routine inspection" },
  ];

  return {
    asset,
    isAssetsLoading,
    updateAsset,
    removeAsset,
    users,
    teams,
    locations,
    assetInspections,
    assetIncidents,
    assetLocation,
    assetsAtSameLocation,
    departmentOptions,
    assetMeterReadings,
    addMeterReading,
    totalInspections,
    passRate,
    lastInspectedDays,
    schedules,
    setSchedules,
    maintenanceLogs,
    downtimeLogs,
    totalDowntimeHours,
    activeDowntime,
    downtimeCount,
    maintenanceCompliance,
    healthScore,
    healthScoreFactors,
    certifications,
    inspectionHistory,
  };
}
