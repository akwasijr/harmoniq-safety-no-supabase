"use client";

import * as React from "react";
import Link from "next/link";
import { MessageSquare, Send, Search, ArrowUpDown, X, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/components/auth/role-guard";
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

function CommentsPageContent() {
  const company = useCompanyParam();
  const { user } = useAuth();
  const { t, formatDate } = useTranslation();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");
  const [filterType, setFilterType] = React.useState<"all" | "incident" | "task">("all");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState("");

  const {
    feed,
    unreadCount,
    totalComments,
    markSeen,
    mounted,
    stores,
    incidents,
  } = useCommentFeed("dashboard", company);

  React.useEffect(() => {
    if (mounted) markSeen();
  }, [mounted, markSeen]);

  const handleReply = (sourceId: string) => {
    if (!replyText.trim() || !user) return;
    const incident = incidents.find((i) => i.id === sourceId);
    if (incident) {
      const newComment = {
        id: crypto.randomUUID(),
        user: user.full_name || "You",
        userId: user.id,
        text: replyText.trim(),
        date: new Date().toISOString(),
        avatar: user.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?",
      };
      stores.incidents.update(sourceId, { comments: [...(incident.comments ?? []), newComment] });
    }
    setReplyText("");
    setExpandedId(null);
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold">Messages</h1>
            <p className="text-sm text-muted-foreground">{totalComments} message{totalComments !== 1 ? "s" : ""}{unreadCount > 0 ? ` · ${unreadCount} new` : ""}</p>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="pl-9"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All types</option>
            <option value="incident">Incidents</option>
            <option value="task">Tasks</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setSortOrder((s) => s === "newest" ? "oldest" : "newest")}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortOrder === "newest" ? "Newest" : "Oldest"}
          </Button>
        </div>
      </div>

      {/* Messages grouped by time */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">{searchQuery ? "No matching messages" : "No messages yet"}</p>
            <p className="text-xs text-muted-foreground mt-1">Comments on incidents and tasks you&apos;re involved with will appear here</p>
          </CardContent>
        </Card>
      ) : (
        grouped.map(([group, comments]) => (
          <div key={group}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{group}</p>
            <Card>
              <CardContent className="p-0 divide-y">
                {comments.map((comment) => {
                  const isExpanded = expandedId === comment.id;
                  const sourceHref = comment.sourceType === "incident"
                    ? `/${company}/dashboard/incidents/${comment.sourceId}?tab=comments`
                    : `/${company}/dashboard/tickets/${comment.sourceId}?tab=comments`;
                  return (
                    <div key={comment.id}>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : comment.id)}
                        className="flex items-start gap-3 w-full p-4 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
                          {comment.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{comment.user}</p>
                            <p className="text-xs text-muted-foreground shrink-0">{formatDate(new Date(comment.date))}</p>
                          </div>
                          <p className={cn("text-sm text-muted-foreground mt-0.5", !isExpanded && "line-clamp-1")}>{comment.text}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{comment.sourceType === "incident" ? "Incident" : "Task"}</Badge>
                            <span className="text-[10px] text-muted-foreground truncate">{comment.sourceTitle}</span>
                          </div>
                        </div>
                        <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 mt-2 transition-transform", isExpanded && "rotate-90")} />
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 pl-16 space-y-3">
                          <Link href={sourceHref} className="text-xs text-primary hover:underline">
                            Open {comment.sourceType === "incident" ? "incident" : "task"} →
                          </Link>
                          <div className="flex gap-2">
                            <Textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply..."
                              rows={2}
                              className="text-sm"
                            />
                            <Button
                              size="sm"
                              disabled={!replyText.trim()}
                              onClick={() => handleReply(comment.sourceId)}
                              className="shrink-0 self-end"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}

export default function CommentsPage() {
  return (
    <RoleGuard requiredPermission="incidents.view_own">
      <React.Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div>}>
        <CommentsPageContent />
      </React.Suspense>
    </RoleGuard>
  );
}
