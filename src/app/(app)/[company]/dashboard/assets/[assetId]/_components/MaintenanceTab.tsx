"use client";

import * as React from "react";
import {
  Calendar,
  CheckCircle,
  Clock,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { useToast } from "@/components/ui/toast";
import { getScheduleAssigneeName } from "@/lib/status-utils";
import type { MaintenanceSchedule } from "@/types";

interface MaintenanceLogEntry {
  id: string;
  description: string;
  technician_name: string;
  completed_date: string;
  hours_spent: number;
  notes: string | null;
}

interface MaintenanceTabProps {
  assetId: string;
  companyId: string;
  schedules: MaintenanceSchedule[];
  setSchedules: React.Dispatch<React.SetStateAction<MaintenanceSchedule[]>>;
  maintenanceLogs: MaintenanceLogEntry[];
  users: Array<{ id: string; first_name: string; last_name: string; full_name: string }>;
  teams: Array<{ id: string; name: string }>;
}

export function MaintenanceTab({
  assetId,
  companyId,
  schedules,
  setSchedules,
  maintenanceLogs,
  users,
  teams,
}: MaintenanceTabProps) {
  const { t, formatDate } = useTranslation();
  const { toast } = useToast();
  const [maintenanceSubTab, setMaintenanceSubTab] = React.useState<"schedules" | "history">("schedules");
  const [showAddSchedule, setShowAddSchedule] = React.useState(false);
  const [showCompleteModal, setShowCompleteModal] = React.useState<string | null>(null);

  const isOverdue = (nextDue: string) => new Date(nextDue) < new Date();
  const isDueSoon = (nextDue: string, daysBefore: number) => {
    const dueDate = new Date(nextDue);
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + daysBefore);
    return dueDate <= warningDate && dueDate >= new Date();
  };

  const handleCompleteSchedule = (scheduleId: string, notes: string) => {
    setSchedules(prev => prev.map(s => {
      if (s.id === scheduleId) {
        const today = new Date();
        const nextDue = new Date();
        switch (s.frequency_unit) {
          case "days":
            nextDue.setDate(today.getDate() + s.frequency_value);
            break;
          case "weeks":
            nextDue.setDate(today.getDate() + (s.frequency_value * 7));
            break;
          case "months":
            nextDue.setMonth(today.getMonth() + s.frequency_value);
            break;
          case "years":
            nextDue.setFullYear(today.getFullYear() + s.frequency_value);
            break;
        }
        return {
          ...s,
          last_completed_date: today.toISOString().split('T')[0],
          next_due_date: nextDue.toISOString().split('T')[0],
          updated_at: today.toISOString(),
        };
      }
      return s;
    }));
    setShowCompleteModal(null);
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab toggles */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={maintenanceSubTab === "schedules" ? "default" : "outline"}
          onClick={() => setMaintenanceSubTab("schedules")}
        >
          {t("assets.schedules")}
        </Button>
        <Button
          size="sm"
          variant={maintenanceSubTab === "history" ? "default" : "outline"}
          onClick={() => setMaintenanceSubTab("history")}
        >
          {t("assets.history")}
        </Button>
      </div>

      {/* Maintenance Schedules */}
      {maintenanceSubTab === "schedules" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t("assets.sections.preventiveMaintenanceSchedules")}</CardTitle>
            <Button size="sm" className="gap-1" onClick={() => setShowAddSchedule(true)}>
              <Plus className="h-4 w-4" />
              {t("assets.buttons.addSchedule")}
            </Button>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t("assets.empty.noMaintenanceSchedules")}</p>
                <p className="text-sm">Add a schedule to track preventive maintenance</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule) => {
                  const overdue = isOverdue(schedule.next_due_date);
                  const dueSoon = isDueSoon(schedule.next_due_date, schedule.notify_days_before);
                  return (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{schedule.name}</h4>
                          <span className="text-sm text-muted-foreground capitalize">{schedule.priority}</span>
                          {overdue && <span className="text-sm text-destructive">{t("assets.overdue")}</span>}
                          {dueSoon && !overdue && <span className="text-sm text-warning">{t("assets.dueSoon")}</span>}
                        </div>
                        {schedule.description && (
                          <p className="text-sm text-muted-foreground mt-1">{schedule.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Every {schedule.frequency_value} {schedule.frequency_unit}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Next: {formatDate(schedule.next_due_date)}
                          </span>
                          <span>Assigned: {getScheduleAssigneeName(schedule, users, teams)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => setShowCompleteModal(schedule.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                          {t("assets.buttons.complete")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Maintenance History */}
      {maintenanceSubTab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("assets.sections.recentMaintenanceHistory")}</CardTitle>
          </CardHeader>
          <CardContent>
            {maintenanceLogs.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No maintenance history yet</p>
            ) : (
              <div className="space-y-3">
                {maintenanceLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{log.description}</p>
                      <p className="text-sm text-muted-foreground">
                        Completed by {log.technician_name} on {formatDate(log.completed_date)}
                        {log.hours_spent ? ` • ${log.hours_spent}h labor` : ""}
                      </p>
                      {log.notes && <p className="text-sm mt-1">{log.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Complete Maintenance Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Complete Maintenance</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowCompleteModal(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Mark &quot;{schedules.find(s => s.id === showCompleteModal)?.name}&quot; as complete?
              </p>
              <div>
                <Label>Notes (optional)</Label>
                <Input id="complete-notes" placeholder={t("assets.placeholders.completionNotes")} className="mt-1" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCompleteModal(null)}>Cancel</Button>
                <Button onClick={() => {
                  const notes = (document.getElementById('complete-notes') as HTMLInputElement)?.value || '';
                  handleCompleteSchedule(showCompleteModal, notes);
                }}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Complete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showAddSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Add Maintenance Schedule</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAddSchedule(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const name = (form.elements.namedItem("sched-name") as HTMLInputElement).value;
                  const desc = (form.elements.namedItem("sched-desc") as HTMLInputElement).value;
                  const freqVal = parseInt((form.elements.namedItem("sched-freq-val") as HTMLInputElement).value) || 1;
                  const freqUnit = (form.elements.namedItem("sched-freq-unit") as HTMLSelectElement).value as MaintenanceSchedule["frequency_unit"];
                  const priority = (form.elements.namedItem("sched-priority") as HTMLSelectElement).value as MaintenanceSchedule["priority"];
                  const notify = parseInt((form.elements.namedItem("sched-notify") as HTMLInputElement).value) || 7;

                  if (!name.trim()) return;

                  const today = new Date();
                  const nextDue = new Date();
                  switch (freqUnit) {
                    case "days": nextDue.setDate(today.getDate() + freqVal); break;
                    case "weeks": nextDue.setDate(today.getDate() + freqVal * 7); break;
                    case "months": nextDue.setMonth(today.getMonth() + freqVal); break;
                    case "years": nextDue.setFullYear(today.getFullYear() + freqVal); break;
                  }

                  const newSchedule: MaintenanceSchedule = {
                    id: `sched_${Date.now()}`,
                    asset_id: assetId,
                    company_id: companyId,
                    name: name.trim(),
                    description: desc.trim() || null,
                    frequency_value: freqVal,
                    frequency_unit: freqUnit,
                    last_completed_date: null,
                    next_due_date: nextDue.toISOString().split("T")[0],
                    assigned_to_user_id: null,
                    assigned_to_team_id: null,
                    priority,
                    notify_days_before: notify,
                    is_active: true,
                    created_at: today.toISOString(),
                    updated_at: today.toISOString(),
                  };

                  setSchedules((prev) => [...prev, newSchedule]);
                  toast("Schedule added");
                  setShowAddSchedule(false);
                }}
              >
                <div>
                  <Label htmlFor="sched-name">Name *</Label>
                  <Input id="sched-name" placeholder={t("assets.placeholders.scheduleName")} className="mt-1" required />
                </div>
                <div>
                  <Label htmlFor="sched-desc">Description</Label>
                  <Input id="sched-desc" placeholder={t("assets.placeholders.optionalDescription")} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="sched-freq-val">Every</Label>
                    <Input id="sched-freq-val" type="number" min="1" defaultValue="1" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="sched-freq-unit">Unit</Label>
                    <select id="sched-freq-unit" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="sched-priority">Priority</Label>
                  <select id="sched-priority" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="sched-notify">Notify days before due</Label>
                  <Input id="sched-notify" type="number" min="1" defaultValue="7" className="mt-1" />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddSchedule(false)}>Cancel</Button>
                  <Button type="submit">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Schedule
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
