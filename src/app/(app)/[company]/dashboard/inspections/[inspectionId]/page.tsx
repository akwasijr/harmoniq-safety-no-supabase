"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowLeft,
  Wrench,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  Info,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailTabs, Tab } from "@/components/ui/detail-tabs";
import { useTranslation } from "@/i18n";
import { useCompanyData } from "@/hooks/use-company-data";
import { RoleGuard } from "@/components/auth/role-guard";

export default function InspectionDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const inspectionId = routeParams.inspectionId as string;
  const { t, formatDate } = useTranslation();
  const {
    checklistTemplates,
    checklistSubmissions,
    incidents,
    inspections,
    assets,
    correctiveActions,
    workOrders,
    users,
    stores,
  } = useCompanyData();
  const { isLoading } = stores.inspections;
  const [activeTab, setActiveTab] = React.useState("overview");

  const inspectionTabs: Tab[] = [
    { id: "overview", label: t("inspections.tabs.overview"), icon: Info },
    { id: "details", label: t("inspections.tabs.details"), icon: FileText },
  ];

  const inspection = inspections.find((i) => i.id === inspectionId);
  const asset = inspection ? assets.find((a) => a.id === inspection.asset_id) : null;
  const inspector = inspection ? users.find((u) => u.id === inspection.inspector_id) : null;
  const checklistSubmission = inspection?.checklist_id
    ? checklistSubmissions.find((submission) => submission.id === inspection.checklist_id)
    : null;
  const checklistTemplate = checklistSubmission
    ? checklistTemplates.find((template) => template.id === checklistSubmission.template_id) || null
    : inspection?.checklist_id
      ? checklistTemplates.find((template) => template.id === inspection.checklist_id) || null
      : null;
  const linkedIncident = inspection?.incident_id
    ? incidents.find((incident) => incident.id === inspection.incident_id) || null
    : null;
  const relatedCorrectiveActions = inspection
    ? correctiveActions.filter((action) => action.inspection_id === inspectionId)
    : [];
  const relatedWorkOrders = relatedCorrectiveActions.length === 0
    ? []
    : workOrders.filter((workOrder) =>
        workOrder.corrective_action_id != null &&
        relatedCorrectiveActions.some((action) => action.id === workOrder.corrective_action_id),
      );

  if (isLoading && inspections.length === 0) {
    return <LoadingPage />;
  }

  if (!inspection) {
    return <EmptyState title={t("inspections.notFound")} description={t("inspections.notFoundDesc")} />;
  }

  const resultVariant = inspection.result === "pass" ? "success" : inspection.result === "fail" ? "destructive" : "warning";
  const resultLabel = t(`inspections.result.${inspection.result}`);
  const ResultIcon = inspection.result === "pass" ? CheckCircle : inspection.result === "fail" ? XCircle : AlertTriangle;

  return (
    <RoleGuard requiredPermission="checklists.view">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${company}/dashboard/checklists?tab=inspection`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{asset?.name || t("nav.inspections")}</h1>
              <Badge variant={resultVariant}>{resultLabel}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {asset?.asset_tag ? `${asset.asset_tag} · ` : ""}{t("inspections.labels.inspectedAt")} {formatDate(inspection.inspected_at)}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {inspector?.full_name || t("inspections.labels.inspector")}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatDate(inspection.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Result Summary Card */}
      <Card className={inspection.result === "pass" ? "border-success/50 bg-success/5" : inspection.result === "fail" ? "border-destructive/50 bg-destructive/5" : "border-warning/50 bg-warning/5"}>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${inspection.result === "pass" ? "bg-success/10" : inspection.result === "fail" ? "bg-destructive/10" : "bg-warning/10"}`}>
              <ResultIcon className={`h-6 w-6 ${inspection.result === "pass" ? "text-success" : inspection.result === "fail" ? "text-destructive" : "text-warning"}`} />
            </div>
            <div>
              <p className="font-medium">{t("inspections.resultSummary", { result: resultLabel })}</p>
              <p className="text-sm text-muted-foreground">
                {t("inspections.resultLabel")}: {resultLabel}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <DetailTabs tabs={inspectionTabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("inspections.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("inspections.labels.asset")}</p>
                    <p className="font-medium flex items-center gap-2 mt-1">
                      <Wrench className="h-4 w-4" /> {asset?.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("inspections.labels.inspector")}</p>
                    <p className="font-medium flex items-center gap-2 mt-1">
                      <User className="h-4 w-4" /> {inspector?.full_name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("inspections.labels.inspectedAt")}</p>
                    <p className="font-medium flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4" /> {formatDate(inspection.inspected_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("inspections.labels.result")}</p>
                    <div className="mt-1">
                      <Badge variant={resultVariant}>{resultLabel}</Badge>
                    </div>
                  </div>
                  {inspection.checklist_id && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t("inspections.labels.checklistId")}</p>
                      {checklistTemplate ? (
                        <Link
                          href={`/${company}/dashboard/checklists/${checklistSubmission?.id || checklistTemplate.id}`}
                          className="mt-1 block rounded-lg border px-3 py-2 transition-colors hover:bg-muted/40"
                        >
                          <p className="font-medium">{checklistTemplate.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {checklistSubmission ? `Submission ${checklistSubmission.id}` : `Template ${checklistTemplate.id}`}
                          </p>
                        </Link>
                      ) : (
                        <p className="font-medium mt-1">{inspection.checklist_id}</p>
                      )}
                    </div>
                  )}
                  {inspection.incident_id && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t("inspections.labels.linkedIncident")}</p>
                      {linkedIncident ? (
                        <Link
                          href={`/${company}/dashboard/incidents/${linkedIncident.id}`}
                          className="mt-1 block rounded-lg border px-3 py-2 transition-colors hover:bg-muted/40"
                        >
                          <p className="font-medium">{linkedIncident.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {linkedIncident.status.replace(/_/g, " ")}
                          </p>
                        </Link>
                      ) : (
                        <p className="font-medium mt-1">{inspection.incident_id}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {inspection.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("inspections.labels.notes")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{inspection.notes}</p>
                </CardContent>
              </Card>
            )}

            {(inspection.result !== "pass" || relatedCorrectiveActions.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Corrective actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {relatedCorrectiveActions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No corrective actions are linked to this inspection yet.
                    </p>
                  ) : (
                    relatedCorrectiveActions.map((action) => (
                      <Link
                        key={action.id}
                        href={`/${company}/dashboard/corrective-actions/${action.id}`}
                        className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{action.description}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Due {formatDate(action.due_date)} · Severity {action.severity}
                            </p>
                          </div>
                          <Badge variant={action.status === "completed" ? "success" : action.status === "overdue" ? "destructive" : "warning"}>
                            {action.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {relatedWorkOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Linked work orders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {relatedWorkOrders.map((workOrder) => (
                    <Link
                      key={workOrder.id}
                      href={`/${company}/dashboard/work-orders/${workOrder.id}`}
                      className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{workOrder.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground capitalize">
                            {workOrder.status.replace(/_/g, " ")}
                          </p>
                        </div>
                        <Badge
                          variant={
                            workOrder.status === "completed"
                              ? "success"
                              : workOrder.status === "cancelled"
                                ? "destructive"
                                : "warning"
                          }
                        >
                          {workOrder.priority}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("inspections.labels.assetInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {asset ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("inspections.labels.assetName")}</span>
                      <span className="font-medium">{asset.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("inspections.labels.assetTag")}</span>
                      <span className="font-medium">{asset.asset_tag || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("inspections.labels.assetStatus")}</span>
                      <Badge variant={asset.status === "active" ? "success" : "secondary"} className="capitalize">{asset.status}</Badge>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("inspections.labels.assetNotAvailable")}</p>
                )}
              </CardContent>
            </Card>

            {inspection.gps_lat != null && inspection.gps_lng != null && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("inspections.labels.location")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("inspections.labels.latitude")}</span>
                    <span className="font-medium">{inspection.gps_lat}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("inspections.labels.longitude")}</span>
                    <span className="font-medium">{inspection.gps_lng}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === "details" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("inspections.labels.fullRecord")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">{t("inspections.labels.inspectionId")}</p>
                    <p className="font-mono text-sm">{inspection.id}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">{t("inspections.labels.assetId")}</p>
                    <p className="text-sm font-medium">{asset?.name || inspection.asset_id}</p>
                    <p className="font-mono text-xs text-muted-foreground mt-1">{inspection.asset_id}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">{t("inspections.labels.inspectorId")}</p>
                    <p className="text-sm font-medium">{inspector?.full_name || inspection.inspector_id}</p>
                    <p className="font-mono text-xs text-muted-foreground mt-1">{inspection.inspector_id}</p>
                  </div>
                  {inspection.checklist_id && (
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">{t("inspections.labels.checklistId")}</p>
                      <p className="text-sm font-medium">{checklistTemplate?.name || inspection.checklist_id}</p>
                      <p className="font-mono text-xs text-muted-foreground mt-1">
                        {checklistSubmission ? checklistSubmission.id : inspection.checklist_id}
                      </p>
                    </div>
                  )}
                  {inspection.incident_id && (
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">{t("inspections.labels.incidentId")}</p>
                      <p className="text-sm font-medium">{linkedIncident?.title || inspection.incident_id}</p>
                      <p className="font-mono text-xs text-muted-foreground mt-1">{inspection.incident_id}</p>
                    </div>
                  )}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">{t("inspections.labels.createdAt")}</p>
                    <p className="text-sm">{formatDate(inspection.created_at)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {inspection.media_urls && inspection.media_urls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" /> {t("inspections.labels.mediaAttachments")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {inspection.media_urls.map((url, idx) => (
                    <div key={idx} className="p-3 rounded-lg border text-sm">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">
                        {url}
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
