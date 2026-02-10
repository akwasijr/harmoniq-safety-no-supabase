"use client";

import * as React from "react";
import Link from "next/link";
import { FileText, ChevronRight, Clock, Tag, Newspaper, Calendar, FolderOpen } from "lucide-react";
import { useContentStore } from "@/stores/content-store";
import { useCompanyParam } from "@/hooks/use-company-param";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

type TabType = "news" | "events" | "documents";

export default function EmployeeNewsPage() {
  const company = useCompanyParam();
  const { t, formatDate } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<TabType>("news");

  const { items: contentItems } = useContentStore();
  const content = contentItems.filter((c) => c.status === "published");

  // Group by type
  const news = content.filter((c) => c.type === "news");
  const events = content.filter((c) => c.type === "event");
  const documents = content.filter((c) => c.type === "document" || c.type === "training");

  const tabs = [
    { id: "news" as TabType, label: t("newsApp.tabs.news"), icon: Newspaper, count: news.length },
    { id: "events" as TabType, label: t("newsApp.tabs.events"), icon: Calendar, count: events.length },
    { id: "documents" as TabType, label: t("newsApp.tabs.documents"), icon: FolderOpen, count: documents.length },
  ];

  const getActiveContent = () => {
    switch (activeTab) {
      case "news": return news;
      case "events": return events;
      case "documents": return documents;
      default: return [];
    }
  };

  const activeContent = getActiveContent();

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="p-4 pb-0">
        <h1 className="text-xl font-semibold truncate">{t("newsApp.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("newsApp.stayInformed")}
        </p>
      </div>

      {/* Tabs */}
      <div className="sticky top-14 z-20 bg-background border-b mt-4">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors relative",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={cn(
                    "text-xs rounded-full px-1.5 py-0.5 min-w-[20px]",
                    isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
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
