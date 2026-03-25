"use client";

import * as React from "react";
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  Eye,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";

interface InspectionEntry {
  id: string;
  date: string;
  result: string;
  inspector: string;
  notes: string;
}

interface InspectionHistoryProps {
  inspectionHistory: InspectionEntry[];
}

export function InspectionHistory({ inspectionHistory }: InspectionHistoryProps) {
  const { formatDate } = useTranslation();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Inspection History</CardTitle>
        <Button size="sm" className="gap-1">
          <Wrench className="h-4 w-4" />
          New Inspection
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {inspectionHistory.map((inspection) => (
            <div
              key={inspection.id}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                inspection.result === "pass"
                  ? "bg-success/10"
                  : inspection.result === "needs_attention"
                    ? "bg-warning/10"
                    : "bg-destructive/10"
              }`}>
                {inspection.result === "pass" ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : inspection.result === "needs_attention" ? (
                  <AlertTriangle className="h-4 w-4 text-warning" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {inspection.result === "pass"
                      ? "Passed"
                      : inspection.result === "needs_attention"
                        ? "Needs attention"
                        : "Failed"}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">{inspection.notes}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(inspection.date)}
                  </span>
                  <span>By {inspection.inspector}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
