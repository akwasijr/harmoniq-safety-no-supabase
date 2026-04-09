"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Camera,
  ClipboardCheck,
  Check,
  X,
  MessageSquare,
  Package,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { useToast } from "@/components/ui/toast";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import type { ChecklistResponse } from "@/types";
import { getProcedureTemplateIdForType } from "@/data/work-order-procedure-templates";

export default function WorkOrderProcedurePage() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const orderId = routeParams.orderId as string;
  const [currentItem, setCurrentItem] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [photos, setPhotos] = React.useState<Record<string, string[]>>({});
  const [showNotes, setShowNotes] = React.useState<Record<string, boolean>>({});
  const [generalComments, setGeneralComments] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { items: templates, isLoading: isTemplatesLoading } = useChecklistTemplatesStore();
  const { add: addSubmission, update: updateSubmission, items: submissions } = useChecklistSubmissionsStore();
  const { items: workOrders, update: updateWorkOrder } = useWorkOrdersStore();
  const { items: assets } = useAssetsStore();
  const { items: locations } = useLocationsStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const order = workOrders.find((item) => item.id === orderId && item.company_id === user?.company_id);
  const asset = order?.asset_id ? assets.find((item) => item.id === order.asset_id) : null;
  const directLocation = order?.location_id ? locations.find((item) => item.id === order.location_id) : null;
  const assetLocation = asset?.location_id ? locations.find((item) => item.id === asset.location_id) : null;
  const location = directLocation ?? assetLocation;
  const templateId = order?.checklist_template_id || (order ? getProcedureTemplateIdForType(order.type) : undefined);
  const template = templateId ? templates.find((tpl) => tpl.id === templateId) : undefined;
  const existingSubmission = order?.checklist_submission_id ? submissions.find((item) => item.id === order.checklist_submission_id) : null;

  React.useEffect(() => {
    if (!existingSubmission || existingSubmission.status !== "draft") return;
    const restoredAnswers: Record<string, string> = {};
    const restoredNotes: Record<string, string> = {};
    const restoredPhotos: Record<string, string[]> = {};
    for (const response of existingSubmission.responses || []) {
      if (response.value === true) restoredAnswers[response.item_id] = "yes";
      else if (response.value === false) restoredAnswers[response.item_id] = "no";
      else if (response.value === null || response.value === "na" || response.value === "n/a") restoredAnswers[response.item_id] = "na";
      else if (typeof response.value === "number") restoredAnswers[response.item_id] = String(response.value);
      else if (typeof response.value === "string") restoredAnswers[response.item_id] = response.value;
      if (response.comment) restoredNotes[response.item_id] = response.comment;
      if (response.photo_urls?.length) restoredPhotos[response.item_id] = response.photo_urls;
    }
    setAnswers(restoredAnswers);
    setNotes(restoredNotes);
    setPhotos(restoredPhotos);
    setGeneralComments(existingSubmission.general_comments || "");
  }, [existingSubmission]);

  if (isTemplatesLoading || !order) {
    return <LoadingPage />;
  }

  if (!order || !template) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Procedure not available"
        description="This work order does not have an attached checklist procedure yet."
        action={<Button variant="outline" onClick={() => router.back()}>Go back</Button>}
      />
    );
  }

  if (order.status === "completed" && existingSubmission?.status === "submitted") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-30 border-b bg-background">
          <div className="flex h-14 items-center gap-4 px-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-sm font-semibold line-clamp-1">{order.title}</h1>
              <p className="text-xs text-muted-foreground">Procedure already completed</p>
            </div>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState compact icon={CheckCircle} title="Procedure completed" description="This work order has already been submitted." action={<Button onClick={() => router.push(`/${company}/app/tasks/work-orders/${order.id}`)}>Back to work order</Button>} />
        </div>
      </div>
    );
  }

  const items = template.items || [];
  const currentQuestion = items[currentItem];
  const isLastItem = currentItem === items.length - 1;
  const answeredCount = Object.keys(answers).length;

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
        location_id: order?.location_id || asset?.location_id || user?.location_id || null,
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
    if (!showNotes[currentQuestion.id] && !isLastItem && value !== "no") {
      setTimeout(() => setCurrentItem(currentItem + 1), 300);
    }
  };

  const toggleNotes = () => setShowNotes({ ...showNotes, [currentQuestion.id]: !showNotes[currentQuestion.id] });

  const handleNext = () => {
    if (isLastItem) {
      void handleSubmit();
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
    const submissionId = existingSubmission?.id || crypto.randomUUID();
    const submissionPayload = {
      id: submissionId,
      company_id: user.company_id || "",
      created_at: existingSubmission?.created_at || now.toISOString(),
      ...getSubmissionData(),
    };

    try {
      if (existingSubmission) {
        updateSubmission(submissionId, submissionPayload);
      } else {
        addSubmission(submissionPayload);
      }
      updateWorkOrder(order.id, {
        checklist_submission_id: submissionId,
        status: "completed",
        completed_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
      toast("Work order submitted");
      router.push(`/${company}/app/report/success?ref=WO-${order.id.slice(0, 8).toUpperCase()}&type=work-order`);
    } catch (err) {
      console.error("[Work Order Procedure] Submission failed:", err);
      toast("Failed to submit work order. Please try again.", "error");
      setIsSubmitting(false);
    }
  };

  const yesCount = Object.values(answers).filter((a) => a === "yes" || a === "pass").length;
  const noCount = Object.values(answers).filter((a) => a === "no" || a === "fail").length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => currentItem > 0 ? setCurrentItem(currentItem - 1) : router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="line-clamp-1 text-sm font-semibold">{order.title}</h1>
            <p className="text-xs text-muted-foreground">{template.name} · {currentItem + 1} of {items.length}</p>
          </div>
        </div>
        <div className="h-1 bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((currentItem + 1) / items.length) * 100)}>
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((currentItem + 1) / items.length) * 100}%` }} />
        </div>
      </header>

      <div className="flex-1 p-4 pb-56">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm text-muted-foreground">Procedure item {currentItem + 1}</span>
        </div>

        <h2 className="mb-8 text-xl font-semibold">{currentQuestion.question}</h2>

        {currentQuestion.type === "yes_no_na" && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            <button onClick={() => handleAnswer("yes")} className={cn("flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all", answers[currentQuestion.id] === "yes" ? "border-success bg-success text-white" : "border-border hover:border-success/50 active:bg-muted/50")}>
              <Check className="h-8 w-8" />
              <span className="font-medium">{t("checklists.yes")}</span>
            </button>
            <button onClick={() => handleAnswer("no")} className={cn("flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all", answers[currentQuestion.id] === "no" ? "border-destructive bg-destructive text-white" : "border-border hover:border-destructive/50 active:bg-muted/50")}>
              <X className="h-8 w-8" />
              <span className="font-medium">{t("checklists.no")}</span>
            </button>
            <button onClick={() => handleAnswer("na")} className={cn("flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all", answers[currentQuestion.id] === "na" ? "border-muted-foreground bg-muted-foreground text-white" : "border-border hover:border-muted-foreground/50 active:bg-muted/50")}>
              <span className="text-2xl font-bold">{t("checklists.na")}</span>
              <span className="font-medium">{t("checklists.skip")}</span>
            </button>
          </div>
        )}

        {currentQuestion.type === "pass_fail" && (
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button onClick={() => handleAnswer("pass")} className={cn("flex flex-col items-center gap-2 rounded-xl border-2 p-6 transition-all", answers[currentQuestion.id] === "pass" ? "border-success bg-success text-white" : "border-border hover:border-success/50 active:bg-muted/50")}>
              <Check className="h-10 w-10" />
              <span className="font-medium text-lg">{t("checklists.pass")}</span>
            </button>
            <button onClick={() => handleAnswer("fail")} className={cn("flex flex-col items-center gap-2 rounded-xl border-2 p-6 transition-all", answers[currentQuestion.id] === "fail" ? "border-destructive bg-destructive text-white" : "border-border hover:border-destructive/50 active:bg-muted/50")}>
              <X className="h-10 w-10" />
              <span className="font-medium text-lg">{t("checklists.fail")}</span>
            </button>
          </div>
        )}

        {currentQuestion.type === "rating" && (
          <div className="mb-6 flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button key={rating} onClick={() => handleAnswer(String(rating))} className={cn("flex-1 rounded-xl border-2 py-4 text-xl font-bold transition-all", answers[currentQuestion.id] === String(rating) ? "border-primary bg-primary text-white" : "border-border hover:border-primary/50 active:bg-muted/50")}>{rating}</button>
            ))}
          </div>
        )}

        {currentQuestion.type === "text" && (
          <Textarea placeholder={t("checklists.enterResponse")} value={answers[currentQuestion.id] || ""} onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })} rows={4} className="mb-6" />
        )}

        <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={toggleNotes}>
          <MessageSquare className="h-4 w-4" />
          {showNotes[currentQuestion.id] ? t("checklists.hideNotes") : t("checklists.addNotes")}
        </Button>

        {showNotes[currentQuestion.id] && (
          <div className="mt-4">
            <Label>{t("checklists.notes")}</Label>
            <Textarea placeholder={t("checklists.addNotesPlaceholder")} value={notes[currentQuestion.id] || ""} onChange={(e) => setNotes({ ...notes, [currentQuestion.id]: e.target.value })} rows={3} className="mt-1" />
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" aria-label={t("common.uploadPhoto")} />

        {photos[currentQuestion.id]?.length > 0 && (
          <div className="mt-4 flex gap-2">
            {photos[currentQuestion.id].map((photo, index) => (
              <div key={index} className="relative h-16 w-16 overflow-hidden rounded-lg border">
                <img src={photo} alt={`Work order response photo ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                <button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => removePhoto(currentQuestion.id, index)} className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"><span className="text-xs">×</span></button>
              </div>
            ))}
          </div>
        )}

        {(!photos[currentQuestion.id] || photos[currentQuestion.id].length < 2) && (
          <Button variant="outline" className="mt-4 w-full gap-2" onClick={() => fileInputRef.current?.click()}>
            <Camera className="h-4 w-4" />
            {photos[currentQuestion.id]?.length ? t("checklists.addAnotherPhoto") : t("checklists.addPhoto")}
          </Button>
        )}

        {isLastItem && (
          <div className="mt-6">
            <Label>Final remarks</Label>
            <Textarea
              placeholder="Add end remarks, findings, or handover notes"
              value={generalComments}
              onChange={(e) => setGeneralComments(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>
        )}

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

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background p-4 pb-[calc(env(safe-area-inset-bottom,0px)+80px)]">
        {answers[currentQuestion.id] && (
          <Button onClick={handleNext} disabled={isSubmitting} size="xl" className="w-full gap-2">
            {isSubmitting ? t("checklists.submitting") : isLastItem ? <><CheckCircle className="h-5 w-5" />Submit work order</> : <>{t("checklists.nextItem")}<ArrowRight className="h-5 w-5" /></>}
          </Button>
        )}
      </div>
    </div>
  );
}
