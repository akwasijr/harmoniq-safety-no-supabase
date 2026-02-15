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
import { MeterReadingsProvider } from "@/stores/meter-readings-store";
import { PartsProvider } from "@/stores/parts-store";
import { InspectionRoutesProvider } from "@/stores/inspection-routes-store";
import { InspectionRoundsProvider } from "@/stores/inspection-rounds-store";
import { NotificationsStoreProvider } from "@/stores/notifications-store";

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  return (
    <CompanyStoreProvider>
      <UsersStoreProvider>
        <TeamsStoreProvider>
          <LocationsStoreProvider>
            <AssetsStoreProvider>
              <IncidentsStoreProvider>
                <AssetInspectionsProvider>
                  <RiskEvaluationsProvider>
                    <CorrectiveActionsProvider>
                      <WorkOrdersProvider>
                        <MeterReadingsProvider>
                          <PartsProvider>
                            <InspectionRoutesProvider>
                              <InspectionRoundsProvider>
                                <TicketsStoreProvider>
                                  <ContentStoreProvider>
                                    <ChecklistTemplatesProvider>
                                      <ChecklistSubmissionsProvider>
                                        <NotificationsStoreProvider>
                                          {children}
                                        </NotificationsStoreProvider>
                                      </ChecklistSubmissionsProvider>
                                    </ChecklistTemplatesProvider>
                                  </ContentStoreProvider>
                                </TicketsStoreProvider>
                              </InspectionRoundsProvider>
                            </InspectionRoutesProvider>
                          </PartsProvider>
                        </MeterReadingsProvider>
                      </WorkOrdersProvider>
                    </CorrectiveActionsProvider>
                  </RiskEvaluationsProvider>
                </AssetInspectionsProvider>
              </IncidentsStoreProvider>
            </AssetsStoreProvider>
          </LocationsStoreProvider>
        </TeamsStoreProvider>
      </UsersStoreProvider>
    </CompanyStoreProvider>
  );
}
