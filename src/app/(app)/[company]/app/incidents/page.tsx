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
  Filter,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { capitalize } from "@/lib/utils";
import { LoadingPage } from "@/components/ui/loading";
import { NoDataEmptyState, NoResultsEmptyState } from "@/components/ui/empty-state";
import { isAssignedToUserOrTeam } from "@/lib/assignment-utils";

const STATUS_CLASSES = {
  new: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Clock },
  in_progress: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  in_review: { color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", icon: Clock },
  resolved: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
  archived: { color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200", icon: CheckCircle },
};

const STATUS_TRANSLATION_KEYS: Record<string, string> = {
  new: "incidents.statuses.new",
  in_progress: "incidents.statuses.inProgress",
  in_review: "incidents.statuses.inReview",
  resolved: "incidents.statuses.resolved",
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
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

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
    
    return result;
  }, [myIncidents, statusFilter, searchQuery]);

  if (!user || isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-[60px] z-10 border-b bg-background/95 backdrop-blur px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{t("app.myReports")}</h1>
          <Link href={`/${company}/app/report`}>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              {t("incidents.report")}
            </Button>
          </Link>
        </div>
        
        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search your reports..."
            className="pl-10 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
          {[
            { value: "all", label: t("common.all") },
            { value: "new", label: t("incidents.statuses.new") },
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
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5">
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
                      ? "bg-amber-100"
                      : "bg-green-100"
                  }`}>
                    <StatusIcon className={`h-5 w-5 ${
                      incident.status === "new" || incident.status === "in_progress" || incident.status === "in_review"
                        ? "text-amber-600"
                        : "text-green-600"
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

                  <Badge className={`text-[10px] ${statusConfig.color}`} variant="secondary">
                    {statusLabel}
                  </Badge>
                  
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
