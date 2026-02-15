"use client";

import * as React from "react";
import Link from "next/link";
import { FileText, ChevronRight, Clock, Tag, Newspaper, Calendar, FolderOpen, GraduationCap } from "lucide-react";
import { useContentStore } from "@/stores/content-store";
import { useCompanyParam } from "@/hooks/use-company-param";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

type TabType = "news" | "events" | "documents" | "training";

export default function EmployeeNewsPage() {
  const company = useCompanyParam();
  const { t, formatDate } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<TabType>("news");

  const { items: contentItems , isLoading } = useContentStore();
  const content = contentItems.filter((c) => c.status === "published");

  // Group by type
  const news = content.filter((c) => c.type === "news");
  const events = content.filter((c) => c.type === "event");
  const documents = content.filter((c) => c.type === "document");
  const training = content.filter((c) => c.type === "training");

  const tabs = [
    { id: "news" as TabType, label: t("newsApp.tabs.news"), icon: Newspaper, count: news.length },
    { id: "events" as TabType, label: t("newsApp.tabs.events"), icon: Calendar, count: events.length },
    { id: "documents" as TabType, label: t("newsApp.tabs.documents"), icon: FolderOpen, count: documents.length },
    { id: "training" as TabType, label: "Training", icon: GraduationCap, count: training.length },
  ];

  const getActiveContent = () => {
    switch (activeTab) {
      case "news": return news;
      case "events": return events;
      case "documents": return documents;
      case "training": return training;
      default: return [];
    }
  };

  const activeContent = getActiveContent();

  return (
    <div className="flex flex-col min-h-full">
      {/* Header + Tabs */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold mb-3">{t("newsApp.title")}</h1>

        {/* Sub-tabs — pill style matching Safety Tasks & Assets */}
        <div className="flex gap-1 bg-muted rounded-lg p-1" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-md transition-all",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{tab.label}</span>
                {tab.count > 0 && (
                  <span className="ml-1 bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-3">
        {activeContent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-semibold">{t("newsApp.noContentYet", { tab: activeTab })}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("newsApp.empty.checkBackLater")}
            </p>
          </div>
        ) : (
          activeContent.map((item) => (
            <Link
              key={item.id}
              href={`/${company}/app/news/${item.id}`}
              className="flex gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50 bg-card"
            >
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg shrink-0",
                activeTab === "events" ? "bg-primary/10" : "bg-muted"
              )}>
                {activeTab === "news" && <Newspaper className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
                {activeTab === "events" && <Calendar className="h-6 w-6 text-primary" aria-hidden="true" />}
                {activeTab === "documents" && <FolderOpen className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
                {activeTab === "training" && <GraduationCap className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium line-clamp-2">{item.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {formatDate(new Date(item.published_at || item.created_at))}
                  </span>
                  {item.category && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" aria-hidden="true" />
                      {item.category}
                    </span>
                  )}
                  {activeTab === "documents" && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {item.type}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground self-center" aria-hidden="true" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
