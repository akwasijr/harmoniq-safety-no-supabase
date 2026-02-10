"use client";

import * as React from "react";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  Plus,
  Package,
  Search,
  X,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { usePartsStore } from "@/stores/parts-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import type { Part } from "@/types";
import { useTranslation } from "@/i18n";

export default function PartsPage() {
  const { t, formatNumber } = useTranslation();
  const company = useCompanyParam();
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: parts, add, update } = usePartsStore();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    part_number: "",
    unit_cost: "",
    quantity_in_stock: "",
    minimum_stock: "",
    supplier: "",
  });

  const filtered = parts.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.part_number.toLowerCase().includes(q);
  });

  const totalParts = parts.length;
  const totalValue = parts.reduce((sum, p) => sum + p.unit_cost * p.quantity_in_stock, 0);
  const lowStockCount = parts.filter((p) => p.quantity_in_stock <= p.minimum_stock).length;

  const handleCreate = () => {
    if (!form.name.trim() || !form.part_number.trim()) return;
    const part: Part = {
      id: `part_${Date.now()}`,
      company_id: user?.company_id || "",
      name: form.name.trim(),
      part_number: form.part_number.trim(),
      unit_cost: parseFloat(form.unit_cost) || 0,
      quantity_in_stock: parseInt(form.quantity_in_stock) || 0,
      minimum_stock: parseInt(form.minimum_stock) || 0,
      supplier: form.supplier.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    add(part);
    toast("Part added to inventory");
    setShowCreate(false);
    setForm({ name: "", part_number: "", unit_cost: "", quantity_in_stock: "", minimum_stock: "", supplier: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          {t("parts.addPart")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title={t("parts.title")} value={totalParts} icon={Package} />
        <KPICard title={t("parts.labels.inventoryValue")} value={`$${totalValue.toLocaleString()}`} icon={Package} />
        <KPICard title={t("parts.labels.lowStock")} value={lowStockCount} icon={AlertTriangle} />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("parts.placeholders.searchParts")} className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No parts in inventory</p>
            <p className="text-sm">Add parts to track usage and costs across work orders</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((part) => {
            const isLow = part.quantity_in_stock <= part.minimum_stock;
            return (
              <Card key={part.id} className={isLow ? "border-warning/50" : ""}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{part.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{part.part_number}</p>
                    </div>
                    {isLow && <Badge variant="warning">{t("parts.labels.lowStock")}</Badge>}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t("parts.labels.inStock")}</p>
                      <p className="font-medium">{part.quantity_in_stock}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("parts.labels.unitCost")}</p>
                      <p className="font-medium">${part.unit_cost.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("parts.labels.minimumStock")}</p>
                      <p className="font-medium">{part.minimum_stock}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("parts.labels.supplier")}</p>
                      <p className="font-medium truncate">{part.supplier || "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("parts.addPart")}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("parts.labels.partName")}</Label>
                <Input className="mt-1" placeholder="e.g. Hydraulic Filter" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>{t("parts.labels.partNumber")}</Label>
                <Input className="mt-1" placeholder="e.g. HF-2045-A" value={form.part_number} onChange={(e) => setForm(p => ({ ...p, part_number: e.target.value }))} />
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <Label>{t("parts.labels.unitCost")}</Label>
                  <Input type="number" min="0" step="0.01" className="mt-1" value={form.unit_cost} onChange={(e) => setForm(p => ({ ...p, unit_cost: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("parts.labels.qtyInStock")}</Label>
                  <Input type="number" min="0" className="mt-1" value={form.quantity_in_stock} onChange={(e) => setForm(p => ({ ...p, quantity_in_stock: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <Label>{t("parts.labels.minimumStock")}</Label>
                  <Input type="number" min="0" className="mt-1" value={form.minimum_stock} onChange={(e) => setForm(p => ({ ...p, minimum_stock: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("parts.labels.supplier")}</Label>
                  <Input className="mt-1" placeholder="Supplier name" value={form.supplier} onChange={(e) => setForm(p => ({ ...p, supplier: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
                <Button onClick={handleCreate} disabled={!form.name.trim() || !form.part_number.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> {t("parts.buttons.addPart")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
