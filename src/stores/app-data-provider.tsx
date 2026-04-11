"use client";

import * as React from "react";
import { CompanyStoreProvider } from "@/stores/company-store";
import { UsersStoreProvider } from "@/stores/users-store";
import { TeamsStoreProvider } from "@/stores/teams-store";
import { LocationsStoreProvider } from "@/stores/locations-store";
import { AssetsStoreProvider } from "@/stores/assets-store";
import { IncidentsStoreProvider } from "@/stores/incidents-store";
import { TicketsStoreProvider } from "@/stores/tickets-store";
import { ContentStoreProvider } from "@/stores/content-store";
import { ChecklistTemplatesProvider, ChecklistSubmissionsProvider } from "@/stores/checklists-store";
import { AssetInspectionsProvider } from "@/stores/inspections-store";
import { RiskEvaluationsProvider } from "@/stores/risk-evaluations-store";
import { CorrectiveActionsProvider } from "@/stores/corrective-actions-store";
import { WorkOrdersProvider } from "@/stores/work-orders-store";
import { WorkOrderStatusLogProvider } from "@/stores/work-order-status-log-store";
import { MeterReadingsProvider } from "@/stores/meter-readings-store";
import { PartsProvider } from "@/stores/parts-store";
import { InspectionRoutesProvider } from "@/stores/inspection-routes-store";
import { InspectionRoundsProvider } from "@/stores/inspection-rounds-store";
import { TrainingCertTypesProvider } from "@/stores/training-cert-types-store";
import { WorkerCertificationsProvider } from "@/stores/worker-certifications-store";
import { TrainingAssignmentsProvider } from "@/stores/training-assignments-store";
import { ComplianceObligationsProvider } from "@/stores/compliance-obligations-store";
import { ComplianceEvidenceProvider } from "@/stores/compliance-evidence-store";
import { ComplianceDocumentsProvider } from "@/stores/compliance-documents-store";
import { PermitsProvider } from "@/stores/permits-store";
import { WasteLogsProvider } from "@/stores/waste-logs-store";
import { SpillRecordsProvider } from "@/stores/spill-records-store";
import { ProcedureTemplatesProvider } from "@/stores/procedure-templates-store";
import { ProcedureSubmissionsProvider } from "@/stores/procedure-submissions-store";
import { NotificationsStoreProvider } from "@/stores/notifications-store";

type DataProvider = React.ComponentType<{ children: React.ReactNode }>;

const APP_DATA_PROVIDERS: DataProvider[] = [
  CompanyStoreProvider,
  UsersStoreProvider,
  TeamsStoreProvider,
  LocationsStoreProvider,
  AssetsStoreProvider,
  IncidentsStoreProvider,
  AssetInspectionsProvider,
  RiskEvaluationsProvider,
  CorrectiveActionsProvider,
  WorkOrdersProvider,
  WorkOrderStatusLogProvider,
  MeterReadingsProvider,
  PartsProvider,
  InspectionRoutesProvider,
  InspectionRoundsProvider,
  TicketsStoreProvider,
  ContentStoreProvider,
  ChecklistTemplatesProvider,
  ChecklistSubmissionsProvider,
  TrainingCertTypesProvider,
  WorkerCertificationsProvider,
  TrainingAssignmentsProvider,
  ComplianceObligationsProvider,
  ComplianceEvidenceProvider,
  ComplianceDocumentsProvider,
  PermitsProvider,
  WasteLogsProvider,
  SpillRecordsProvider,
  ProcedureTemplatesProvider,
  ProcedureSubmissionsProvider,
  NotificationsStoreProvider,
];

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  return APP_DATA_PROVIDERS.reduceRight<React.ReactNode>(
    (tree, Provider) => <Provider>{tree}</Provider>,
    children
  );
}
