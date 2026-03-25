"use client";

import * as React from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Plus,
  Power,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";

interface DowntimeLog {
  id: string;
  asset_id: string;
  start_date: string;
  end_date: string | null;
  reason: string;
  category: string;
  production_impact: string;
  duration_hours: number | null;
  reported_by_user_id: string;
  resolved_by_user_id: string | null;
  notes: string | null;
}

interface DowntimeTabProps {
  downtimeLogs: DowntimeLog[];
  totalDowntimeHours: number;
  downtimeCount: number;
  activeDowntime: DowntimeLog | undefined;
  users: Array<{ id: string; first_name: string; last_name: string }>;
  onLogDowntime: () => void;
}

export function DowntimeTab({
  downtimeLogs,
  totalDowntimeHours,
  downtimeCount,
  activeDowntime,
  users,
  onLogDowntime,
}: DowntimeTabProps) {
  const { t, formatDate } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Downtime Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Downtime Events</p>
                <p className="text-3xl font-semibold">{downtimeCount}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hours Down</p>
                <p className="text-3xl font-semibold">{totalDowntimeHours.toFixed(1)}h</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className={activeDowntime ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <p className={`text-xl font-semibold ${activeDowntime ? "text-destructive" : "text-success"}`}>
                  {activeDowntime ? "Currently Down" : "Operational"}
                </p>
              </div>
              <Power className={`h-8 w-8 ${activeDowntime ? "text-destructive" : "text-success"}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Downtime Alert */}
      {activeDowntime && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-destructive">Asset Currently Down</h4>
                <p className="text-sm mt-1">{activeDowntime.reason}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Started: {formatDate(activeDowntime.start_date)}
                </p>
              </div>
              <Button size="sm" variant="outline">
                <CheckCircle className="h-4 w-4 mr-1" />
                Resolve
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Downtime History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("assets.sections.downtimeHistory")}</CardTitle>
          <Button size="sm" className="gap-1" onClick={onLogDowntime}>
            <Plus className="h-4 w-4" />
            {t("assets.buttons.logDowntime")}
          </Button>
        </CardHeader>
        <CardContent>
          {downtimeLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t("assets.empty.noDowntime")}</p>
              <p className="text-sm">This is great! Keep it up.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {downtimeLogs.map((log) => {
                const reporter = users.find(u => u.id === log.reported_by_user_id);
                const isOngoing = log.end_date === null;

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-lg border"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{log.reason}</h4>
                          <span className="text-sm text-muted-foreground capitalize">{log.category}</span>
                          <span className="text-sm text-muted-foreground">• {log.production_impact} impact</span>
                          {isOngoing && <span className="text-sm text-destructive">Ongoing</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(log.start_date)}
                          </span>
                          {log.duration_hours !== null && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {log.duration_hours.toFixed(1)} hours
                            </span>
                          )}
                          <span>Reported by: {reporter ? `${reporter.first_name} ${reporter.last_name}` : "Unknown"}</span>
                        </div>
                        {log.notes && (
                          <p className="text-sm mt-2 text-muted-foreground">{log.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
