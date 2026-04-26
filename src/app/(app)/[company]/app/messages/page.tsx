"use client";

import * as React from "react";
import Link from "next/link";
import { MessageSquare, AlertTriangle, ClipboardList, ArrowUpDown } from "lucide-react";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { useCommentFeed, type FeedComment } from "@/hooks/use-comment-feed";
import { SheetPageShell } from "@/components/layouts/sheet-page-shell";
import { cn } from "@/lib/utils";

function MessagesContent() {
  const company = useCompanyParam();
  useAuth();
  useTranslation();
  const [filterType, setFilterType] = React.useState<"all" | "incident" | "task">("all");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");

  const {
    feed,
    unreadCount,
    markSeen,
    mounted,
    lastSeenAt,
  } = useCommentFeed("app", company);

  React.useEffect(() => {
    if (mounted) markSeen();
  }, [mounted, markSeen]);

  const filtered = React.useMemo(() => {
    let items = [...feed];
    if (filterType !== "all") items = items.filter((c) => c.sourceType === filterType);
    items.sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      return sortOrder === "newest" ? tb - ta : ta - tb;
    });
    return items;
  }, [feed, filterType, sortOrder]);

  const topRight = unreadCount > 0 ? (
    <span className="text-xs font-medium text-muted-foreground">
      {unreadCount} new
    </span>
  ) : null;

  const toolbar = (
    <div className="space-y-2">
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {([
          { value: "all", label: "All" },
          { value: "incident", label: "Incidents" },
          { value: "task", label: "Tasks" },
        ] as const).map((filter) => (
          <button
            key={filter.value}
            onClick={() => setFilterType(filter.value)}
            className={cn(
              "flex-1 py-1.5 text-xs font-medium rounded-md transition-colors",
              filterType === filter.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setSortOrder((s) => s === "newest" ? "oldest" : "newest")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 bg-muted text-muted-foreground"
        >
          <ArrowUpDown className="h-3 w-3" />
          {sortOrder === "newest" ? "Newest first" : "Oldest first"}
        </button>
      </div>
    </div>
  );

  return (
    <SheetPageShell title="Messages" topRight={topRight} toolbar={toolbar}>
      <div className="flex-1">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          <ul>
            {filtered.map((comment) => {
              const sourceHref = comment.sourceType === "incident"
                ? `/${company}/app/incidents/${comment.sourceId}?tab=comments`
                : `/${company}/dashboard/tickets/${comment.sourceId}?tab=comments`;
              const isUnread = mounted && lastSeenAt
                ? new Date(comment.date).getTime() > new Date(lastSeenAt).getTime()
                : true;
              const dateObj = new Date(comment.date);
              const now = new Date();
              const diffDays = Math.floor((now.getTime() - dateObj.getTime()) / 86400000);
              const dateLabel = diffDays === 0
                ? dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                : diffDays === 1
                  ? "Yesterday"
                  : dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

              return (
                <li key={comment.id} className="border-b border-border last:border-0">
                  <Link
                    href={sourceHref}
                    className="flex items-start gap-3 px-4 py-3.5 transition-all bg-background active:bg-muted/40"
                  >
                    <div className="mt-0.5 shrink-0">
                      {comment.sourceType === "incident" ? (
                        <AlertTriangle className="h-5 w-5 text-orange-500" aria-hidden="true" />
                      ) : (
                        <ClipboardList className="h-5 w-5 text-purple-500" aria-hidden="true" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm leading-snug", isUnread ? "font-semibold" : "font-medium text-muted-foreground")}>
                          {comment.user}
                        </p>
                        {isUnread && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{comment.text}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">
                        {comment.sourceTitle} · {dateLabel}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SheetPageShell>
  );
}

export default function MobileMessagesPage() {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading…</p></div>}>
      <MessagesContent />
    </React.Suspense>
  );
}
