"use client";

import { useMemo, useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { loadComments } from "@/components/tasks/task-comments";
import type { Incident, IncidentComment } from "@/types";

export interface FeedComment {
  id: string;
  text: string;
  user: string;
  userId: string;
  avatar: string;
  date: string;
  sourceType: "incident" | "task";
  sourceId: string;
  sourceTitle: string;
  sourceHref: string;
  isForUser: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getLastSeenKey(userId: string): string {
  return `harmoniq_comments_seen_${userId}`;
}

export function useCommentFeed(basePath: "dashboard" | "app", company?: string) {
  const { user } = useAuth();
  const { incidents, tickets, stores } = useCompanyData();
  const userId = user?.id ?? "";
  const companySlug = company || "";

  const [lastSeenAt, setLastSeenAt] = useState<string | null>(() => {
    if (typeof window === "undefined" || !userId) return null;
    return window.localStorage.getItem(getLastSeenKey(userId));
  });
  // Track client mount via render-safe subscription (avoids setState-in-effect)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Mark comments as seen (call when page opens)
  const markSeen = useCallback(() => {
    if (!userId) return;
    const now = new Date().toISOString();
    window.localStorage.setItem(getLastSeenKey(userId), now);
    setLastSeenAt(now);
  }, [userId]);

  // Build the comment feed
  const feed = useMemo(() => {
    if (!userId) return [];

    const comments: FeedComment[] = [];

    // 1. Incident comments
    incidents.forEach((incident) => {
      const incComments = incident.comments ?? [];
      if (incComments.length === 0) return;

      const userCommented = incComments.some((c) => c.userId === userId);
      const userAssigned = incident.assigned_to === userId;

      incComments.forEach((c) => {
        const isForUser =
          c.mentionedUserIds?.includes(userId) ||
          userAssigned ||
          userCommented;

        if (!isForUser) return;

        comments.push({
          id: `inc-${incident.id}-${c.id}`,
          text: c.text,
          user: c.user,
          userId: c.userId,
          avatar: c.avatar || getInitials(c.user),
          date: c.date,
          sourceType: "incident",
          sourceId: incident.id,
          sourceTitle: `${incident.reference_number}: ${incident.title}`,
          sourceHref: companySlug ? `/${companySlug}/dashboard/incidents/${incident.id}` : "",
          isForUser: true,
        });
      });
    });

    // 2. Ticket comments (stored in localStorage via task-comments system)
    tickets.forEach((ticket) => {
      const ticketComments = loadComments("ticket", ticket.id);
      if (ticketComments.length === 0) return;

      const userCommented = ticketComments.some((c) => c.userId === userId);
      const userAssigned = ticket.assigned_to === userId;

      ticketComments.forEach((c) => {
        const isForUser = userAssigned || userCommented;

        if (!isForUser) return;

        comments.push({
          id: `tkt-${ticket.id}-${c.id}`,
          text: c.text,
          user: c.author,
          userId: c.userId,
          avatar: getInitials(c.author),
          date: c.date,
          sourceType: "task",
          sourceId: ticket.id,
          sourceTitle: `Ticket: ${ticket.title}`,
          sourceHref: companySlug ? `/${companySlug}/dashboard/tickets/${ticket.id}` : "",
          isForUser: true,
        });
      });
    });

    // Sort newest first
    comments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return comments;
  }, [incidents, tickets, userId, basePath, companySlug]);

  // Compute unread count
  const unreadCount = useMemo(() => {
    if (!mounted || !lastSeenAt) return feed.length;
    const seenTime = new Date(lastSeenAt).getTime();
    return feed.filter((c) => new Date(c.date).getTime() > seenTime).length;
  }, [feed, lastSeenAt, mounted]);

  // Count unique items with activity
  const itemsWithActivity = useMemo(() => {
    const ids = new Set(feed.map((c) => c.sourceId));
    return ids.size;
  }, [feed]);

  return {
    feed,
    unreadCount,
    totalComments: feed.length,
    itemsWithActivity,
    markSeen,
    mounted,
    lastSeenAt,
    stores,
    incidents,
  };
}

/** Standalone unread count (for header badges — lightweight) */
export function useUnreadCommentCount(): number {
  const { user } = useAuth();
  const { incidents, tickets } = useCompanyData();
  const userId = user?.id ?? "";
  const [lastSeenAt] = useState<string | null>(() => {
    if (typeof window === "undefined" || !userId) return null;
    return window.localStorage.getItem(getLastSeenKey(userId));
  });
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return useMemo(() => {
    if (!mounted || !userId) return 0;

    const dates: string[] = [];

    incidents.forEach((incident) => {
      const incComments = incident.comments ?? [];
      if (incComments.length === 0) return;
      const userCommented = incComments.some((c) => c.userId === userId);
      const userAssigned = incident.assigned_to === userId;

      incComments.forEach((c) => {
        const isForUser =
          c.mentionedUserIds?.includes(userId) ||
          userAssigned ||
          userCommented;
        if (isForUser) dates.push(c.date);
      });
    });

    tickets.forEach((ticket) => {
      const ticketComments = loadComments("ticket", ticket.id);
      if (ticketComments.length === 0) return;
      const userCommented = ticketComments.some((c) => c.userId === userId);
      const userAssigned = ticket.assigned_to === userId;

      ticketComments.forEach((c) => {
        const isForUser = userAssigned || userCommented;
        if (isForUser) dates.push(c.date);
      });
    });

    if (!lastSeenAt) return dates.length;
    const seenTime = new Date(lastSeenAt).getTime();
    return dates.filter((d) => new Date(d).getTime() > seenTime).length;
  }, [mounted, userId, incidents, tickets, lastSeenAt]);
}
