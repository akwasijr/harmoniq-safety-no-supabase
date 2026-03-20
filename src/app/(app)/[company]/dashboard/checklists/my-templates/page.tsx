"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  ClipboardCheck,
  Plus,
  Library,
  Search,
  MoreHorizontal,
  Pencil,
  Send,
  Archive,
  RotateCcw,
  Trash2,
  Copy,
  Eye,
  CheckCircle,
  FileText,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import type { ChecklistTemplate } from "@/types";

type StatusFilter = "all" | "draft" | "published" | "archived";

function MyTemplatesContent() {
  const router = useRouter();
  const company = useCompanyParam();
  const { t } = useTranslation();
  const { items: templates, update: updateItem, remove: removeItem } = useChecklistTemplatesStore();
  const { items: submissions } = useChecklistSubmissionsStore();

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);

  // Only show company templates (not the raw industry templates)
  const companyTemplates = templates.filter((t) => t.company_id);

  const filteredTemplates = companyTemplates.filter((t) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "draft" && (t.publish_status === "draft" || (!t.publish_status && !t.is_active))) ||
      (statusFilter === "published" && (t.publish_status === "published" || (!t.publish_status && t.is_active))) ||
      (statusFilter === "archived" && t.publish_status === "archived");

    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: companyTemplates.length,
    draft: companyTemplates.filter((t) => t.publish_status === "draft" || (!t.publish_status && !t.is_active)).length,
    published: companyTemplates.filter((t) => t.publish_status === "published" || (!t.publish_status && t.is_active)).length,
    archived: companyTemplates.filter((t) => t.publish_status === "archived").length,
  };

  const getSubmissionCount = (templateId: string) =>
    submissions.filter((s) => s.template_id === templateId).length;

  const getStatusBadge = (template: ChecklistTemplate) => {
    const status = template.publish_status || (template.is_active ? "published" : "draft");
    switch (status) {
      case "published":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
            <CheckCircle className="h-3 w-3" />Active
          </span>
        );
      case "draft":
        return <Badge variant="secondary" className="text-xs gap-1"><FileText className="h-3 w-3" />Draft</Badge>;
      case "archived":
        return <Badge variant="outline" className="text-xs gap-1 text-muted-foreground"><Archive className="h-3 w-3" />Archived</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Unknown</Badge>;
    }
  };

  const handlePublish = (template: ChecklistTemplate) => {
    updateItem(template.id, { publish_status: "published", is_active: true, updated_at: new Date().toISOString() });
  };

  const handleUnpublish = (template: ChecklistTemplate) => {
    updateItem(template.id, { publish_status: "draft", updated_at: new Date().toISOString() });
  };

  const handleArchive = (template: ChecklistTemplate) => {
    updateItem(template.id, { publish_status: "archived", is_active: false, updated_at: new Date().toISOString() });
  };

  const handleRestore = (template: ChecklistTemplate) => {
    updateItem(template.id, { publish_status: "draft", updated_at: new Date().toISOString() });
  };

  const handleDuplicate = (template: ChecklistTemplate) => {
    const copy: ChecklistTemplate = {
      ...template,
      id: crypto.randomUUID(),
      name: `${template.name} (Copy)`,
      publish_status: "draft",
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Add via store — we need addItem but the store pattern uses items directly
    // For now, navigate to create
    router.push(`/${company}/dashboard/checklists/${template.id}`);
    setMenuOpenId(null);
  };

  const handleDelete = (template: ChecklistTemplate) => {
    if (confirm(`Delete "${template.name}" permanently? This cannot be undone.`)) {
      removeItem(template.id);
    }
    setMenuOpenId(null);
  };

  const handleBulkPublish = () => {
    selectedIds.forEach((id) => {
      const t = templates.find((x) => x.id === id);
      if (t && t.publish_status !== "published") {
        updateItem(id, { publish_status: "published", is_active: true, updated_at: new Date().toISOString() });
      }
    });
    setSelectedIds(new Set());
  };

  const handleBulkArchive = () => {
    selectedIds.forEach((id) => {
      updateItem(id, { publish_status: "archived", is_active: false, updated_at: new Date().toISOString() });
    });
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTemplates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTemplates.map((t) => t.id)));
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: "all", label: `All (${statusCounts.all})` },
    { id: "draft", label: `Drafts (${statusCounts.draft})` },
    { id: "published", label: `Live (${statusCounts.published})` },
    { id: "archived", label: `Archived (${statusCounts.archived})` },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title + Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Task Templates</h1>
        <Link href={`/${company}/dashboard/checklists/new`}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </Link>
      </div>

      {/* Top-level Tabs: My Templates / Template Library */}
      <div className="border-b">
        <div className="flex gap-4">
          <button
            className={cn(
              "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap",
              "text-primary"
            )}
          >
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            My Templates
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          </button>
          <Link
            href={`/${company}/dashboard/checklists/templates`}
            className="flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap text-muted-foreground hover:text-foreground"
          >
            <Library className="h-4 w-4 shrink-0" />
            Template Library
          </Link>
        </div>
      </div>

      {/* Status Sub-tabs */}
      <div className="flex items-center gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setStatusFilter(tab.id); setSelectedIds(new Set()); }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Bulk Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleBulkPublish}>
              <Send className="h-3.5 w-3.5" />Push Selected
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleBulkArchive}>
              <Archive className="h-3.5 w-3.5" />Archive Selected
            </Button>
          </div>
        )}
      </div>

      {/* Template List */}
      <Card>
        <CardContent className="p-0">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardCheck className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">No templates found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {statusFilter !== "all"
                  ? `No ${statusFilter} templates. Try a different filter.`
                  : "Browse the Template Library to get started."}
              </p>
              <Link href={`/${company}/dashboard/checklists/templates`}>
                <Button variant="outline" size="sm" className="mt-4 gap-2">
                  <Library className="h-3.5 w-3.5" />Browse Template Library
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pl-4 pt-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredTemplates.length && filteredTemplates.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-border"
                      />
                    </th>
                    <th className="pb-3 pt-3 font-medium">Template</th>
                    <th className="pb-3 pt-3 font-medium">Items</th>
                    <th className="hidden pb-3 pt-3 font-medium md:table-cell">Category</th>
                    <th className="hidden pb-3 pt-3 font-medium lg:table-cell">Used</th>
                    <th className="pb-3 pt-3 font-medium">Status</th>
                    <th className="hidden pb-3 pt-3 font-medium lg:table-cell">Updated</th>
                    <th className="pb-3 pt-3 pr-4 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((template) => {
                    const subCount = getSubmissionCount(template.id);
                    const status = template.publish_status || (template.is_active ? "published" : "draft");
                    const category = (template as unknown as Record<string, unknown>).category as string || "general";

                    return (
                      <tr
                        key={template.id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors group"
                      >
                        <td className="py-3 pl-4 w-8">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(template.id)}
                            onChange={() => toggleSelect(template.id)}
                            className="rounded border-border"
                          />
                        </td>
                        <td
                          className="py-3 cursor-pointer"
                          onClick={() => router.push(`/${company}/dashboard/checklists/${template.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate group-hover:text-primary transition-colors">{template.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                                {template.description || "No description"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-xs">{template.items?.length || 0} items</td>
                        <td className="hidden py-3 md:table-cell">
                          <Badge variant="outline" className="text-xs capitalize">{category.replace(/_/g, " ")}</Badge>
                        </td>
                        <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">{subCount} times</td>
                        <td className="py-3">
                          {getStatusBadge(template)}
                        </td>
                        <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">
                          {formatDate(template.updated_at)}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === template.id ? null : template.id); }}
                              className="p-1 rounded hover:bg-muted"
                            >
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </button>
                            {menuOpenId === template.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                                <div className="absolute right-0 top-8 z-50 w-48 rounded-md border bg-popover p-1 shadow-md">
                                  <button
                                    className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm hover:bg-accent"
                                    onClick={() => { router.push(`/${company}/dashboard/checklists/${template.id}`); setMenuOpenId(null); }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />Edit
                                  </button>
                                  {status !== "published" && (
                                    <button
                                      className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm hover:bg-accent"
                                      onClick={() => { handlePublish(template); setMenuOpenId(null); }}
                                    >
                                      <Send className="h-3.5 w-3.5" />Push to field app
                                    </button>
                                  )}
                                  {status === "published" && (
                                    <button
                                      className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm hover:bg-accent"
                                      onClick={() => { handleUnpublish(template); setMenuOpenId(null); }}
                                    >
                                      <Eye className="h-3.5 w-3.5" />Unpublish
                                    </button>
                                  )}
                                  <button
                                    className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm hover:bg-accent"
                                    onClick={() => { handleDuplicate(template); }}
                                  >
                                    <Copy className="h-3.5 w-3.5" />Duplicate
                                  </button>
                                  {status !== "archived" ? (
                                    <button
                                      className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm hover:bg-accent"
                                      onClick={() => { handleArchive(template); setMenuOpenId(null); }}
                                    >
                                      <Archive className="h-3.5 w-3.5" />Archive
                                    </button>
                                  ) : (
                                    <button
                                      className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm hover:bg-accent"
                                      onClick={() => { handleRestore(template); setMenuOpenId(null); }}
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" />Restore
                                    </button>
                                  )}
                                  <div className="my-1 border-t" />
                                  <button
                                    className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete(template)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />Delete permanently
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MyTemplatesPage() {
  return (
    <RoleGuard requiredPermission="checklists.view">
      <MyTemplatesContent />
    </RoleGuard>
  );
}
