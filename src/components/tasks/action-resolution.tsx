"use client";

import React from "react";
import { FileText, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { CorrectiveAction } from "@/types";

interface ActionResolutionProps {
  action: CorrectiveAction;
  onUpdate: (id: string, changes: Partial<CorrectiveAction>) => void;
  canComplete: boolean;
  onComplete: () => void;
}

export function ActionResolution({ action, onUpdate, canComplete, onComplete }: ActionResolutionProps) {
  const { toast } = useToast();
  const [notes, setNotes] = React.useState(action.resolution_notes || "");
  const [hasUnsaved, setHasUnsaved] = React.useState(false);

  React.useEffect(() => {
    setNotes(action.resolution_notes || "");
    setHasUnsaved(false);
  }, [action.resolution_notes]);

  const handleSave = () => {
    onUpdate(action.id, {
      resolution_notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setHasUnsaved(false);
    toast("Resolution notes saved", "success");
  };

  const handleCompleteWithNotes = () => {
    if (!notes.trim()) {
      toast("Please add resolution notes before completing", "error");
      return;
    }
    // Save notes first, then complete
    onUpdate(action.id, {
      resolution_notes: notes.trim(),
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    toast("Corrective action completed", "success");
  };

  const isCompleted = action.status === "completed";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Resolution Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {isCompleted ? (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3">
              <p className="text-sm whitespace-pre-wrap">{action.resolution_notes || "No resolution notes provided."}</p>
            </div>
          ) : (
            <>
              <Textarea
                placeholder="Describe what was done to resolve this issue..."
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setHasUnsaved(true);
                }}
                className="min-h-[120px] resize-none"
              />
              {hasUnsaved && (
                <Button variant="outline" size="sm" onClick={handleSave} className="w-full">
                  Save Notes
                </Button>
              )}
            </>
          )}

          {!isCompleted && (
            <p className="text-xs text-muted-foreground">
              Resolution notes are required to mark this action as completed.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Complete button — prominent, only when in_progress */}
      {canComplete && action.status === "in_progress" && (
        <button
          onClick={handleCompleteWithNotes}
          disabled={!notes.trim()}
          className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 text-sm font-medium transition-colors bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="h-4 w-4" />
          Complete with Resolution
        </button>
      )}
    </div>
  );
}
