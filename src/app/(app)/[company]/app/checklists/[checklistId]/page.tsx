"use client";

import * as React from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Camera,
  ClipboardCheck,
  Check,
  X,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { useToast } from "@/components/ui/toast";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { isVisibleToFieldApp } from "@/lib/template-activation";
import { getDraft as getStoredDraft, saveDraft as saveStoredDraft, deleteDraft as deleteStoredDraft } from "@/lib/draft-store";
import type { ChecklistResponse } from "@/types";

export default function ChecklistFormPage() {
  return (
    <React.Suspense fallback={<LoadingPage />}>
      <ChecklistFormPageContent />
    </React.Suspense>
  );
}

function ChecklistFormPageContent() {
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const rawCompany = routeParams.company;
  const company = typeof rawCompany === "string" ? rawCompany : Array.isArray(rawCompany) ? rawCompany[0] : "";
  const rawChecklistId = routeParams.checklistId;
  const checklistId = typeof rawChecklistId === "string" ? rawChecklistId : Array.isArray(rawChecklistId) ? rawChecklistId[0] : "";
  const draftId = searchParams.get("draft");
  const [currentItem, setCurrentItem] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [photos, setPhotos] = React.useState<Record<string, string[]>>({});
  const [showNotes, setShowNotes] = React.useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [generalComments, setGeneralComments] = React.useState("");
  const [draftSavedAt, setDraftSavedAt] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { items: templates, isLoading: isTemplatesLoading } = useChecklistTemplatesStore();
  const { items: submissions, add: addSubmission } = useChecklistSubmissionsStore();
  const { user, currentCompany } = useAuth();
  const { toast } = useToast();

  const { t } = useTranslation();

  const matchedTemplate = templates.find((tpl) => tpl.id === checklistId);
  const template =
    matchedTemplate &&
    user?.company_id &&
    (matchedTemplate.company_id === user.company_id ||
      matchedTemplate.company_id === "__built_in__") &&
    isVisibleToFieldApp(matchedTemplate)
      ? matchedTemplate
      : undefined;

  // Resume draft if ?draft=id is present
  const draftInitialized = React.useRef(false);
  React.useEffect(() => {
    if (draftInitialized.current || !draftId) return;
    const draft = submissions.find((s) => s.id === draftId);
    if (draft && draft.responses) {
      const restoredAnswers: Record<string, string> = {};
      const restoredNotes: Record<string, string> = {};
      const restoredPhotos: Record<string, string[]> = {};
      for (const r of draft.responses) {
        if (r.value === true) restoredAnswers[r.item_id] = "yes";
        else if (r.value === false) restoredAnswers[r.item_id] = "no";
        else if (r.value === null || r.value === "na" || r.value === "n/a") restoredAnswers[r.item_id] = "na";
        else if (typeof r.value === "number") restoredAnswers[r.item_id] = String(r.value);
        else if (typeof r.value === "string") restoredAnswers[r.item_id] = r.value;
        if (r.comment) restoredNotes[r.item_id] = r.comment;
        if (r.photo_urls && r.photo_urls.length > 0) restoredPhotos[r.item_id] = r.photo_urls;
      }
      setAnswers(restoredAnswers);
      setNotes(restoredNotes);
      setPhotos(restoredPhotos);
      if (draft.general_comments) setGeneralComments(draft.general_comments);
      // Jump to first unanswered item
      const items = template?.items || [];
      const firstUnanswered = items.findIndex((item) => !restoredAnswers[item.id]);
      if (firstUnanswered > 0) setCurrentItem(firstUnanswered);
    }
    draftInitialized.current = true;
  }, [draftId, submissions, template?.items]);

  // Restore from draft-store when no ?draft= param
  const draftStoreInitialized = React.useRef(false);
  React.useEffect(() => {
    if (draftStoreInitialized.current || draftId || !template) return;
    draftStoreInitialized.current = true;
    const stored = getStoredDraft(checklistId);
    if (stored && stored.responses) {
      const saved = stored.responses as Record<string, { value?: unknown; comment?: string }>;
      const restoredAnswers: Record<string, string> = {};
      const restoredNotes: Record<string, string> = {};
      for (const [key, val] of Object.entries(saved)) {
        if (key === "__meta" || !val) continue;
        if (val.value === true) restoredAnswers[key] = "yes";
        else if (val.value === false) restoredAnswers[key] = "no";
        else if (val.value === null || val.value === "na") restoredAnswers[key] = "na";
        else if (val.value !== undefined) restoredAnswers[key] = String(val.value);
        if (val.comment) restoredNotes[key] = val.comment;
      }
      if (Object.keys(restoredAnswers).length > 0) {
        setAnswers(restoredAnswers);
        setNotes(restoredNotes);
        setDraftSavedAt(stored.updated_at);
        const items = template.items || [];
        const firstUnanswered = items.findIndex((item) => !restoredAnswers[item.id]);
        if (firstUnanswered > 0) setCurrentItem(firstUnanswered);
      }
    }
  }, [draftId, template, checklistId]);

  // Auto-save to draft-store every 10 seconds
  React.useEffect(() => {
    if (!template) return;
    const interval = setInterval(() => {
      const items = template.items || [];
      const answeredCount = Object.keys(answers).length;
      const progress = items.length > 0 ? Math.round((answeredCount / items.length) * 100) : 0;
      if (answeredCount === 0) return;

      const responsesMap: Record<string, { value: unknown; comment: string }> = {};
      for (const [key, val] of Object.entries(answers)) {
        responsesMap[key] = { value: val, comment: notes[key] || "" };
      }

      saveStoredDraft({
        id: checklistId,
        type: "checklist",
        template_id: checklistId,
        template_name: template.name,
        responses: responsesMap as Record<string, unknown>,
        progress,
        updated_at: new Date().toISOString(),
        created_at: getStoredDraft(checklistId)?.created_at || new Date().toISOString(),
      });
      setDraftSavedAt(new Date().toISOString());
    }, 10000);
    return () => clearInterval(interval);
  }, [template, checklistId, answers, notes]);

  if (isTemplatesLoading) {
    return <LoadingPage />;
  }

  if (!template) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Checklist not found"
        description="This checklist may have been removed or is no longer available."
        action={
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
        }
      />
    );
  }
  const items = template.items || [];
  const currentQuestion = items[currentItem];
  const isLastItem = currentItem === items.length - 1;
  const answeredCount = Object.keys(answers).length;
  
  // Submission data structure (matches ChecklistSubmission interface)
  const getSubmissionData = () => {
    const toResponseValue = (value: string): ChecklistResponse["value"] => {
      if (value === "yes" || value === "pass") return true;
      if (value === "no" || value === "fail") return false;
      if (value === "na") return null;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    };

    return {
      template_id: template.id,
      submitter_id: user?.id || "user_1",
      location_id: user?.location_id || null,
      responses: Object.entries(answers).map(([item_id, value]) => ({
        item_id,
        value: toResponseValue(value),
        comment: notes[item_id] || null,
        photo_urls: photos[item_id] || [],
      })),
      general_comments: generalComments || null,
      status: "submitted" as const,
      submitted_at: new Date().toISOString(),
    };
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !currentQuestion) return;
    
    const currentPhotos = photos[currentQuestion.id] || [];
    const remainingSlots = 2 - currentPhotos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) => ({
          ...prev,
          [currentQuestion.id]: [...(prev[currentQuestion.id] || []), reader.result as string],
        }));
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (questionId: string, index: number) => {
    setPhotos((prev) => ({
      ...prev,
      [questionId]: prev[questionId].filter((_, i) => i !== index),
    }));
  };

  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
    // Auto-advance for yes/no/na if not showing notes
    if (!showNotes[currentQuestion.id] && !isLastItem && value !== "no") {
      setTimeout(() => setCurrentItem(currentItem + 1), 300);
    }
  };

  const toggleNotes = () => {
    setShowNotes({ ...showNotes, [currentQuestion.id]: !showNotes[currentQuestion.id] });
  };

  const handleNext = () => {
    if (isLastItem) {
      handleSubmit();
    } else {
      setCurrentItem(currentItem + 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    if (!user) {
      toast("Unable to submit without a user session.");
      setIsSubmitting(false);
      return;
    }
    const now = new Date();
    const refNumber = `CHK-${now.getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
    const submission = getSubmissionData();
    try {
      await addSubmission({
        id: crypto.randomUUID(),
        company_id: user.company_id || currentCompany?.id || "",
        created_at: now.toISOString(),
        ...submission,
      });
      toast("Checklist submitted");
      deleteStoredDraft(checklistId);
      router.push(`/${company}/app/report/success?ref=${refNumber}&type=checklist`);
    } catch (err) {
      console.error("[Checklist] Submission failed:", err);
      toast("Failed to submit checklist. Please try again.", "error");
      setIsSubmitting(false);
    }
  };

  // Calculate progress
  const yesCount = Object.values(answers).filter((a) => a === "yes" || a === "pass").length;
  const noCount = Object.values(answers).filter((a) => a === "no" || a === "fail").length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-[60px] z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => currentItem > 0 ? setCurrentItem(currentItem - 1) : router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-sm line-clamp-1">{template.name}</h1>
            <p className="text-xs text-muted-foreground">
              {t("checklists.itemOf", { current: String(currentItem + 1), total: String(items.length) })}
            </p>
          </div>
          {draftSavedAt && (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {t("checklists.labels.draftSaved") || "Draft saved"} ✓
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted" role="progressbar" aria-label={t("common.completionProgress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((currentItem + 1) / items.length) * 100)}>
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentItem + 1) / items.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Current Item */}
      <div className="flex-1 p-4 pb-40">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm text-muted-foreground">{t("checklists.item", { number: String(currentItem + 1) })}</span>
        </div>

        <h2 className="text-xl font-semibold mb-8">{currentQuestion.question}</h2>

        {/* Answer buttons based on response type */}
        {currentQuestion.type === "yes_no_na" && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <button
              onClick={() => handleAnswer("yes")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                answers[currentQuestion.id] === "yes"
                  ? "border-success bg-success text-white"
                  : "border-border hover:border-success/50 active:bg-muted/50"
              )}
            >
              <Check className="h-8 w-8" />
              <span className="font-medium">{t("checklists.yes")}</span>
            </button>

            <button
              onClick={() => handleAnswer("no")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                answers[currentQuestion.id] === "no"
                  ? "border-destructive bg-destructive text-white"
                  : "border-border hover:border-destructive/50 active:bg-muted/50"
              )}
            >
              <X className="h-8 w-8" />
              <span className="font-medium">{t("checklists.no")}</span>
            </button>

            <button
              onClick={() => handleAnswer("na")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                answers[currentQuestion.id] === "na"
                  ? "border-muted-foreground bg-muted-foreground text-white"
                  : "border-border hover:border-muted-foreground/50 active:bg-muted/50"
              )}
            >
              <span className="text-2xl font-bold">{t("checklists.na")}</span>
              <span className="font-medium">{t("checklists.skip")}</span>
            </button>
          </div>
        )}

        {currentQuestion.type === "pass_fail" && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => handleAnswer("pass")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-6 transition-all",
                answers[currentQuestion.id] === "pass"
                  ? "border-success bg-success text-white"
                  : "border-border hover:border-success/50 active:bg-muted/50"
              )}
            >
              <Check className="h-10 w-10" />
              <span className="font-medium text-lg">{t("checklists.pass")}</span>
            </button>

            <button
              onClick={() => handleAnswer("fail")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-6 transition-all",
                answers[currentQuestion.id] === "fail"
                  ? "border-destructive bg-destructive text-white"
                  : "border-border hover:border-destructive/50 active:bg-muted/50"
              )}
            >
              <X className="h-10 w-10" />
              <span className="font-medium text-lg">{t("checklists.fail")}</span>
            </button>
          </div>
        )}

        {currentQuestion.type === "rating" && (
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleAnswer(String(rating))}
                className={cn(
                  "flex-1 rounded-xl border-2 py-4 text-xl font-bold transition-all",
                  answers[currentQuestion.id] === String(rating)
                    ? "border-primary bg-primary text-white"
                    : "border-border hover:border-primary/50 active:bg-muted/50"
                )}
              >
                {rating}
              </button>
            ))}
          </div>
        )}

        {currentQuestion.type === "text" && (
          <Textarea
            placeholder={t("checklists.enterResponse")}
            value={answers[currentQuestion.id] || ""}
            onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
            rows={4}
            className="mb-6"
          />
        )}

        {/* Add notes button */}
        <Button
          variant="ghost"
          className="w-full gap-2 text-muted-foreground"
          onClick={toggleNotes}
        >
          <MessageSquare className="h-4 w-4" />
          {showNotes[currentQuestion.id] ? t("checklists.hideNotes") : t("checklists.addNotes")}
        </Button>

        {showNotes[currentQuestion.id] && (
          <div className="mt-4">
            <Label>{t("checklists.notes")}</Label>
            <Textarea
              placeholder={t("checklists.addNotesPlaceholder")}
              value={notes[currentQuestion.id] || ""}
              onChange={(e) => setNotes({ ...notes, [currentQuestion.id]: e.target.value })}
              rows={3}
              className="mt-1"
            />
          </div>
        )}

        {/* Add photo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
          aria-label={t("common.uploadPhoto")}
        />
        
        {/* Photo previews */}
        {photos[currentQuestion.id]?.length > 0 && (
          <div className="flex gap-2 mt-4">
            {photos[currentQuestion.id].map((photo, index) => (
              <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                <img src={photo} alt={`Checklist response photo ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                <button
                  type="button"
                  aria-label={`Remove photo ${index + 1}`}
                  onClick={() => removePhoto(currentQuestion.id, index)}
                  className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <span className="text-xs">×</span>
                </button>
              </div>
            ))}
          </div>
        )}
        
        {(!photos[currentQuestion.id] || photos[currentQuestion.id].length < 2) && (
          <Button 
            variant="outline" 
            className="w-full gap-2 mt-4"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            {photos[currentQuestion.id]?.length ? t("checklists.addAnotherPhoto") : t("checklists.addPhoto")}
          </Button>
        )}

        {/* Summary */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-success/10 p-3">
            <p className="text-2xl font-bold text-success">{yesCount}</p>
            <p className="text-xs text-muted-foreground">{t("checklists.yesPass")}</p>
          </div>
          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-2xl font-bold text-destructive">{noCount}</p>
            <p className="text-xs text-muted-foreground">{t("checklists.noFail")}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-2xl font-bold">{items.length - answeredCount}</p>
            <p className="text-xs text-muted-foreground">{t("checklists.remaining")}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 pb-6 z-20 safe-area-inset-bottom">
        {answers[currentQuestion.id] && (
          <Button
            onClick={handleNext}
            disabled={isSubmitting}
            className="h-14 w-full gap-2 text-base"
          >
            {isSubmitting ? (
              t("checklists.submitting")
            ) : isLastItem ? (
              <>
                <CheckCircle className="h-5 w-5" />
                {t("checklists.completeChecklist")}
              </>
            ) : (
              <>
                {t("checklists.nextItem")}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
