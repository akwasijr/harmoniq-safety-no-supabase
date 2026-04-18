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
  Wrench,
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
import { QuickActionFAB } from "@/components/ui/quick-action-fab";

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
  const [kindFilter, setKindFilter] = React.useState<"all" | "incidents" | "fixes">("all");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");

  // Show incidents reported by the worker or assigned to them / their team.
  const myIncidents = React.useMemo(() => {
    if (!user) return [];
    return incidents
      .filter((incident) => incident.reporter_id === user.id || isAssignedToUserOrTeam(incident, user))
      .sort((a, b) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime());
  }, [incidents, user]);

  // Apply search, status, and kind filters
  const filteredIncidents = React.useMemo(() => {
    let result = myIncidents;

    if (kindFilter === "incidents") {
      result = result.filter((i) => i.type !== "maintenance_request");
    } else if (kindFilter === "fixes") {
      result = result.filter((i) => i.type === "maintenance_request");
    }

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
  }, [myIncidents, kindFilter, statusFilter, searchQuery, sortOrder]);

  if (!user || isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-[60px] z-10 border-b bg-background px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold truncate">{t("app.myReports")}</h1>
          {!searchOpen && (
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
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5">
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

          {/* Kind filter: Reports vs Fix Requests */}
          <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1">
            {[
              { value: "all" as const, label: "All" },
              { value: "incidents" as const, label: "Safety reports" },
              { value: "fixes" as const, label: "Fix requests" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setKindFilter(f.value)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95",
                  kindFilter === f.value
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

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
                  setKindFilter("all");
                }}
                hasFilters={!!searchQuery || statusFilter !== "all" || kindFilter !== "all"}
              />
            )
          ) : (
            <div className="space-y-3">
              {filteredIncidents.map((incident) => {
                const location = incident.location_id ? locations.find((l) => l.id === incident.location_id) : null;
                const statusConfig = STATUS_CLASSES[incident.status] || STATUS_CLASSES.new;
                const StatusIcon = statusConfig.icon;
                const statusLabel = t(STATUS_TRANSLATION_KEYS[incident.status] ?? "incidents.statuses.new");
                const isFix = incident.type === "maintenance_request";
                const openStatus = incident.status === "new" || incident.status === "in_progress" || incident.status === "in_review";
                const RowIcon = isFix ? Wrench : StatusIcon;

                return (
                  <Link
                    key={incident.id}
                    href={`/${company}/app/incidents/${incident.id}`}
                    className="flex items-center gap-3.5 p-3.5 rounded-xl border bg-card transition-colors active:bg-muted/50 hover:bg-muted/30"
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                      isFix
                        ? "bg-blue-100 dark:bg-blue-500/20"
                        : openStatus
                        ? "bg-amber-100 dark:bg-amber-500/20"
                        : "bg-green-100 dark:bg-green-500/20",
                    )}>
                      <RowIcon className={cn(
                        "h-5 w-5",
                        isFix
                          ? "text-blue-600 dark:text-blue-400"
                          : openStatus
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-green-600 dark:text-green-400",
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isFix && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-4 border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 shrink-0"
                          >
                            Fix
                          </Badge>
                        )}
                        <p className="font-medium text-sm truncate">{incident.title}</p>
                      </div>
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
      </div>

      <QuickActionFAB
        actions={[
          {
            id: "report",
            label: t("incidents.reportAnIncident"),
            description: "Start a new incident report",
            icon: AlertTriangle,
            href: `/${company}/app/report`,
          },
          {
            id: "request-fix",
            label: "Request a fix",
            description: "Report something that needs maintenance",
            icon: Wrench,
            href: `/${company}/app/maintenance`,
          },
        ]}
      />
    </div>
  );
}
