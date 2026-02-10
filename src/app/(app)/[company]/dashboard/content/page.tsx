"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  Plus,
  FileText,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  GraduationCap,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { commonFilterOptions } from "@/components/ui/filter-panel";
import { RoleGuard } from "@/components/auth/role-guard";
import { useContentStore } from "@/stores/content-store";
import { cn } from "@/lib/utils";
import { isWithinDateRange, DateRangeValue } from "@/lib/date-utils";
import { useTranslation } from "@/i18n";

const ITEMS_PER_PAGE = 10;

type ContentTabType = "news" | "documents" | "training" | "events";

const contentTabs = [
  { value: "news" as ContentTabType, label: "News", icon: Newspaper, type: "news" },
  { value: "documents" as ContentTabType, label: "Documents", icon: FileText, type: "document" },
  { value: "training" as ContentTabType, label: "Training", icon: GraduationCap, type: "training" },
  { value: "events" as ContentTabType, label: "Events", icon: CalendarDays, type: "event" },
];

export default function ContentPage() {
  const { t, formatDate } = useTranslation();
  const router = useRouter();
  const company = useCompanyParam();
  const [activeTab, setActiveTab] = React.useState<ContentTabType>("news");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState("all_time");

  // Filters
  const [statusFilter, setStatusFilter] = React.useState("");

  const { items: content } = useContentStore();

  // Get current tab's content type
  const currentTabConfig = contentTabs.find(t => t.value === activeTab);
  const currentType = currentTabConfig?.type || "news";

  // Filter content by tab type first, then by other filters
  const filteredContent = content.filter((item) => {
    const matchesType = item.type === currentType;
    const matchesSearch = searchQuery === "" || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.content?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "" || item.status === statusFilter;
    const matchesDate = isWithinDateRange(item.created_at, dateRange as DateRangeValue);
    return matchesType && matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredContent.length / ITEMS_PER_PAGE);
  const paginatedContent = filteredContent.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const filters = [
    {
      id: "status",
      label: "All statuses",
      options: commonFilterOptions.contentStatus,
      value: statusFilter,
      onChange: (v: string) => { setStatusFilter(v); setCurrentPage(1); },
    },
  ];

  // Reset page when switching tabs
  React.useEffect(() => {
    setCurrentPage(1);
    setSearchQuery("");
    setStatusFilter("");
  }, [activeTab]);

  // Get icon for content type
  const getContentIcon = () => {
    const Icon = currentTabConfig?.icon || FileText;
    return <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
  };

  return (
    <RoleGuard allowedRoles={["super_admin", "company_admin", "manager"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">{t("content.title")}</h1>
        <Link href={`/${company}/dashboard/content/new?type=${currentType}`}>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create {currentTabConfig?.label.toLowerCase().replace(/s$/, "") || "content"}
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {contentTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap",
                  activeTab === tab.value 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{tab.label}</span>
                {activeTab === tab.value && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and filters */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
        searchPlaceholder={`Search ${currentTabConfig?.label.toLowerCase() || "content"}...`}
        filters={filters}
        dateRange={dateRange}
        onDateRangeChange={(value) => { setDateRange(value); setCurrentPage(1); }}
        showDateRange={true}
      />

      {/* Content table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{filteredContent.length} {currentTabConfig?.label.toLowerCase() || "item"}{filteredContent.length !== 1 ? "s" : ""}</CardTitle>
            <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages || 1}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Title</th>
                  <th className="hidden pb-3 font-medium md:table-cell">Category</th>
                  <th className="hidden pb-3 font-medium lg:table-cell">Published</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedContent.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">No {currentTabConfig?.label.toLowerCase() || "content"} found</td>
                  </tr>
                ) : (
                  paginatedContent.map((item) => (
                    <tr 
                      key={item.id} 
                      onClick={() => router.push(`/${company}/dashboard/content/${item.id}`)}
                      className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                            {getContentIcon()}
                          </div>
                          <div className="max-w-[200px]">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.category || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden py-3 capitalize md:table-cell text-xs text-muted-foreground">
                        {item.category || "—"}
                      </td>
                      <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">
                        {item.published_at ? formatDate(item.published_at) : t("content.statuses.draft")}
                      </td>
                      <td className="py-3">
                        <Badge variant={item.status === "published" ? "success" : "secondary"} className="text-xs">
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredContent.length)} of {filteredContent.length}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
                  <Button key={i + 1} variant={currentPage === i + 1 ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(i + 1)}>
                    {i + 1}
                  </Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </RoleGuard>
  );
}
