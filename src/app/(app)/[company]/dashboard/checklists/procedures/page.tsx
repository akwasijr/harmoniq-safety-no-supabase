"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import { ClipboardCheck, Library, Wrench, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, capitalize } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import { WORK_ORDER_PROCEDURE_TEMPLATES } from "@/data/work-order-procedure-templates";

export default function ProcedureTemplatesPage() {
  const company = useCompanyParam();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <RoleGuard requiredPermission="checklists.view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Checklist Templates</h1>
        </div>

        {/* Top-level Tabs */}
        <div className="border-b">
          <div className="flex gap-4">
            <Link
              href={`/${company}/dashboard/checklists/my-templates`}
              className="flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              <ClipboardCheck className="h-4 w-4 shrink-0" />
              {t("industry_templates._ui.myTemplates")}
            </Link>
            <Link
              href={`/${company}/dashboard/checklists/templates`}
              className="flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              <Library className="h-4 w-4 shrink-0" />
              {t("industry_templates._ui.templateLibrary")}
            </Link>
            <button
              className={cn(
                "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap",
                "text-primary"
              )}
            >
              <Wrench className="h-4 w-4 shrink-0" />
              Procedure Templates
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            </button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Built-in procedure checklists are automatically assigned to work orders based on the selected work order type. Field workers complete them as part of the work order flow.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WORK_ORDER_PROCEDURE_TEMPLATES.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => router.push(`/${company}/dashboard/checklists/${template.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm leading-snug">{template.name}</CardTitle>
                  <Badge variant="success" className="shrink-0 text-xs">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="capitalize font-medium text-foreground">
                    {(template.work_order_type || "").replace(/_/g, " ")}
                  </span>
                  <span>·</span>
                  <span>{template.items.length} steps</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {template.items.slice(0, 3).map((item) => (
                    <span key={item.id} className="inline-block rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground truncate max-w-[180px]">
                      {item.question}
                    </span>
                  ))}
                  {template.items.length > 3 && (
                    <span className="inline-block rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      +{template.items.length - 3} more
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </RoleGuard>
  );
}
