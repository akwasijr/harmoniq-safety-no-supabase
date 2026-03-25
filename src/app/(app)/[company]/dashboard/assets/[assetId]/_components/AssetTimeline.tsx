"use client";

import * as React from "react";
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Wrench,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { capitalize } from "@/lib/utils";

type TimelineEvent = {
  date: string;
  type: string;
  icon: typeof CheckCircle;
  color: string;
  title: string;
  description: string;
};

interface AssetTimelineProps {
  assetInspections: Array<{ inspected_at: string; result: string; notes: string | null }>;
  maintenanceLogs: Array<{ id: string; completed_date: string; description: string; notes: string | null }>;
  downtimeLogs: Array<{ id: string; start_date: string; end_date: string | null; reason: string; duration_hours: number | null }>;
  assetIncidents: Array<{ id: string; incident_date: string; title: string; severity: string; reference_number: string }>;
  timelineFilter: string;
  setTimelineFilter: (v: string) => void;
}

export function AssetTimeline({
  assetInspections,
  maintenanceLogs,
  downtimeLogs,
  assetIncidents,
  timelineFilter,
  setTimelineFilter,
}: AssetTimelineProps) {
  const { formatDate } = useTranslation();

  const events: TimelineEvent[] = [];

  assetInspections.forEach((insp) => {
    events.push({
      date: insp.inspected_at,
      type: "inspections",
      icon: insp.result === "pass" ? CheckCircle : AlertTriangle,
      color: insp.result === "pass" ? "text-success" : "text-destructive",
      title: insp.result === "pass" ? "Inspection Passed" : "Inspection Failed",
      description: insp.notes || "No notes",
    });
  });

  maintenanceLogs.forEach((log) => {
    events.push({
      date: log.completed_date,
      type: "maintenance",
      icon: Wrench,
      color: "text-blue-500",
      title: "Maintenance Completed",
      description: log.description || log.notes || "Maintenance work",
    });
  });

  downtimeLogs.forEach((log) => {
    if (log.end_date === null) {
      events.push({
        date: log.start_date,
        type: "downtime",
        icon: Power,
        color: "text-destructive",
        title: "Downtime Started",
        description: log.reason,
      });
    } else {
      events.push({
        date: log.end_date,
        type: "downtime",
        icon: Power,
        color: "text-success",
        title: `Downtime Resolved - ${log.duration_hours?.toFixed(1) || "?"}h`,
        description: log.reason,
      });
    }
  });

  assetIncidents.forEach((inc) => {
    events.push({
      date: inc.incident_date,
      type: "incidents",
      icon: AlertTriangle,
      color: "text-warning",
      title: inc.title,
      description: `${capitalize(inc.severity)} severity • ${inc.reference_number}`,
    });
  });

  const filtered = timelineFilter === "all" ? events : events.filter((e) => e.type === timelineFilter);
  const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const grouped: Record<string, TimelineEvent[]> = {};
  sorted.forEach((ev) => {
    const day = formatDate(ev.date, { year: "numeric", month: "long", day: "numeric" });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(ev);
  });

  const filters = [
    { id: "all", label: "All" },
    { id: "inspections", label: "Inspections" },
    { id: "maintenance", label: "Maintenance" },
    { id: "downtime", label: "Downtime" },
    { id: "incidents", label: "Incidents" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={timelineFilter === f.id ? "default" : "outline"}
            onClick={() => setTimelineFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No activity recorded</p>
              <p className="text-sm">Events will appear here as they occur</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {Object.entries(grouped).map(([day, dayEvents]) => (
              <div key={day} className="mb-6 last:mb-0">
                <p className="text-sm font-medium text-muted-foreground mb-3">{day}</p>
                <div className="relative ml-3 border-l-2 border-border pl-6 space-y-4">
                  {dayEvents.map((ev, idx) => {
                    const Icon = ev.icon;
                    return (
                      <div key={idx} className="relative">
                        <div className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-background border-2 border-current ${ev.color}`}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{ev.title}</p>
                          <p className="text-xs text-muted-foreground">{ev.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(ev.date, { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
