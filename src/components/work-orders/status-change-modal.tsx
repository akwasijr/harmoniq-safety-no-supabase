"use client";

import React from "react";
import { Clock, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatStatusLabel, getStatusConfig } from "@/components/tasks/task-detail-header";
import type { WorkOrderStatus, WorkOrderStatusLogEntry } from "@/types";
import type { UserLike } from "@/lib/status-utils";

interface StatusChangeModalProps {
  currentStatus: WorkOrderStatus;
  availableStatuses: WorkOrderStatus[];
  statusLog: WorkOrderStatusLogEntry[];
  users: UserLike[];
  onSubmit: (targetStatus: WorkOrderStatus, comment: string) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const MAX_COMMENT_LENGTH = 100;

export function StatusChangeModal({
  currentStatus,
  availableStatuses,
  statusLog,
  users,
  onSubmit,
  onCancel,
  isOpen,
}: StatusChangeModalProps) {
  const [targetStatus, setTargetStatus] = React.useState<WorkOrderStatus | "">(
    availableStatuses[0] ?? "",
  );
  const [comment, setComment] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      setTargetStatus(availableStatuses[0] ?? "");
      setComment("");
    }
  }, [isOpen, availableStatuses]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStatus) return;
    onSubmit(targetStatus as WorkOrderStatus, comment.trim());
  };

  const getUserName = (userId: string) => {
    if (userId === "system") return "System";
    const user = users.find((u) => u.id === userId);
    return user ? user.full_name || `${user.first_name} ${user.last_name}` : "Unknown";
  };

  const sortedLog = [...statusLog].sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-xl border bg-background shadow-lg">
        <div className="border-b px-5 py-4">
          <h3 className="text-base font-semibold">Change status</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Current: {formatStatusLabel(currentStatus)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="target-status">New status</Label>
            <Select
              value={targetStatus}
              onValueChange={(v) => setTargetStatus(v as WorkOrderStatus)}
            >
              <SelectTrigger id="target-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status-comment">Comment</Label>
            <Textarea
              id="status-comment"
              placeholder="Add a reason for this change..."
              value={comment}
              onChange={(e) =>
                setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))
              }
              rows={2}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/{MAX_COMMENT_LENGTH}
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!targetStatus}>
              Update status
            </Button>
          </div>
        </form>

        {sortedLog.length > 0 && (
          <div className="border-t px-5 py-4">
            <h4 className="text-sm font-medium mb-3">Status history</h4>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {sortedLog.map((entry) => {
                const fromConf = entry.from_status
                  ? getStatusConfig(entry.from_status)
                  : null;
                const toConf = getStatusConfig(entry.to_status);
                return (
                  <div key={entry.id} className="flex gap-3 text-sm">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40 mt-1.5" />
                      <div className="w-px flex-1 bg-border" />
                    </div>
                    <div className="pb-3 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {fromConf && (
                          <>
                            <Badge className="text-[10px] px-1.5 py-0" variant={fromConf.variant as BadgeProps["variant"]}>
                              {fromConf.label}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                          </>
                        )}
                        <Badge className="text-[10px] px-1.5 py-0" variant={toConf.variant as BadgeProps["variant"]}>
                          {toConf.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {getUserName(entry.changed_by)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(entry.changed_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {entry.comment && (
                        <p className="mt-1 text-xs text-muted-foreground flex items-start gap-1">
                          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                          {entry.comment}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
