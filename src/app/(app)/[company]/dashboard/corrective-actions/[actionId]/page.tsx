"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Save,
  Wrench,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Package,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCorrectiveActionsStore } from "@/stores/corrective-actions-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useUsersStore } from "@/stores/users-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useTranslation } from "@/i18n";
import { capitalize } from "@/lib/utils";
import type { CorrectiveAction } from "@/types";

const STATUS_FLOW: Record<string, string[]> = {
  open: ["in_progress"],
  in_progress: ["completed"],
  completed: [],
};

export default function CorrectiveActionDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const company = useCompanyParam();
  const actionId = routeParams.actionId as string;
  const highlight = searchParams.get("highlight");

  const { t, formatDate } = useTranslation();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const { items: actions, update, isLoading } = useCorrectiveActionsStore();
  const { items: assets } = useAssetsStore();
  const { items: users } = useUsersStore();
  const { items: incidents } = useIncidentsStore();

  const canEdit = hasPermission("incidents.edit_all");

  const action = actions.find((a) => a.id === actionId);

  const [isEditing, setIsEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    description: "",
    resolution_notes: "",
  });

  const highlightRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (action) {
      setEditForm({
        description: action.description,
        resolution_notes: action.resolution_notes || "",
      });
    }
  }, [action?.id]);

  React.useEffect(() => {
    if (highlight && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);

  const getAsset = (id: string | null) => {
    if (!id) return null;
    return assets.find((a) => a.id === id) || null;
  };

  const getUserName = (id: string | null) => {
    if (!id) return t("common.none");
    const u = users.find((usr) => usr.id === id);
    return u ? `${u.first_name} ${u.last_name}` : t("common.none");
  };

  const getIncident = (inspectionId: string | null) => {
    if (!inspectionId) return null;
    return incidents.find((i) => i.id === inspectionId) || null;
  };

  const handleStatusChange = (newStatus: string) => {
    if (!action) return;
    const updates: Partial<CorrectiveAction> = {
      status: newStatus as CorrectiveAction["status"],
      updated_at: new Date().toISOString(),
    };
    if (newStatus === "completed") {
      updates.completed_at = new Date().toISOString();
    }
    update(action.id, updates);
    toast(`${t("workOrders.detail.changeStatus")}: ${capitalize(newStatus.replace("_", " "))}`);
  };

  const handleSave = () => {
    if (!action) return;
    update(action.id, {
      description: editForm.description.trim(),
      resolution_notes: editForm.resolution_notes.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setIsEditing(false);
    toast(t("common.save"));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!action) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Button>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Wrench className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">{t("correctiveActions.detail.notFound")}</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const isOverdue = action.status !== "completed" && new Date(action.due_date) < now;
  const asset = getAsset(action.asset_id);
  const linkedIncident = getIncident(action.inspection_id);
  const nextStatuses = STATUS_FLOW[action.status] || [];

  const statusVariant = action.status === "completed"
    ? "success"
    : action.status === "in_progress"
      ? "warning"
      : isOverdue
        ? "destructive"
        : "secondary";

  const severityVariant = action.severity === "critical" || action.severity === "high"
    ? "destructive"
    : action.severity === "medium"
      ? "warning"
      : "secondary";

  return (
    <div className="space-y-6" ref={highlight ? highlightRef : undefined}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={() => router.push(`/${company}/dashboard/corrective-actions`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold">{t("correctiveActions.detail.title")}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={severityVariant as "destructive" | "warning" | "secondary"} className="capitalize">
              {action.severity}
            </Badge>
            <Badge variant={statusVariant as "success" | "warning" | "secondary" | "destructive"} className="capitalize gap-1">
              {isOverdue ? (
                <>
                  <AlertTriangle className="h-3 w-3" />
                  {t("correctiveActions.detail.overdue")}
                </>
              ) : (
                <>
                  {action.status === "completed" ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {t(`correctiveActions.statuses.${action.status === "in_progress" ? "inProgress" : action.status}`)}
                </>
              )}
            </Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {t("correctiveActions.labels.dueDate")}: {formatDate(action.due_date)}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {canEdit && (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditing(!isEditing)}>
                <Edit className="h-4 w-4" />
                {isEditing ? t("common.cancel") : t("common.edit")}
              </Button>
              {isEditing && (
                <Button size="sm" className="gap-2" onClick={handleSave} disabled={!editForm.description.trim()}>
                  <Save className="h-4 w-4" />
                  {t("common.save")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Overdue banner */}
      {isOverdue && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {t("correctiveActions.detail.overdue")}: {t("correctiveActions.labels.dueDate")}: {formatDate(action.due_date)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status change actions */}
      {nextStatuses.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">{t("workOrders.detail.changeStatus")}:</span>
              {nextStatuses.map((next) => (
                <Button
                  key={next}
                  size="sm"
                  variant="default"
                  className="gap-1"
                  onClick={() => handleStatusChange(next)}
                >
                  {next === "in_progress" && t("correctiveActions.buttons.start")}
                  {next === "completed" && (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      {t("correctiveActions.buttons.complete")}
                    </>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: description + resolution notes */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("correctiveActions.labels.description")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                />
              ) : (
                <p className="text-muted-foreground whitespace-pre-wrap">{action.description}</p>
              )}
            </CardContent>
          </Card>

          {/* Resolution notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t("correctiveActions.detail.resolutionNotes")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.resolution_notes}
                  onChange={(e) => setEditForm((p) => ({ ...p, resolution_notes: e.target.value }))}
                  rows={3}
                  placeholder={t("correctiveActions.detail.resolutionNotesPlaceholder")}
                />
              ) : action.resolution_notes ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{action.resolution_notes}</p>
              ) : (
                <p className="text-muted-foreground italic">{t("correctiveActions.detail.noResolutionNotes")}</p>
              )}
            </CardContent>
          </Card>

          {/* Linked incident */}
          {linkedIncident && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {t("correctiveActions.detail.linkedIncident")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/${company}/dashboard/incidents/${linkedIncident.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{linkedIncident.title}</p>
                    <p className="text-sm text-muted-foreground capitalize">{linkedIncident.status.replace("_", " ")}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize shrink-0">{linkedIncident.severity}</Badge>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("correctiveActions.detail.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">{t("correctiveActions.labels.severity")}</Label>
                <p className="font-medium capitalize mt-0.5">{action.severity}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("correctiveActions.detail.assignedTo")}</Label>
                <p className="font-medium flex items-center gap-2 mt-0.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {getUserName(action.assigned_to)}
                </p>
              </div>
              {asset && (
                <div>
                  <Label className="text-muted-foreground">{t("correctiveActions.detail.linkedAsset")}</Label>
                  <Link
                    href={`/${company}/dashboard/assets/${asset.id}`}
                    className="font-medium text-primary hover:underline flex items-center gap-2 mt-0.5"
                  >
                    <Package className="h-4 w-4 text-muted-foreground" />
                    {asset.name}
                  </Link>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">{t("correctiveActions.labels.dueDate")}</Label>
                <p className={`font-medium mt-0.5 ${isOverdue ? "text-destructive" : ""}`}>
                  {formatDate(action.due_date)}
                  {isOverdue && (
                    <span className="text-xs ml-2">({t("correctiveActions.detail.overdue")})</span>
                  )}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("correctiveActions.detail.created")}</Label>
                <p className="font-medium mt-0.5">{formatDate(action.created_at)}</p>
              </div>
              {action.completed_at && (
                <div>
                  <Label className="text-muted-foreground">{t("correctiveActions.detail.completedAt")}</Label>
                  <p className="font-medium mt-0.5">{formatDate(action.completed_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
