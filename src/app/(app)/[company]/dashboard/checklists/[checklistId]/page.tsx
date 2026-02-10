"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  GripVertical,
  CheckSquare,
  Info,
  ListChecks,
  BarChart3,
  Settings,
  Copy,
  Eye,
  FileText,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailTabs, Tab } from "@/components/ui/detail-tabs";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useUsersStore } from "@/stores/users-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useToast } from "@/components/ui/toast";
import type { ChecklistItem } from "@/types";
import { useTranslation } from "@/i18n";

const tabs: Tab[] = [
  { id: "details", label: "Details", icon: Info },
  { id: "items", label: "Checklist Items", icon: ListChecks },
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
  const [activeTab, setActiveTab] = React.useState("details");
  const [isEditing, setIsEditing] = React.useState(false);

  const { toast } = useToast();
  const { t, formatDate } = useTranslation();
  const { items: templates, add: addTemplate, update: updateTemplate, remove: removeTemplate } = useChecklistTemplatesStore();
  const { items: submissions } = useChecklistSubmissionsStore();
  const { items: users } = useUsersStore();
  const { items: locations } = useLocationsStore();

  const submission = submissions.find((item) => item.id === checklistId);
  const isSubmission = Boolean(submission);
  const template = isSubmission
    ? templates.find((item) => item.id === submission?.template_id)
    : templates.find((item) => item.id === checklistId);

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

  React.useEffect(() => {
    if (!checklistId) return;
    setActiveTab(isSubmission ? "overview" : "details");
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
      status: item.status === "submitted" ? "complete" : "incomplete",
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
    toast("Checklist template updated");
    setIsEditing(false);
  };

  const handleDuplicateTemplate = () => {
    if (!template) return;
    const now = new Date().toISOString();
    const duplicateId = `ct_${Date.now()}`;
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
    updateTemplate(template.id, { is_active: false, updated_at: new Date().toISOString() });
    toast("Template archived");
  };

  const handleDeleteTemplate = () => {
    if (!template) return;
    removeTemplate(template.id);
    toast("Template deleted");
    router.push(`/${company}/dashboard/checklists`);
  };

  const handleAddItem = () => {
    setItemsDraft((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}`,
        question: `Checklist item ${prev.length + 1}`,
        type: "yes_no_na",
        required: false,
        order: prev.length + 1,
      },
    ]);
  };

  const handleRemoveItem = (itemId: string) => {
    setItemsDraft((prev) => prev.filter((item) => item.id !== itemId));
  };

  // If it's a submission, render submission view
  if (isSubmission) {
    if (!submission) {
      return (
        <div className="flex items-center justify-center h-64 flex-col gap-4">
          <p className="text-muted-foreground">Submission not found: {checklistId}</p>
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
                <span className="text-sm text-muted-foreground">
                  {statusLabel.replace("_", " ")}
                </span>
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
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Copy className="h-4 w-4 mr-2" />
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
  if (!template) {
    return (
      <div className="flex items-center justify-center h-64 flex-col gap-4">
        <p className="text-muted-foreground">Template not found: {checklistId}</p>
        <Button variant="outline" onClick={() => router.push(`/${company}/dashboard/checklists`)}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

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
                <h1 className="text-2xl font-semibold">{template.name}</h1>
                <span className="text-sm text-muted-foreground">
                  {template.is_active ? "active" : "inactive"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {template.items.length} {t("checklists.labels.items")} • {templateSubmissions.length} submissions • Last updated {formatDate(new Date(template.updated_at))}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
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
            {isEditing ? (
              <>
                <Button variant="outline" onClick={resetEdits}>{t("common.cancel")}</Button>
                <Button className="gap-2" onClick={handleSaveTemplate}><Save className="h-4 w-4" /> {t("common.save")}</Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>{t("common.edit")}</Button>
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
            <CardTitle className="text-base">Checklist Items</CardTitle>
            <Button size="sm" className="gap-1" onClick={handleAddItem} disabled={!isEditing}>
              <Plus className="h-3 w-3" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {itemsDraft.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 group">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                  <div className="flex-1">
                    <Input
                      value={item.question}
                      onChange={(event) =>
                        setItemsDraft((prev) =>
                          prev.map((current) =>
                            current.id === item.id ? { ...current, question: event.target.value } : current
                          )
                        )
                      }
                      disabled={!isEditing}
                      className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                    />
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                  {item.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={!isEditing}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full gap-2" onClick={handleAddItem} disabled={!isEditing}>
                <Plus className="h-4 w-4" /> Add New Item
              </Button>
            </div>
          </CardContent>
        </Card>
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
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Score</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
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
                          <Badge variant={sub.status === "complete" ? "success" : "warning"}>
                            {sub.status}
                          </Badge>
                        </td>
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
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
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
                    value={template.is_active ? "active" : "inactive"}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      updateTemplate(template.id, {
                        is_active: nextValue === "active",
                        updated_at: new Date().toISOString(),
                      });
                      toast(nextValue === "active" ? "Template activated" : "Template status updated");
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
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
  );
}
