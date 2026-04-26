"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FileText, ChevronRight, Clock, Tag, Newspaper, Calendar, FolderOpen, GraduationCap, Search, X, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFieldAppSettings } from "@/components/providers/field-app-settings-provider";
import { useContentStore } from "@/stores/content-store";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { LoadingPage } from "@/components/ui/loading";

type TabType = "news" | "events" | "documents" | "training";

export default function EmployeeNewsPage() {
  const company = useCompanyParam();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { settings } = useFieldAppSettings();
  const { t, formatDate } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<TabType>(() => {
    const p = searchParams.get("tab");
    if (p === "news" || p === "events" || p === "documents" || p === "training") return p;
    return "news";
  });
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");

  // Sync ?tab= so back-navigation from a deep page restores the tab.
  React.useEffect(() => {
    const current = searchParams.get("tab");
    if (current === activeTab) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", activeTab);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const { items: contentItems , isLoading } = useContentStore();

  React.useEffect(() => {
    if (!settings.newsEnabled) {
      router.replace(`/${company}/app`);
    }
  }, [company, router, settings.newsEnabled]);

  if (!user) {
    return <LoadingPage />;
  }

  if (!settings.newsEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Newspaper className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        </div>
        <h3 className="mt-4 font-semibold">{t("newsApp.disabled") || "News is not enabled"}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("newsApp.disabledDesc") || "Your administrator has not enabled the news feature for this company."}
        </p>
      </div>
    );
  }
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
    { id: "training" as TabType, label: t("newsApp.tabs.training") || "Training", icon: GraduationCap, count: training.length },
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

  const activeContent = getActiveContent()
    .filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.published_at || a.created_at).getTime();
      const dateB = new Date(b.published_at || b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  if (isLoading && contentItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header + Tabs */}
      <div className="sticky top-[60px] z-10 bg-background border-b px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold mb-3">{t("newsApp.title")}</h1>

        {/* Sub-tabs, pill style matching Safety Tasks & Assets */}
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
                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-md transition-all active:opacity-80",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-3 pb-20 space-y-3">
        {searchOpen && (
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="h-8 pl-8 pr-8 text-sm" autoFocus />
            <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 mb-3">
          {!searchOpen && (
            <button type="button" onClick={() => setSearchOpen(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Search">
              <Search className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={() => setSortOrder(s => s === "newest" ? "oldest" : "newest")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 bg-muted text-muted-foreground ml-auto">
            <ArrowUpDown className="h-3 w-3" />
            {sortOrder === "newest" ? "Newest" : "Oldest"}
          </button>
        </div>
        {activeContent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
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
              className="field-app-surface flex gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50 active:bg-muted/70 bg-card"
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
