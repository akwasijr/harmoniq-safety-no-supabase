"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  GripVertical,
  Upload,
  CheckSquare,
  Info,
  ListChecks,
  BarChart3,
  Settings,
  Copy,
  Eye,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Send,
  Archive,
  RotateCcw,
  Pencil,
  Image as ImageIcon,
  X,
  Hash,
  Type,
  ToggleLeft,
  Camera,
  Calendar,
  PenTool,
  List,
  Star,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailTabs, Tab } from "@/components/ui/detail-tabs";
import { useCompanyData } from "@/hooks/use-company-data";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import type { ChecklistItem } from "@/types";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import { getTemplatePublishStatus } from "@/lib/template-activation";

const baseTabs: Tab[] = [
  { id: "items", label: "Checklist Items", icon: ListChecks },
  { id: "details", label: "Details", icon: Info },
];

const publishedTabs: Tab[] = [
  { id: "submissions", label: "Submissions", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings, variant: "danger" },
];

// Tabs for submission view
const submissionTabs: Tab[] = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "responses", label: "Responses", icon: ListChecks },
];

export default function ChecklistDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const checklistId = routeParams.checklistId as string;
  const [activeTab, setActiveTab] = React.useState("items");
  const [isEditing, setIsEditing] = React.useState(false);
  const [stableNow] = React.useState(() => Date.now());

  const { toast } = useToast();
  const { t, formatDate } = useTranslation();
  const { checklistTemplates: templates, checklistSubmissions: submissions, users, locations, stores } = useCompanyData();
  const { isLoading, add: addTemplate, update: updateTemplate, remove: removeTemplate } = stores.checklistTemplates;
  const { update: updateSubmission } = stores.checklistSubmissions;
  const { isSuperAdmin, isCompanyAdmin, isManager, currentCompany } = useAuth();
  const canApprove = isSuperAdmin || isCompanyAdmin || isManager;

  const submission = submissions.find((item) => item.id === checklistId);
  const isSubmission = Boolean(submission);
  const template = isSubmission
    ? templates.find((item) => item.id === submission?.template_id)
    : templates.find((item) => item.id === checklistId);

  const templateStatus = template ? getTemplatePublishStatus(template) : "draft";
  const isPublished = templateStatus === "published";
  const tabs = isPublished ? [...baseTabs, ...publishedTabs] : baseTabs;

  // Form data state - initialize after template is available
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    category: "",
  });
  const [itemsDraft, setItemsDraft] = React.useState<ChecklistItem[]>([]);
  const [assignment, setAssignment] = React.useState<"all" | "department" | "role">("all");
  const [recurrence, setRecurrence] = React.useState<"daily" | "weekly" | "monthly" | "once">("daily");

  React.useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || "",
        category: template.category || "",
      });
      setItemsDraft(template.items);
      setAssignment(template.assignment || "all");
      setRecurrence(template.recurrence || "daily");
    }
  }, [template?.id]);

  // Item editor modal state — must be declared before any early returns
  const [showItemModal, setShowItemModal] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ChecklistItem | null>(null);
  const [itemForm, setItemForm] = React.useState<ChecklistItem>({
    id: "",
    question: "",
    type: "yes_no_na",
    required: true,
    order: 0,
    description: "",
    response_types: undefined,
    options: [],
    image_url: "",
    min_value: undefined,
    max_value: undefined,
    unit: "",
  });
  const [newOption, setNewOption] = React.useState("");
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!checklistId) return;
    setActiveTab(isSubmission ? "overview" : "items");
  }, [checklistId, isSubmission]);

  if (!checklistId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const templateSubmissions = template
    ? submissions.filter((item) => item.template_id === template.id)
    : [];
  const submittedCount = templateSubmissions.filter((item) => item.status === "submitted").length;
  const completionRate = templateSubmissions.length
    ? Math.round((submittedCount / templateSubmissions.length) * 100)
    : 0;
  const recentSubmissions = templateSubmissions.slice(0, 6).map((item) => {
    const submitter = users.find((user) => user.id === item.submitter_id);
    const booleanResponses = item.responses.filter((response) => typeof response.value === "boolean");
    const passCount = booleanResponses.filter((response) => response.value === true).length;
    const score = booleanResponses.length
      ? `${Math.round((passCount / booleanResponses.length) * 100)}%`
      : "—";
    return {
      id: item.id,
      user: submitter?.full_name || "Unknown",
      date: formatDate(new Date(item.submitted_at || item.created_at)),
      status: item.status as string,
      score,
    };
  });
  const submissionsByDate = templateSubmissions.reduce<Record<string, number>>((acc, item) => {
    const dateKey = new Date(item.submitted_at || item.created_at).toISOString().split("T")[0];
    acc[dateKey] = (acc[dateKey] || 0) + 1;
    return acc;
  }, {});
  const submissionTrend = Object.entries(submissionsByDate).sort(([a], [b]) => a.localeCompare(b));

  const resetEdits = () => {
    if (!template) return;
    setFormData({
      name: template.name,
      description: template.description || "",
      category: template.category || "",
    });
    setItemsDraft(template.items);
    setAssignment(template.assignment || "all");
    setRecurrence(template.recurrence || "daily");
    setIsEditing(false);
  };

  const handleSaveTemplate = () => {
    if (!template) return;
    const now = new Date().toISOString();
    const orderedItems = itemsDraft.map((item, index) => ({
      ...item,
      order: index + 1,
    }));
    updateTemplate(template.id, {
      name: formData.name.trim() || template.name,
      description: formData.description.trim() || undefined,
      category: formData.category.trim() || undefined,
      assignment,
      recurrence,
      items: orderedItems,
      updated_at: now,
    });
    toast("Saved as draft");
    setIsEditing(false);
  };

  const handleSaveAndPush = () => {
    if (!template) return;
    const now = new Date().toISOString();
    const orderedItems = itemsDraft.map((item, index) => ({
      ...item,
      order: index + 1,
    }));
    updateTemplate(template.id, {
      name: formData.name.trim() || template.name,
      description: formData.description.trim() || undefined,
      category: formData.category.trim() || undefined,
      assignment,
      recurrence,
      items: orderedItems,
      publish_status: "published",
      is_active: true,
      updated_at: now,
    });
    toast("Saved and pushed to field workers", "success");
    setIsEditing(false);
  };

  const handleDuplicateTemplate = () => {
    if (!template) return;
    const now = new Date().toISOString();
    const duplicateId = crypto.randomUUID();
    addTemplate({
      ...template,
      id: duplicateId,
      name: `${template.name} (Copy)`,
      items: template.items.map((item) => ({ ...item })),
      created_at: now,
      updated_at: now,
    });
    toast("Checklist template duplicated");
    router.push(`/${company}/dashboard/checklists/${duplicateId}`);
  };

  const handleArchiveTemplate = () => {
    if (!template) return;
    updateTemplate(template.id, { publish_status: "archived", is_active: false, updated_at: new Date().toISOString() });
    toast("Template archived");
  };

  const handlePublish = () => {
    if (!template) return;
    updateTemplate(template.id, { publish_status: "published", is_active: true, updated_at: new Date().toISOString() });
    toast(t("industry_templates._ui.publishedSuccess"));
  };

  const handleUnpublish = () => {
    if (!template) return;
    updateTemplate(template.id, { publish_status: "draft", is_active: false, updated_at: new Date().toISOString() });
    toast(t("industry_templates._ui.unpublishedSuccess"));
  };

  const handleArchivePublish = () => {
    if (!template) return;
    updateTemplate(template.id, { publish_status: "archived", is_active: false, updated_at: new Date().toISOString() });
    toast(t("industry_templates._ui.archivedSuccess"));
  };

  const handleRestore = () => {
    if (!template) return;
    updateTemplate(template.id, { publish_status: "draft", is_active: false, updated_at: new Date().toISOString() });
    toast(t("industry_templates._ui.restoredSuccess"));
  };

  const handleDeleteTemplate = () => {
    if (!template) return;
    removeTemplate(template.id);
    toast("Template deleted");
    router.push(`/${company}/dashboard/checklists`);
  };

  const ITEM_TYPES = [
    { value: "yes_no_na", label: "Yes / No / N/A", icon: ToggleLeft, description: "Three-choice compliance check" },
    { value: "pass_fail", label: "Pass / Fail", icon: CheckCircle, description: "Binary pass or fail inspection" },
    { value: "text", label: "Text", icon: Type, description: "Open text response" },
    { value: "number", label: "Number", icon: Hash, description: "Numeric measurement with optional unit" },
    { value: "rating", label: "Rating", icon: Star, description: "Score on a scale (e.g. 1-5)" },
    { value: "photo", label: "Photo", icon: Camera, description: "Require a photo to be taken" },
    { value: "date", label: "Date", icon: Calendar, description: "Date picker" },
    { value: "signature", label: "Signature", icon: PenTool, description: "Require a signature" },
    { value: "select", label: "Multiple Choice", icon: List, description: "Choose from a list of options" },
  ] as const;

  const openAddItemModal = () => {
    setEditingItem(null);
    setItemForm({
      id: crypto.randomUUID(),
      question: "",
      type: "yes_no_na",
      required: true,
      order: itemsDraft.length + 1,
      description: "",
      response_types: undefined,
      options: [],
      image_url: "",
      min_value: undefined,
      max_value: undefined,
      unit: "",
    });
    setNewOption("");
    setShowItemModal(true);
  };

  const openEditItemModal = (item: ChecklistItem) => {
    setEditingItem(item);
    const resolvedType = item.response_types?.[0] || item.type;
    setItemForm({
      ...item,
      type: resolvedType,
      description: item.description || "",
      image_url: item.image_url || "",
      unit: item.unit || "",
      options: item.options || [],
      response_types: item.response_types?.length ? [item.response_types[0]] : undefined,
    });
    setNewOption("");
    setShowItemModal(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.question.trim()) return;
    const selectedType = itemForm.response_types?.[0] || itemForm.type;
    const cleanedItem: ChecklistItem = {
      ...itemForm,
      type: selectedType,
      response_types: undefined,
      question: itemForm.question.trim(),
      description: itemForm.description?.trim() || undefined,
      image_url: itemForm.image_url?.trim() || undefined,
      unit: itemForm.unit?.trim() || undefined,
      options: selectedType === "select" && itemForm.options?.length ? itemForm.options : undefined,
      min_value: selectedType === "number" || selectedType === "rating" ? itemForm.min_value : undefined,
      max_value: selectedType === "number" || selectedType === "rating" ? itemForm.max_value : undefined,
    };

    if (editingItem) {
      setItemsDraft((prev) => prev.map((i) => (i.id === editingItem.id ? cleanedItem : i)));
    } else {
      setItemsDraft((prev) => [...prev, cleanedItem]);
    }
    setShowItemModal(false);
  };

  const handleRemoveItem = (itemId: string) => {
    setItemsDraft((prev) => prev.filter((item) => item.id !== itemId).map((item, idx) => ({ ...item, order: idx + 1 })));
  };

    const handleDragReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setItemsDraft((prev) => {
      const items = [...prev];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return items.map((item, idx) => ({ ...item, order: idx + 1 }));
    });
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    setItemForm((prev) => ({ ...prev, options: [...(prev.options || []), newOption.trim()] }));
    setNewOption("");
  };

  const handleRemoveOption = (index: number) => {
    setItemForm((prev) => ({ ...prev, options: (prev.options || []).filter((_, i) => i !== index) }));
  };

  // If it's a submission, render submission view
  if (isSubmission) {
    if (isLoading && templates.length === 0) {
      return <LoadingPage />;
    }
    if (!submission) {
      return (
        <div className="flex items-center justify-center h-64 flex-col gap-4">
          <EmptyState title="Submission not found" description={`Submission ${checklistId} could not be found.`} />
          <Button variant="outline" onClick={() => router.push(`/${company}/dashboard/checklists`)}>
            {t("common.back")}
          </Button>
        </div>
      );
    }

    const submittedAt = submission.submitted_at || submission.created_at;
    const submissionLocation = locations.find((item) => item.id === submission.location_id);
    const submissionUser = users.find((item) => item.id === submission.submitter_id);
    const booleanResponses = submission.responses.filter((response) => typeof response.value === "boolean");
    const passCount = booleanResponses.filter((response) => response.value === true).length;
    const failCount = booleanResponses.filter((response) => response.value === false).length;
    const totalCount = submission.responses.length;
    const scoreValue = booleanResponses.length
      ? `${Math.round((passCount / booleanResponses.length) * 100)}%`
      : "—";
    const statusLabel = submission.status === "submitted" ? "completed" : "in_progress";
    const responseItems = submission.responses.map((response) => {
      const item = template?.items.find((templateItem) => templateItem.id === response.item_id);
      const responseLabel =
        typeof response.value === "boolean"
          ? response.value
            ? "yes"
            : "no"
          : response.value === null || response.value === ""
          ? "—"
          : String(response.value);
      return {
        id: response.item_id,
        question: item?.question || "Checklist item",
        value: responseLabel,
        isPass: response.value === true,
        isFail: response.value === false,
        comment: response.comment,
      };
    });

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/${company}/dashboard/checklists`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{template?.name || "Checklist"}</h1>
                <Badge variant={
                  submission.status === "approved" ? "success" :
                  submission.status === "rejected" ? "destructive" :
                  submission.status === "submitted" ? "outline" : "warning"
                }>
                  {submission.status === "approved" ? t("checklists.approved") :
                   submission.status === "rejected" ? t("checklists.rejected") :
                   statusLabel.replace("_", " ")}
                </Badge>
                {failCount > 0 && (
                  <span className="text-sm text-destructive">{failCount} issue{failCount > 1 ? "s" : ""}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Submitted by {submissionUser?.full_name || "Unknown"} • {submissionLocation?.name || "Unassigned location"} • {formatDate(new Date(submittedAt))}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canApprove && submission.status === "submitted" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => {
                    updateSubmission(submission.id, { status: "rejected" });
                    toast(t("checklists.rejected"), "info");
                  }}
                >
                  <XCircle className="h-4 w-4" />
                  {t("checklists.reject")}
                </Button>
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    updateSubmission(submission.id, { status: "approved" });
                    toast(t("checklists.approved"), "success");
                  }}
                >
                  <CheckCircle className="h-4 w-4" />
                  {t("checklists.approve")}
                </Button>
              </>
            )}
            {submission.status === "approved" && (
              <Badge variant="success" className="gap-1 py-1.5 px-3">
                <CheckCircle className="h-3 w-3" /> {t("checklists.approved")}
              </Badge>
            )}
            {submission.status === "rejected" && (
              <Badge variant="destructive" className="gap-1 py-1.5 px-3">
                <XCircle className="h-3 w-3" /> {t("checklists.rejected")}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const { ChecklistPDF, downloadPDF } = await import("@/lib/pdf-export");
                  const doc = <ChecklistPDF
                    companyName={currentCompany?.name || company}
                    templateName={template?.name || "Checklist"}
                    submission={{
                      responses: submission.responses,
                      submitted_at: submission.submitted_at,
                      submitter_name: submissionUser?.full_name || "Unknown",
                      general_comments: submission.general_comments,
                    }}
                    items={template?.items || []}
                  />;
                  const datePart = new Date(submittedAt).toISOString().split("T")[0];
                  await downloadPDF(doc, `checklist-${template?.name?.replace(/\s+/g, "-").toLowerCase() || "report"}-${datePart}.pdf`);
                } catch {
                  // silently fail
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <DetailTabs tabs={submissionTabs} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Submission Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Template</p>
                    <p className="font-medium">{template?.name || "Checklist"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{submissionLocation?.name || "Unassigned location"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Submitted By</p>
                    <p className="font-medium">{submissionUser?.full_name || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date & Time</p>
                    <p className="font-medium">{formatDate(new Date(submittedAt))}</p>
                  </div>
                </div>
                {submission.general_comments && (
                  <div className="pt-4 border-t">
                    <p className="text-muted-foreground text-sm mb-1">General Notes</p>
                    <p className="text-sm">{submission.general_comments}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Score Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <p className={`text-5xl font-bold ${scoreValue === "100%" ? "text-success" : failCount > 2 ? "text-destructive" : "text-warning"}`}>
                      {scoreValue}
                    </p>
                    <p className="text-muted-foreground mt-2">Compliance Score</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t text-center">
                  <div>
                    <p className="text-2xl font-semibold text-success">{passCount}</p>
                    <p className="text-xs text-muted-foreground">Passed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-destructive">{failCount}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{totalCount}</p>
                    <p className="text-xs text-muted-foreground">Total Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Responses Tab */}
        {activeTab === "responses" && (
          <Card>
            <CardHeader>
              <CardTitle>All Responses</CardTitle>
            </CardHeader>
              <CardContent>
                <div className="space-y-3">
                {responseItems.map((response, index) => (
                  <div 
                    key={response.id} 
                    className={`flex items-start gap-4 p-3 rounded-lg border ${
                      response.isFail 
                        ? "border-destructive/50 bg-destructive/5" 
                        : "border-muted"
                    }`}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{response.question}</p>
                      {response.comment && (
                        <p className="text-xs text-destructive mt-1">Note: {response.comment}</p>
                      )}
                    </div>
                    <Badge 
                      variant={
                        response.isPass 
                          ? "success" 
                          : response.isFail
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {response.value}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Template view (existing code)
  if (isLoading && templates.length === 0) {
    return <LoadingPage />;
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-64 flex-col gap-4">
        <EmptyState title="Template not found" description={`Template ${checklistId} could not be found.`} />
        <Button variant="outline" onClick={() => router.push(`/${company}/dashboard/checklists`)}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <RoleGuard requiredPermission="checklists.view">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{template.name}</h1>
                {templateStatus === "published" ? (
                  <Badge variant="success" className="text-xs">{t("industry_templates._ui.published")}</Badge>
                ) : templateStatus === "archived" ? (
                  <Badge variant="warning" className="text-xs">{t("industry_templates._ui.archived")}</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">{t("industry_templates._ui.draft")}</Badge>
                )}
                {template.regulation && (
                  <span className="text-xs text-muted-foreground">{template.regulation}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {template.items.length} {t("checklists.labels.items")} • {templateSubmissions.length} submissions • Last updated {formatDate(new Date(template.updated_at))}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Publish workflow controls */}
            {templateStatus === "draft" ? (
              <Button variant="outline" className="gap-2" onClick={handlePublish}>
                <Send className="h-4 w-4" /> {t("industry_templates._ui.publishToApp")}
              </Button>
            ) : templateStatus === "published" ? (
              <>
                <Button variant="outline" className="gap-2" onClick={handleUnpublish}>
                  <RotateCcw className="h-4 w-4" /> {t("industry_templates._ui.unpublish")}
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleArchivePublish}>
                  <Archive className="h-4 w-4" /> {t("industry_templates._ui.archive")}
                </Button>
              </>
            ) : templateStatus === "archived" ? (
              <Button variant="outline" className="gap-2" onClick={handleRestore}>
                <RotateCcw className="h-4 w-4" /> {t("industry_templates._ui.restore")}
              </Button>
            ) : null}
            <Button variant="outline" className="gap-2" onClick={handleDuplicateTemplate}>
              <Copy className="h-4 w-4" /> Duplicate
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push(`/${company}/app/checklists/${template.id}`)}
            >
              <Eye className="h-4 w-4" /> Preview
            </Button>
            {isEditing && (
              <>
                <Button variant="outline" className="gap-2" onClick={handleSaveTemplate}><Save className="h-4 w-4" /> Save Draft</Button>
                {templateStatus !== "published" && (
                  <Button className="gap-2" onClick={handleSaveAndPush}><Send className="h-4 w-4" /> Save & Push</Button>
                )}
                {templateStatus === "published" && (
                  <Button className="gap-2" onClick={handleSaveTemplate}><Save className="h-4 w-4" /> Save Changes</Button>
                )}
              </>
            )}
        </div>
      </div>

      {/* Tabs */}
      <DetailTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === "details" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Template Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label htmlFor="name">Template Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="mt-1">{template.description || "—"}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Category</p>
                        <p className="font-medium">{template.category || "general"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Items</p>
                        <p className="font-medium">{itemsDraft.length}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick item preview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Checklist Items Preview</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setActiveTab("items")}>
                  Edit Items
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {itemsDraft.slice(0, 4).map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg border">
                      <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                      <CheckSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm flex-1">{item.question}</span>
                      {item.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                    </div>
                  ))}
                  {itemsDraft.length > 4 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      +{itemsDraft.length - 4} more items
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Submissions</span>
                  <span className="font-medium">{templateSubmissions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Completion Rate</span>
                  <span className="font-medium">{completionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg. Time</span>
                  <span className="font-medium">—</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assignment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{assignment === "all" ? "All Employees" : assignment === "department" ? "Specific Department" : "Specific Role"}</p>
                    <p className="text-sm text-muted-foreground">{recurrence} recurrence</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "items" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Checklist Items ({itemsDraft.length})</CardTitle>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <Button size="sm" variant="outline" className="gap-1" onClick={resetEdits}>
                  {t("common.cancel")}
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-3 w-3" /> {t("common.edit")}
                </Button>
              )}
              <Button size="sm" className="gap-1" onClick={openAddItemModal} disabled={!isEditing}>
                <Plus className="h-3 w-3" /> Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {itemsDraft.map((item, idx) => {
                const itemType = item.response_types?.[0] || item.type;
                return (
                <div
                  key={item.id}
                  draggable={isEditing}
                  onDragStart={(e) => {
                    setDragIndex(idx);
                    e.dataTransfer.effectAllowed = "move";
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.style.opacity = "0.4";
                    }
                  }}
                  onDragEnd={(e) => {
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.style.opacity = "1";
                    }
                    if (dragIndex !== null && dragOverIndex !== null) {
                      handleDragReorder(dragIndex, dragOverIndex);
                    }
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverIndex(idx);
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === idx) setDragOverIndex(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                  }}
                  className={`flex items-start gap-2 p-3 rounded-lg border group transition-colors ${
                    dragOverIndex === idx && dragIndex !== null && dragIndex !== idx
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  } ${isEditing ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  {/* Drag handle */}
                  <div className={`pt-0.5 shrink-0 ${isEditing ? "text-muted-foreground" : "text-muted-foreground/30"}`}>
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-muted-foreground w-6 pt-0.5 shrink-0">{idx + 1}.</span>
                  {/* Item content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{item.question}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                    {item.image_url && (
                      <div className="flex items-center gap-1 mt-1">
                        <ImageIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Reference file: {item.image_url}</span>
                      </div>
                    )}
                    {itemType === "select" && item.options && item.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.options.map((opt, oi) => (
                          <span key={oi} className="text-xs bg-muted px-1.5 py-0.5 rounded">{opt}</span>
                        ))}
                      </div>
                    )}
                    {itemType === "number" && item.unit && (
                      <span className="text-xs text-muted-foreground mt-0.5 block">Unit: {item.unit}</span>
                    )}
                  </div>
                  {/* Type Badges */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {(() => {
                      const ti = ITEM_TYPES.find((x) => x.value === itemType);
                      const TIcon = ti?.icon || ToggleLeft;
                      return (
                        <Badge variant="outline" className="text-xs gap-1 capitalize">
                          <TIcon className="h-3 w-3" />
                          {ti?.label || itemType}
                        </Badge>
                      );
                    })()}
                    {item.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                  </div>
                  {/* Edit / Delete */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={() => openEditItemModal(item)}
                      disabled={!isEditing}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={!isEditing}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                );
              })}
              {itemsDraft.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No items yet. Click &quot;Add Item&quot; to create your first checklist item.
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full gap-2" onClick={openAddItemModal} disabled={!isEditing}>
                <Plus className="h-4 w-4" /> Add New Item
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowItemModal(false)}>
          <div
            className="bg-background rounded-xl shadow-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-semibold">{editingItem ? "Edit Item" : "Add Checklist Item"}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowItemModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-5 space-y-5">
              {/* Question */}
              <div className="space-y-1.5">
                <Label htmlFor="item-question">Question / Instruction <span className="text-destructive">*</span></Label>
                <Input
                  id="item-question"
                  placeholder="e.g. Are all emergency exits clear and accessible?"
                  value={itemForm.question}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, question: e.target.value }))}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="item-description">Description / Helper text</Label>
                <Textarea
                  id="item-description"
                  placeholder="Optional guidance for the person completing this item"
                  value={itemForm.description || ""}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Response Type */}
              <div className="space-y-2">
                <Label>Response Type <span className="text-xs text-muted-foreground font-normal">(choose one)</span></Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {ITEM_TYPES.map((typeOpt) => {
                    const Icon = typeOpt.icon;
                    const isSelected = itemForm.type === typeOpt.value;
                    return (
                      <button
                        key={typeOpt.value}
                        type="button"
                        onClick={() => {
                          setItemForm((prev) => {
                            const nextType = typeOpt.value as ChecklistItem["type"];
                            return {
                              ...prev,
                              type: nextType,
                              response_types: undefined,
                              options: nextType === "select" ? (prev.options || []) : [],
                              min_value: nextType === "number" || nextType === "rating" ? prev.min_value : undefined,
                              max_value: nextType === "number" || nextType === "rating" ? prev.max_value : undefined,
                              unit: nextType === "number" ? prev.unit || "" : "",
                            };
                          });
                        }}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-colors ${
                          isSelected ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="font-medium leading-tight text-center">{typeOpt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {ITEM_TYPES.find((i) => i.value === itemForm.type)?.label || itemForm.type}
                </p>
              </div>

              {/* Number-specific: min, max, unit */}
              {(itemForm.type === "number" || itemForm.type === "rating") && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="item-min">Min Value</Label>
                    <Input
                      id="item-min"
                      type="number"
                      placeholder={itemForm.type === "rating" ? "1" : "0"}
                      value={itemForm.min_value ?? ""}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, min_value: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="item-max">Max Value</Label>
                    <Input
                      id="item-max"
                      type="number"
                      placeholder={itemForm.type === "rating" ? "5" : "100"}
                      value={itemForm.max_value ?? ""}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, max_value: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                  </div>
                  {itemForm.type === "number" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="item-unit">Unit</Label>
                      <Input
                        id="item-unit"
                        placeholder="e.g. °C, psi, mm"
                        value={itemForm.unit || ""}
                        onChange={(e) => setItemForm((prev) => ({ ...prev, unit: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Select-specific: options */}
              {itemForm.type === "select" && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  <div className="space-y-1.5">
                    {(itemForm.options || []).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5 text-right">{oi + 1}.</span>
                        <span className="text-sm flex-1">{opt}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveOption(oi)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add an option"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddOption(); } }}
                    />
                    <Button variant="outline" size="sm" onClick={handleAddOption} disabled={!newOption.trim()}>Add</Button>
                  </div>
                </div>
              )}

              {/* Reference File Upload */}
              <div className="space-y-1.5">
                <Label>Reference Image or PDF</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setItemForm((prev) => ({ ...prev, image_url: file.name }));
                    }
                  }}
                />
                {itemForm.image_url ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30">
                    <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm truncate flex-1">{itemForm.image_url}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setItemForm((prev) => ({ ...prev, image_url: "" }))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed hover:bg-muted/50 transition-colors text-sm text-muted-foreground"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload reference image or PDF</span>
                  </button>
                )}
                <p className="text-xs text-muted-foreground">Attach a reference to help inspectors understand what to check</p>
              </div>

              {/* Required toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Required</p>
                  <p className="text-xs text-muted-foreground">Field workers must complete this item to submit</p>
                </div>
                <button
                  type="button"
                  onClick={() => setItemForm((prev) => ({ ...prev, required: !prev.required }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
                    itemForm.required ? "bg-primary" : "bg-muted"
                  }`}
                  role="switch"
                  aria-checked={itemForm.required}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                      itemForm.required ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <Label htmlFor="item-order">Position</Label>
                <Input
                  id="item-order"
                  type="number"
                  min={1}
                  max={itemsDraft.length + (editingItem ? 0 : 1)}
                  value={itemForm.order}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, order: Math.max(1, parseInt(e.target.value) || 1) }))}
                />
                <p className="text-xs text-muted-foreground">Where this item appears in the checklist (1 = first)</p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-2 p-5 border-t">
              <Button variant="outline" onClick={() => setShowItemModal(false)}>Cancel</Button>
              <Button onClick={handleSaveItem} disabled={!itemForm.question.trim()} className="gap-2">
                {editingItem ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingItem ? "Save Changes" : "Add Item"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "submissions" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">{t("checklists.submittedBy")}</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Score</th>
                    <th className="pb-3 font-medium">Status</th>
                    {canApprove && <th className="pb-3 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {recentSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={canApprove ? 5 : 4} className="py-6 text-center text-muted-foreground">
                        {t("checklists.empty.noSubmissions")}
                      </td>
                    </tr>
                  ) : (
                    recentSubmissions.map((sub) => (
                      <tr
                        key={sub.id}
                        className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                        onClick={() => router.push(`/${company}/dashboard/checklists/${sub.id}`)}
                      >
                        <td className="py-3 font-medium">{sub.user}</td>
                        <td className="py-3 text-muted-foreground">{sub.date}</td>
                        <td className="py-3">{sub.score}</td>
                        <td className="py-3">
                          <Badge variant={
                            sub.status === "approved" ? "success" :
                            sub.status === "rejected" ? "destructive" :
                            sub.status === "submitted" ? "outline" : "warning"
                          }>
                            {sub.status === "approved" ? t("checklists.approved") :
                             sub.status === "rejected" ? t("checklists.rejected") :
                             sub.status === "submitted" ? t("checklists.labels.completed") :
                             sub.status}
                          </Badge>
                        </td>
                        {canApprove && (
                          <td className="py-3">
                            {sub.status === "submitted" && (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                                  onClick={() => {
                                    updateSubmission(sub.id, { status: "rejected" });
                                    toast(t("checklists.rejected"), "info");
                                  }}
                                >
                                  <XCircle className="h-3 w-3" />
                                  {t("checklists.reject")}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 text-xs text-success hover:text-success"
                                  onClick={() => {
                                    updateSubmission(sub.id, { status: "approved" });
                                    toast(t("checklists.approved"), "success");
                                  }}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  {t("checklists.approve")}
                                </Button>
                              </div>
                            )}
                            {sub.status === "approved" && (
                              <span className="text-xs text-success flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> {t("checklists.approved")}
                              </span>
                            )}
                            {sub.status === "rejected" && (
                              <span className="text-xs text-destructive flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> {t("checklists.rejected")}
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Submissions</p>
                <p className="text-2xl font-semibold">{templateSubmissions.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-semibold">{completionRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Avg. Completion Time</p>
                <p className="text-2xl font-semibold">—</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-semibold">
                  {templateSubmissions.filter((item) =>
                    new Date(item.submitted_at || item.created_at) >=
                    new Date(stableNow - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submissions Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {submissionTrend.length === 0 ? (
                <p className="text-sm text-muted-foreground">No submissions yet.</p>
              ) : (
                <div className="space-y-2">
                  {submissionTrend.map(([date, count]) => (
                    <div key={date} className="flex items-center justify-between text-sm">
                      <span>{formatDate(new Date(date))}</span>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Settings</CardTitle>
            </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Status</Label>
                  <select
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={templateStatus}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      if (nextValue !== "published" && nextValue !== "draft" && nextValue !== "archived") return;
                      updateTemplate(template.id, {
                        publish_status: nextValue,
                        is_active: nextValue === "published",
                        updated_at: new Date().toISOString(),
                      });
                      toast(
                        nextValue === "published"
                          ? "Template published to field app"
                          : nextValue === "draft"
                            ? "Template moved to draft"
                            : "Template archived",
                      );
                    }}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <Label>Assignment</Label>
                  <select
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={assignment}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      if (nextValue !== "all" && nextValue !== "department" && nextValue !== "role") return;
                      setAssignment(nextValue);
                      updateTemplate(template.id, {
                        assignment: nextValue,
                        updated_at: new Date().toISOString(),
                      });
                      toast("Assignment updated");
                    }}
                  >
                    <option value="all">All Employees</option>
                    <option value="department">Specific Department</option>
                    <option value="role">Specific Role</option>
                  </select>
                </div>
                <div>
                  <Label>Recurrence</Label>
                  <select
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={recurrence}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      if (nextValue !== "daily" && nextValue !== "weekly" && nextValue !== "monthly" && nextValue !== "once") return;
                      setRecurrence(nextValue);
                      updateTemplate(template.id, {
                        recurrence: nextValue,
                        updated_at: new Date().toISOString(),
                      });
                      toast("Recurrence updated");
                    }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="once">One-time</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Archive Template</p>
                    <p className="text-sm text-muted-foreground">Archive this template (can be restored)</p>
                  </div>
                  <Button variant="outline" onClick={handleArchiveTemplate}>Archive</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Delete Template</p>
                    <p className="text-sm text-muted-foreground">Permanently delete this template</p>
                  </div>
                  <Button variant="destructive" className="gap-2" onClick={handleDeleteTemplate}>
                    <Trash2 className="h-4 w-4" /> {t("common.delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
