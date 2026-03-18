"use client";

import React from "react";
import { MessageCircle, Send, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";

export type TaskComment = {
  id: string;
  author: string;
  userId: string;
  text: string;
  date: string;
};

function getStorageKey(entityType: string, entityId: string) {
  return `harmoniq_task_comments_${entityType}_${entityId}`;
}

export function loadComments(entityType: string, entityId: string): TaskComment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(entityType, entityId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveComments(entityType: string, entityId: string, comments: TaskComment[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(entityType, entityId), JSON.stringify(comments));
}

interface TaskCommentsProps {
  entityType: string;
  entityId: string;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
}

export function TaskComments({ entityType, entityId, formatDate }: TaskCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [comments, setComments] = React.useState<TaskComment[]>([]);
  const [newComment, setNewComment] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      setError(null);
      const raw = typeof window !== "undefined"
        ? window.localStorage.getItem(getStorageKey(entityType, entityId))
        : null;
      setComments(raw ? JSON.parse(raw) : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setComments([]);
    }
  }, [entityType, entityId]);

  const handleAdd = React.useCallback(() => {
    if (!newComment.trim() || !user) return;
    const comment: TaskComment = {
      id: `c_${Date.now()}`,
      author: user.full_name || "You",
      userId: user.id,
      text: newComment.trim(),
      date: new Date().toISOString(),
    };
    const updated = [...comments, comment];
    setComments(updated);
    setNewComment("");
    try {
      saveComments(entityType, entityId, updated);
      setError(null);
      toast(t("tasks.comments.added"), "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast(t("tasks.comments.saveError"), "error");
    }
  }, [newComment, user, comments, entityType, entityId, toast, t]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Comment form */}
      <Card>
        <CardContent className="p-4">
          <Textarea
            placeholder={t("tasks.comments.placeholder")}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="mb-3 min-h-[80px] resize-none"
          />
          <Button onClick={handleAdd} disabled={!newComment.trim()} size="sm" className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {t("tasks.comments.post")}
          </Button>
        </CardContent>
      </Card>

      {/* Comments list */}
      {comments.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              {t("tasks.comments.title", { count: comments.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {[...comments].reverse().map((comment) => (
              <div key={comment.id} className="border-l-2 border-muted pl-3 py-1">
                <p className="text-sm">{comment.text}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {comment.author} • {formatDate(comment.date)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-3">
            <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">{t("tasks.comments.empty")}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{t("tasks.comments.emptyHint")}</p>
        </div>
      )}
    </div>
  );
}
