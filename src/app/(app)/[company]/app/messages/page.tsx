"use client";

import * as React from "react";
import Link from "next/link";
import { MessageSquare, ArrowLeft, Search, ArrowUpDown, X, ChevronRight, AlertTriangle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { useCommentFeed, type FeedComment } from "@/hooks/use-comment-feed";
import { cn } from "@/lib/utils";

function getTimeGroup(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This Week";
  if (days < 30) return "This Month";
  return "Older";
}

function MessagesContent() {
  const company = useCompanyParam();
  const { user } = useAuth();
  const { t, formatDate } = useTranslation();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");
  const [filterType, setFilterType] = React.useState<"all" | "incident" | "task">("all");

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
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((c) => c.text.toLowerCase().includes(q) || c.user.toLowerCase().includes(q) || c.sourceTitle.toLowerCase().includes(q));
    }
    items.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
    return items;
  }, [feed, filterType, searchQuery, sortOrder]);

  // Group by time
  const grouped = React.useMemo(() => {
    const groups: Record<string, FeedComment[]> = {};
    filtered.forEach((c) => {
      const group = getTimeGroup(c.date);
      if (!groups[group]) groups[group] = [];
      groups[group].push(c);
    });
    return Object.entries(groups);
  }, [filtered]);

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Sticky Header — matches Safety & Compliance pattern */}
      <div className="sticky top-[60px] z-10 bg-background border-b px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold truncate">Messages</h1>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">{unreadCount} new</span>
            )}
            {!searchOpen && (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search — toggle visibility */}
        {searchOpen && (
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="h-8 pl-8 pr-8 text-sm"
              autoFocus
            />
            <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Filter pills + Sort */}
        <div className="flex items-center gap-2">
          {([
            { value: "all", label: "All" },
            { value: "incident", label: "Incidents" },
            { value: "task", label: "Tasks" },
          ] as const).map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterType(filter.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                filterType === filter.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSortOrder((s) => s === "newest" ? "oldest" : "newest")}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 bg-muted text-muted-foreground ml-auto"
          >
            <ArrowUpDown className="h-3 w-3" />
            {sortOrder === "newest" ? "Newest" : "Oldest"}
          </button>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 px-4 pt-3 pb-24 space-y-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="rounded-full bg-muted p-4 mb-3">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{searchQuery ? "No matching messages" : "No messages yet"}</p>
          </div>
        ) : (
          grouped.map(([group, comments]) => (
            <div key={group}>
              <p className="text-xs text-muted-foreground font-medium mb-2 mt-3">{group}</p>
              <div className="space-y-2">
                {comments.map((comment) => {
                  const sourceHref = comment.sourceType === "incident"
                    ? `/${company}/app/incidents/${comment.sourceId}?tab=comments`
                    : `/${company}/dashboard/tickets/${comment.sourceId}?tab=comments`;
                  const isUnread = mounted && lastSeenAt ? new Date(comment.date).getTime() > new Date(lastSeenAt).getTime() : true;
                  const dateObj = new Date(comment.date);
                  const now = new Date();
                  const diffDays = Math.floor((now.getTime() - dateObj.getTime()) / 86400000);
                  const dateLabel = diffDays === 0
                    ? dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                    : diffDays === 1 ? "Yesterday" : dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  const initials = comment.user.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

                  return (
                    <Link
                      key={comment.id}
                      href={sourceHref}
                      className="flex items-center gap-3 rounded-xl border bg-card p-3 active:bg-muted/50 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold",
                          isUnread ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          {initials}
                        </div>
                        {isUnread && (
                          <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-card" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={cn("text-sm truncate", isUnread ? "font-semibold" : "font-medium")}>{comment.user}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{dateLabel}</span>
                        </div>
                        <p className={cn("text-xs line-clamp-2 mt-0.5", isUnread ? "text-foreground" : "text-muted-foreground")}>{comment.text}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1 flex items-center gap-1">
                          {comment.sourceType === "incident" ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <ClipboardList className="h-3 w-3" />
                          )}
                          {comment.sourceTitle}
                        </p>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function MobileMessagesPage() {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div>}>
      <MessagesContent />
    </React.Suspense>
  );
}
