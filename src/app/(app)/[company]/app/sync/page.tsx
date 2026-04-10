"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Trash2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useToast } from "@/components/ui/toast";
import { getPendingReports, dequeueReport, syncQueue, isOnline, type QueuedReport } from "@/lib/offline-queue";
import { useTranslation } from "@/i18n";
import { capitalize } from "@/lib/utils";

export default function SyncPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const { add: addIncident, items: incidents } = useIncidentsStore();
  const { toast } = useToast();
  const { formatDate } = useTranslation();

  const [queue, setQueue] = React.useState<QueuedReport[]>(() => getPendingReports());
  const [syncingIds, setSyncingIds] = React.useState<Set<string>>(new Set());
  const [syncedIds, setSyncedIds] = React.useState<Set<string>>(new Set());
  const [syncingAll, setSyncingAll] = React.useState(false);
  const online = isOnline();

  const refresh = () => setQueue(getPendingReports());

  const handleSyncOne = async (report: QueuedReport) => {
    setSyncingIds((prev) => new Set(prev).add(report.id));
    try {
      addIncident(report.incident);
      // Allow React state to update + Supabase write to start
      await new Promise((r) => setTimeout(r, 300));
      const found = incidents.some((i) => i.id === report.incident.id);
      if (!found) {
        // Force re-add if not found (edge case with stale closure)
        addIncident(report.incident);
      }
      dequeueReport(report.id);
      setSyncedIds((prev) => new Set(prev).add(report.id));
      toast("Report synced");
    } catch (err) {
      toast("Sync failed", "error");
    }
    setSyncingIds((prev) => { const next = new Set(prev); next.delete(report.id); return next; });
    setTimeout(refresh, 500);
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    for (const report of queue) {
      try {
        addIncident(report.incident);
        await new Promise((r) => setTimeout(r, 100));
        dequeueReport(report.id);
      } catch { /* continue */ }
    }
    setSyncingAll(false);
    refresh();
    const remaining = getPendingReports().length;
    const synced = queue.length - remaining;
    if (synced > 0) toast(`${synced} report${synced > 1 ? "s" : ""} synced`);
    if (remaining > 0) toast(`${remaining} failed`, "error");
  };

  const handleRemove = (id: string) => {
    dequeueReport(id);
    refresh();
    toast("Removed from queue");
  };

  return (
    <div className="flex flex-col min-h-full pb-20">
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${company}/app`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-base font-semibold">Pending sync</h1>
            <p className="text-xs text-muted-foreground">{queue.length} item{queue.length !== 1 ? "s" : ""} waiting</p>
          </div>
          {queue.length > 0 && (
            <Button
              size="sm"
              disabled={!online || syncingAll}
              onClick={handleSyncAll}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncingAll ? "animate-spin" : ""}`} />
              Sync all
            </Button>
          )}
        </div>
      </div>

      {!online && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-muted-foreground">No internet connection. Reports will sync when you&apos;re back online.</p>
        </div>
      )}

      <div className="flex-1 px-4 pt-4 space-y-2">
        {queue.length === 0 ? (
          <div className="text-center py-16">
            <Check className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">All caught up — nothing to sync</p>
          </div>
        ) : (
          queue.map((report) => {
            const isSyncing = syncingIds.has(report.id);
            const isSynced = syncedIds.has(report.id);
            return (
              <Card key={report.id} className={isSynced ? "opacity-50" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      {isSynced ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : isSyncing ? (
                        <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{report.incident.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{capitalize(report.incident.type.replace(/_/g, " "))}</Badge>
                        <Badge variant={report.incident.severity as "low" | "medium" | "high" | "critical"} className="text-[10px]">{report.incident.severity}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Queued {formatDate(report.queuedAt)}
                        {report.retries > 0 && ` · ${report.retries} retries`}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!isSynced && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={!online || isSyncing}
                            onClick={() => handleSyncOne(report)}
                            title="Sync now"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRemove(report.id)}
                            title="Remove"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
