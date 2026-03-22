"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ShieldAlert, Calendar, User as UserIcon, AlertTriangle, Clock, FileText, Package, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCorrectiveActionsStore } from "@/stores/corrective-actions-store";
import { useUsersStore } from "@/stores/users-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useAssetInspectionsStore } from "@/stores/inspections-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskDetailHeader, PRIORITY_CONFIG } from "@/components/tasks/task-detail-header";
import { TaskInfoCard } from "@/components/tasks/task-info-card";
import { TaskStatusActions } from "@/components/tasks/task-status-actions";
import { TaskDetailTabs } from "@/components/tasks/task-detail-tabs";
import { TaskComments, loadComments } from "@/components/tasks/task-comments";
import { TaskDocuments } from "@/components/tasks/task-documents";
import { ActionResolution } from "@/components/tasks/action-resolution";
import { getFilesForEntity } from "@/lib/file-storage";
import { isAssignedToUserOrTeam } from "@/lib/assignment-utils";
import { ArrowLeft } from "lucide-react";
import type { CorrectiveActionStatus } from "@/types";

export default function CorrectiveActionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rawCompany = params.company;
  const company = typeof rawCompany === "string" ? rawCompany : Array.isArray(rawCompany) ? rawCompany[0] : "";
  const rawActionId = params.actionId;
  const actionId = typeof rawActionId === "string" ? rawActionId : Array.isArray(rawActionId) ? rawActionId[0] : "";

  const { user } = useAuth();
  const { t, formatDate } = useTranslation();
  const { toast } = useToast();

  const { items: actions, update: updateAction, isLoading } = useCorrectiveActionsStore();
  const { items: users } = useUsersStore();
  const { items: assets } = useAssetsStore();
  const { items: inspections } = useAssetInspectionsStore();

  const [activeTab, setActiveTab] = React.useState("details");

  const matchedAction = actions.find((a) => a.id === actionId);
  const action =
    matchedAction &&
    user?.company_id &&
    matchedAction.company_id === user.company_id &&
    isAssignedToUserOrTeam(matchedAction, user)
      ? matchedAction
      : undefined;
  const assignee = action?.assigned_to ? users.find((u) => u.id === action.assigned_to) : null;
  const asset = action?.asset_id ? assets.find((a) => a.id === action.asset_id) : null;
  const linkedInspection = action?.inspection_id ? inspections.find((inspection) => inspection.id === action.inspection_id) : null;

  const isOverdue = React.useMemo(() => {
    if (!action?.due_date) return false;
    if (action.status === "completed") return false;
    return new Date(action.due_date) < new Date();
  }, [action]);

  const commentCount = React.useMemo(() => loadComments("corrective-action", actionId).length, [actionId]);
  const docCount = React.useMemo(() => getFilesForEntity("corrective-action", actionId).length, [actionId]);

  const handleStatusChange = React.useCallback(
    (targetStatus: string) => {
      if (targetStatus === "completed") {
        // For corrective actions, completion is handled through the Resolution tab
        setActiveTab("resolution");
        toast("Please add resolution notes before completing", "info");
        return;
      }
      updateAction(actionId, {
        status: targetStatus as CorrectiveActionStatus,
        updated_at: new Date().toISOString(),
      });
      toast("Status updated", "success");
    },
    [actionId, updateAction, toast],
  );

  if (isLoading) return <LoadingPage />;

  if (!action) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Corrective Action Not Found"
        description="This action may have been deleted or you don't have access."
        action={<Button variant="outline" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" />Go Back</Button>}
      />
    );
  }

  const severityConf = PRIORITY_CONFIG[action.severity];

  const tabs = [
    { id: "details", label: "Details" },
    { id: "resolution", label: "Resolution" },
    { id: "activity", label: "Activity", count: commentCount },
    { id: "files", label: "Files", count: docCount },
  ];

  return (
    <div className="flex flex-col min-h-full bg-background">
      <TaskDetailHeader title="Corrective Action" subtitle={`#${actionId.slice(0, 10)}`} status={action.status} overdue={isOverdue} />

      {isOverdue && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-xs font-medium text-red-700 dark:text-red-300">
            Overdue — was due {formatDate(new Date(action.due_date), { month: "short", day: "numeric" })}
          </p>
        </div>
      )}

      <TaskDetailTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 px-4 py-4 space-y-4">
        {activeTab === "details" && (
          <>
            <div>
              <div className="flex items-start gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 shrink-0">
                  <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-semibold leading-tight pt-1">Corrective Action</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {severityConf && <Badge className={severityConf.color}>{severityConf.label} severity</Badge>}
              </div>
            </div>

            <TaskInfoCard rows={[
              ...(assignee ? [{ icon: UserIcon, label: "Assigned to", value: assignee.full_name }] : []),
              ...(asset ? [{ icon: Package, label: "Asset", value: asset.name, valueClassName: "text-primary" }] : []),
              { icon: Calendar, label: "Due date", value: formatDate(new Date(action.due_date), { weekday: "short", month: "short", day: "numeric", year: "numeric" }), valueClassName: isOverdue ? "text-red-600 dark:text-red-400" : undefined },
              { icon: Clock, label: "Created", value: formatDate(action.created_at) },
              ...(action.completed_at ? [{ icon: CheckCircle, label: "Completed", value: formatDate(action.completed_at) }] : []),
            ]} />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Description</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{action.description || "No description provided."}</p>
              </CardContent>
            </Card>

            {/* Linked inspection */}
            {linkedInspection && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Linked Inspection</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted/50 text-left">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Inspection {linkedInspection.id}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {linkedInspection.result.replace(/_/g, " ")} · {formatDate(linkedInspection.inspected_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <TaskStatusActions kind="corrective-action" currentStatus={action.status} onStatusChange={handleStatusChange} />
          </>
        )}

        {activeTab === "resolution" && (
          <ActionResolution
            action={action}
            onUpdate={updateAction as never}
            canComplete={action.status === "in_progress"}
            onComplete={() => {
              updateAction(actionId, {
                status: "completed" as CorrectiveActionStatus,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
              toast("Corrective action completed", "success");
            }}
          />
        )}

        {activeTab === "activity" && <TaskComments entityType="corrective-action" entityId={actionId} formatDate={formatDate} />}
        {activeTab === "files" && <TaskDocuments entityType="corrective-action" entityId={actionId} formatDate={formatDate} />}
      </div>
    </div>
  );
}
