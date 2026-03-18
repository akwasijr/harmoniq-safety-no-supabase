"use client";

import React from "react";
import { Wrench, Clock, DollarSign, Plus, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import type { WorkOrder, Part } from "@/types";

interface WorkOrderWorkLogProps {
  workOrder: WorkOrder;
  parts: Part[];
  onUpdate: (id: string, changes: Partial<WorkOrder>) => void;
  formatNumber: (n: number, options?: Intl.NumberFormatOptions) => string;
}

export function WorkOrderWorkLog({ workOrder, parts, onUpdate, formatNumber }: WorkOrderWorkLogProps) {
  const { toast } = useToast();
  const partsUsed = workOrder.parts_used || [];

  const handleHoursChange = (field: "estimated_hours" | "actual_hours", value: string) => {
    const num = value === "" ? null : parseFloat(value);
    onUpdate(workOrder.id, { [field]: num, updated_at: new Date().toISOString() });
  };

  const handleTogglePart = (partId: string) => {
    const existing = partsUsed.find((p) => p.part_id === partId);
    let updated;
    if (existing) {
      updated = partsUsed.filter((p) => p.part_id !== partId);
    } else {
      updated = [...partsUsed, { part_id: partId, quantity: 1 }];
    }
    onUpdate(workOrder.id, { parts_used: updated, updated_at: new Date().toISOString() });
  };

  const handlePartQuantity = (partId: string, delta: number) => {
    const updated = partsUsed.map((p) => {
      if (p.part_id !== partId) return p;
      const newQty = Math.max(1, p.quantity + delta);
      return { ...p, quantity: newQty };
    });
    onUpdate(workOrder.id, { parts_used: updated, updated_at: new Date().toISOString() });
  };

  const totalPartsCost = partsUsed.reduce((sum, pu) => {
    const part = parts.find((p) => p.id === pu.part_id);
    return sum + (part ? part.unit_cost * pu.quantity : 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Hours */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Estimated hours</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="—"
              value={workOrder.estimated_hours ?? ""}
              onChange={(e) => handleHoursChange("estimated_hours", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Actual hours</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="Log hours spent..."
              value={workOrder.actual_hours ?? ""}
              onChange={(e) => handleHoursChange("actual_hours", e.target.value)}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Parts used */}
      {parts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Parts Used
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {parts.map((part) => {
              const usage = partsUsed.find((pu) => pu.part_id === part.id);
              const isUsed = !!usage;

              return (
                <div
                  key={part.id}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isUsed ? "bg-primary/5 border border-primary/20" : "bg-muted/50"
                  }`}
                >
                  <button
                    onClick={() => handleTogglePart(part.id)}
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isUsed ? "bg-primary border-primary" : "border-muted-foreground/30"
                    }`}
                  >
                    {isUsed && (
                      <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{part.name}</p>
                    <p className="text-xs text-muted-foreground">{part.part_number} • {formatNumber(part.unit_cost, { style: "currency", currency: "USD" })}/unit</p>
                  </div>
                  {isUsed && usage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handlePartQuantity(part.id, -1)} className="h-7 w-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted-foreground/10">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{usage.quantity}</span>
                      <button onClick={() => handlePartQuantity(part.id, 1)} className="h-7 w-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted-foreground/10">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Cost summary */}
      {(totalPartsCost > 0 || workOrder.labor_cost) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {totalPartsCost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Parts</span>
                <span className="font-medium">{formatNumber(totalPartsCost, { style: "currency", currency: "USD" })}</span>
              </div>
            )}
            {workOrder.labor_cost != null && workOrder.labor_cost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Labor</span>
                <span className="font-medium">{formatNumber(workOrder.labor_cost, { style: "currency", currency: "USD" })}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t pt-2">
              <span>Total</span>
              <span>{formatNumber(totalPartsCost + (workOrder.labor_cost || 0), { style: "currency", currency: "USD" })}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
