"use client";

import * as React from "react";
import { Shield, Filter, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuditLogStore, type AuditLogEntry } from "@/stores/audit-log-store";
import { useAuth } from "@/hooks/use-auth";
import { useUsersStore } from "@/stores/users-store";
import { useTranslation } from "@/i18n";
import { useCompanyParam } from "@/hooks/use-company-param";

const ACTION_BADGE_VARIANT: Record<AuditLogEntry["action"], string> = {
  create: "success",
  update: "info",
  delete: "destructive",
  status_change: "warning",
  assign: "default",
};

const ENTITY_TYPES: AuditLogEntry["entity_type"][] = [
  "incident", "ticket", "work_order", "corrective_action",
  "asset", "location", "user", "checklist", "risk_assessment", "content",
];

export default function AuditLogPage() {
  const company = useCompanyParam();
  const { isSuperAdmin, isCompanyAdmin } = useAuth();
  const { t, formatDate } = useTranslation();
  const { items: users } = useUsersStore();
  const { entries, getRecentEntries } = useAuditLogStore();

  const [entityTypeFilter, setEntityTypeFilter] = React.useState("all");
  const [userFilter, setUserFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const canView = isSuperAdmin || isCompanyAdmin;

  const filteredEntries = React.useMemo(() => {
    let result = getRecentEntries(200);

    if (entityTypeFilter !== "all") {
      result = result.filter((e: AuditLogEntry) => e.entity_type === entityTypeFilter);
    }
    if (userFilter !== "all") {
      result = result.filter((e: AuditLogEntry) => e.user_id === userFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e: AuditLogEntry) =>
          e.entity_title.toLowerCase().includes(q) ||
          e.details.toLowerCase().includes(q) ||
          e.user_name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [entries, entityTypeFilter, userFilter, searchQuery, getRecentEntries]);

  const uniqueUsers = React.useMemo(() => {
    const seen = new Map<string, string>();
    getRecentEntries(200).forEach((e: AuditLogEntry) => {
      if (!seen.has(e.user_id)) seen.set(e.user_id, e.user_name);
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [entries, getRecentEntries]);

  if (!canView) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">{t("common.accessDenied") || "Access Denied"}</h2>
            <p className="text-sm text-muted-foreground">
              {t("auditLog.description")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const actionLabel = (action: AuditLogEntry["action"]) => {
    const key = `auditLog.actions.${action}`;
    return t(key) || action;
  };

  const formatEntityType = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("auditLog.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("auditLog.description")}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search") || "Search..."}
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t("auditLog.filterByType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("auditLog.allTypes")}</SelectItem>
                {ENTITY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatEntityType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t("auditLog.filterByUser")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("auditLog.allUsers")}</SelectItem>
                {uniqueUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Entries */}
      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t("auditLog.noEntries")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t("common.date") || "Date"}</th>
                  <th className="px-4 py-3 font-medium">{t("common.user") || "User"}</th>
                  <th className="px-4 py-3 font-medium">{t("common.action") || "Action"}</th>
                  <th className="px-4 py-3 font-medium">{t("common.type") || "Type"}</th>
                  <th className="px-4 py-3 font-medium">{t("common.details") || "Details"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry: AuditLogEntry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(entry.timestamp, { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {entry.user_name}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ACTION_BADGE_VARIANT[entry.action] as "success" | "info" | "destructive" | "warning" | "default"}>
                        {actionLabel(entry.action)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-muted-foreground">{formatEntityType(entry.entity_type)}</span>
                      {entry.entity_title && (
                        <span className="ml-1.5 font-medium">{entry.entity_title}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                      {entry.details}
                      {entry.changes && (
                        <span className="ml-1 text-xs">
                          ({Object.keys(entry.changes).join(", ")})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
