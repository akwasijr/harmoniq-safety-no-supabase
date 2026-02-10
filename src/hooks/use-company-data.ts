"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useTicketsStore } from "@/stores/tickets-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useUsersStore } from "@/stores/users-store";
import { useTeamsStore } from "@/stores/teams-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useContentStore } from "@/stores/content-store";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useAssetInspectionsStore } from "@/stores/inspections-store";
import { usePartsStore } from "@/stores/parts-store";
import { useCorrectiveActionsStore } from "@/stores/corrective-actions-store";
import { useMeterReadingsStore } from "@/stores/meter-readings-store";
import { useRiskEvaluationsStore } from "@/stores/risk-evaluations-store";

/**
 * Returns all entity stores with items pre-filtered by the current user's company.
 * Super admins with a selected company see that company's data;
 * super admins without a company selected see ALL data.
 *
 * Usage: const { incidents, assets, ... } = useCompanyData();
 */
export function useCompanyData() {
  const { user, currentCompany, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? currentCompany?.id : user?.company_id;

  const incidentsStore = useIncidentsStore();
  const assetsStore = useAssetsStore();
  const ticketsStore = useTicketsStore();
  const locationsStore = useLocationsStore();
  const usersStore = useUsersStore();
  const teamsStore = useTeamsStore();
  const workOrdersStore = useWorkOrdersStore();
  const contentStore = useContentStore();
  const checklistTemplatesStore = useChecklistTemplatesStore();
  const checklistSubmissionsStore = useChecklistSubmissionsStore();
  const inspectionsStore = useAssetInspectionsStore();
  const partsStore = usePartsStore();
  const correctiveActionsStore = useCorrectiveActionsStore();
  const meterReadingsStore = useMeterReadingsStore();
  const riskEvaluationsStore = useRiskEvaluationsStore();

  const incidents = useMemo(() => incidentsStore.itemsForCompany(companyId), [incidentsStore, companyId]);
  const assets = useMemo(() => assetsStore.itemsForCompany(companyId), [assetsStore, companyId]);
  const tickets = useMemo(() => ticketsStore.itemsForCompany(companyId), [ticketsStore, companyId]);
  const locations = useMemo(() => locationsStore.itemsForCompany(companyId), [locationsStore, companyId]);
  const users = useMemo(() => usersStore.itemsForCompany(companyId), [usersStore, companyId]);
  const teams = useMemo(() => teamsStore.itemsForCompany(companyId), [teamsStore, companyId]);
  const workOrders = useMemo(() => workOrdersStore.itemsForCompany(companyId), [workOrdersStore, companyId]);
  const content = useMemo(() => contentStore.itemsForCompany(companyId), [contentStore, companyId]);
  const checklistTemplates = useMemo(() => checklistTemplatesStore.itemsForCompany(companyId), [checklistTemplatesStore, companyId]);
  const checklistSubmissions = useMemo(() => checklistSubmissionsStore.itemsForCompany(companyId), [checklistSubmissionsStore, companyId]);
  const inspections = useMemo(() => inspectionsStore.itemsForCompany(companyId), [inspectionsStore, companyId]);
  const parts = useMemo(() => partsStore.itemsForCompany(companyId), [partsStore, companyId]);
  const correctiveActions = useMemo(() => correctiveActionsStore.itemsForCompany(companyId), [correctiveActionsStore, companyId]);
  const meterReadings = useMemo(() => meterReadingsStore.itemsForCompany(companyId), [meterReadingsStore, companyId]);
  const riskEvaluations = useMemo(() => riskEvaluationsStore.itemsForCompany(companyId), [riskEvaluationsStore, companyId]);

  return {
    incidents,
    assets,
    tickets,
    locations,
    users,
    teams,
    workOrders,
    content,
    checklistTemplates,
    checklistSubmissions,
    inspections,
    parts,
    correctiveActions,
    meterReadings,
    riskEvaluations,
    // Expose raw stores for mutations (add/update/remove don't need filtering)
    stores: {
      incidents: incidentsStore,
      assets: assetsStore,
      tickets: ticketsStore,
      locations: locationsStore,
      users: usersStore,
      teams: teamsStore,
      workOrders: workOrdersStore,
      content: contentStore,
      checklistTemplates: checklistTemplatesStore,
      checklistSubmissions: checklistSubmissionsStore,
      inspections: inspectionsStore,
      parts: partsStore,
      correctiveActions: correctiveActionsStore,
      meterReadings: meterReadingsStore,
      riskEvaluations: riskEvaluationsStore,
    },
    companyId,
  };
}
