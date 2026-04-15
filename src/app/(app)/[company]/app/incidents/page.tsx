"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  CheckCircle,
  Search,
  X,
  ArrowUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { capitalize, cn } from "@/lib/utils";
import { LoadingPage } from "@/components/ui/loading";
import { NoDataEmptyState, NoResultsEmptyState } from "@/components/ui/empty-state";
import { isAssignedToUserOrTeam } from "@/lib/assignment-utils";

const STATUS_CLASSES = {
  new: { variant: "info" as const, icon: Clock },
  in_progress: { variant: "in_progress" as const, icon: Clock },
  in_review: { variant: "in_review" as const, icon: Clock },
  stalled: { variant: "in_progress" as const, icon: Clock },
  resolved: { variant: "resolved" as const, icon: CheckCircle },
  closed: { variant: "resolved" as const, icon: CheckCircle },
  archived: { variant: "archived" as const, icon: CheckCircle },
};

const STATUS_TRANSLATION_KEYS: Record<string, string> = {
  new: "incidents.statuses.new",
  in_progress: "incidents.statuses.inProgress",
  in_review: "incidents.statuses.inReview",
  stalled: "incidents.statuses.stalled",
  resolved: "incidents.statuses.resolved",
  closed: "incidents.statuses.closed",
  archived: "incidents.statuses.archived",
};

export default function EmployeeIncidentsPage() {
  const params = useParams();
  const router = useRouter();
  const company = params.company as string;
  const { user } = useAuth();
  const { t, formatDate } = useTranslation();

  const { items: incidents , isLoading } = useIncidentsStore();
  const { items: locations } = useLocationsStore();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");
  const [subTab, setSubTab] = React.useState<"available" | "history">("available");

  // Show incidents reported by the worker or assigned to them / their team.
  const myIncidents = React.useMemo(() => {
    if (!user) return [];
    return incidents
      .filter((incident) => incident.reporter_id === user.id || isAssignedToUserOrTeam(incident, user))
      .sort((a, b) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime());
  }, [incidents, user]);

  // Apply search and status filters
  const filteredIncidents = React.useMemo(() => {
    let result = myIncidents;
    
    if (statusFilter !== "all") {
      result = result.filter((i) => i.status === statusFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(query) ||
          i.description?.toLowerCase().includes(query)
      );
    }
    
    result.sort((a, b) => {
      const da = new Date(a.incident_date).getTime();
      const db = new Date(b.incident_date).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
    
    return result;
  }, [myIncidents, statusFilter, searchQuery, sortOrder]);

  if (!user || isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-[60px] z-10 border-b bg-background px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold truncate">{t("app.myReports")}</h1>
          {subTab === "history" && !searchOpen && (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
          {(["available", "history"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSubTab(st)}
              className={cn(
                "flex-1 py-1.5 text-[10px] font-medium rounded-md text-center transition-all relative",
                subTab === st ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {st === "available" ? "Available" : "History"}
              {st === "history" && subTab !== "history" && myIncidents.filter(i => i.status === "new" || i.status === "in_progress").length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5">
        {/* Available Tab */}
        {subTab === "available" && (
          <Link
            href={`/${company}/app/report`}
            className="flex items-center gap-3 rounded-xl bg-card border p-4 active:bg-muted/50 transition-colors"
          >
            <AlertTriangle className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{t("incidents.reportAnIncident")}</p>
              <p className="text-xs text-muted-foreground">Tap to start a new incident report</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        )}

        {/* History Tab */}
        {subTab === "history" && (
          <div className="space-y-3">
            {/* Search — toggle */}
            {searchOpen && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your reports..."
                  className="h-8 pl-8 pr-8 text-sm"
                  autoFocus
                />
                <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Status Filter Pills + Sort */}
            <div className="flex items-center gap-2">
              {[
                { value: "all", label: t("common.all") },
                { value: "new", label: t("incidents.statuses.open") || "Open" },
                { value: "in_progress", label: t("incidents.statuses.inProgress") },
                { value: "resolved", label: t("incidents.statuses.resolved") },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                    statusFilter === filter.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSortOrder((s) => s === "newest" ? "oldest" : "newest")}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 bg-muted text-muted-foreground ml-auto"
              >
                <ArrowUpDown className="h-3 w-3" />
                {sortOrder === "newest" ? "Newest" : "Oldest"}
              </button>
            </div>

            {/* Incident list */}
            {filteredIncidents.length === 0 ? (
              myIncidents.length === 0 ? (
                <NoDataEmptyState
                  entityName="incidents"
                  onAdd={() => router.push(`/${company}/app/report`)}
                  addLabel={t("incidents.reportAnIncident")}
                />
              ) : (
                <NoResultsEmptyState
                  onClearFilters={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  hasFilters={!!searchQuery || statusFilter !== "all"}
                />
              )
            ) : (
              <div className="space-y-3">
                {filteredIncidents.map((incident) => {
                  const location = incident.location_id ? locations.find((l) => l.id === incident.location_id) : null;
                  const statusConfig = STATUS_CLASSES[incident.status] || STATUS_CLASSES.new;
                  const StatusIcon = statusConfig.icon;
                  const statusLabel = t(STATUS_TRANSLATION_KEYS[incident.status] ?? "incidents.statuses.new");

                  return (
                    <Link
                      key={incident.id}
                      href={`/${company}/app/incidents/${incident.id}`}
                      className="flex items-center gap-3.5 p-3.5 rounded-xl border bg-card transition-colors active:bg-muted/50 hover:bg-muted/30"
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                        incident.status === "new" || incident.status === "in_progress" || incident.status === "in_review"
                          ? "bg-amber-100 dark:bg-amber-500/20"
                          : "bg-green-100 dark:bg-green-500/20"
                      }`}>
                        <StatusIcon className={`h-5 w-5 ${
                          incident.status === "new" || incident.status === "in_progress" || incident.status === "in_review"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-green-600 dark:text-green-400"
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{incident.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(incident.incident_date)}
                          </span>
                          {location && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground truncate">
                                {location.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {incident.status !== "new" && (
                        <Badge className="text-[10px]" variant={statusConfig.variant}>
                          {statusLabel}
                        </Badge>
                      )}
                      
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
