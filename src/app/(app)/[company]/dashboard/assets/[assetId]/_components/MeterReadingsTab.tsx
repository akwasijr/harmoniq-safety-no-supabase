"use client";

import * as React from "react";
import { BarChart3, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { useToast } from "@/components/ui/toast";
import type { MeterUnit } from "@/types";

interface MeterReading {
  id: string;
  asset_id: string;
  meter_type: string;
  unit: MeterUnit;
  value: number;
  recorded_by: string;
  recorded_at: string;
  notes: string | null;
  created_at: string;
}

interface MeterReadingsTabProps {
  assetId: string;
  assetMeterReadings: MeterReading[];
  addMeterReading: (reading: MeterReading) => void;
  users: Array<{ id: string; first_name: string; last_name: string }>;
  currentUserId: string;
}

export function MeterReadingsTab({
  assetId,
  assetMeterReadings,
  addMeterReading,
  users,
  currentUserId,
}: MeterReadingsTabProps) {
  const { t, formatDate } = useTranslation();
  const { toast } = useToast();
  const [showAddReading, setShowAddReading] = React.useState(false);
  const [readingForm, setReadingForm] = React.useState({ meter_type: "", unit: "hours" as MeterUnit, value: "", notes: "" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">Meter Readings</h3>
        <Button size="sm" className="gap-1" onClick={() => setShowAddReading(true)}>
          <Plus className="h-4 w-4" />
          {t("assets.buttons.recordReading")}
        </Button>
      </div>

      {assetMeterReadings.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t("assets.empty.noReadings")}</p>
            <p className="text-sm">Track hours, miles, cycles, and other metrics for condition-based maintenance</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {[...assetMeterReadings].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()).map((reading) => {
                const recorder = users.find(u => u.id === reading.recorded_by);
                return (
                  <div key={reading.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{reading.meter_type}</p>
                        <span className="text-sm text-muted-foreground">{reading.value} {reading.unit}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(reading.recorded_at)} • By {recorder ? `${recorder.first_name} ${recorder.last_name}` : "Unknown"}
                      </p>
                      {reading.notes && <p className="text-xs text-muted-foreground">{reading.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Reading Modal */}
      {showAddReading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Record Meter Reading</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAddReading(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Meter Type *</Label>
                <Input className="mt-1" placeholder={t("assets.placeholders.meterType")} value={readingForm.meter_type} onChange={(e) => setReadingForm(p => ({ ...p, meter_type: e.target.value }))} />
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <Label>Value *</Label>
                  <Input type="number" min="0" step="0.1" className="mt-1" value={readingForm.value} onChange={(e) => setReadingForm(p => ({ ...p, value: e.target.value }))} />
                </div>
                <div>
                  <Label>Unit</Label>
                  <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={readingForm.unit} onChange={(e) => setReadingForm(p => ({ ...p, unit: e.target.value as MeterUnit }))}>
                    {(["hours", "miles", "km", "cycles", "psi", "rpm", "gallons", "liters"] as MeterUnit[]).map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input className="mt-1" placeholder={t("assets.placeholders.notes")} value={readingForm.notes} onChange={(e) => setReadingForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddReading(false)}>Cancel</Button>
                <Button disabled={!readingForm.meter_type.trim() || !readingForm.value} onClick={() => {
                  addMeterReading({
                    id: crypto.randomUUID(),
                    asset_id: assetId,
                    meter_type: readingForm.meter_type.trim(),
                    unit: readingForm.unit,
                    value: parseFloat(readingForm.value),
                    recorded_by: currentUserId,
                    recorded_at: new Date().toISOString(),
                    notes: readingForm.notes.trim() || null,
                    created_at: new Date().toISOString(),
                  });
                  toast("Meter reading recorded");
                  setShowAddReading(false);
                  setReadingForm({ meter_type: "", unit: "hours", value: "", notes: "" });
                }}>
                  <Plus className="h-4 w-4 mr-1" /> Record
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
