"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Camera,
  Wrench,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAssetsStore } from "@/stores/assets-store";
import { useAssetInspectionsStore } from "@/stores/inspections-store";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { useToast } from "@/components/ui/toast";
import { INSPECTION_TEMPLATES, type AssetCategory } from "@/types";

// Fallback / default inspection items (used when template not available)
const defaultInspectionItems = [
  { id: "visual", label: "Visual inspection - no visible damage or wear", type: "checkbox" as const, required: true },
  { id: "safety_guards", label: "Safety guards are in place and functional", type: "checkbox" as const, required: true },
  { id: "controls", label: "Controls and switches work properly", type: "checkbox" as const, required: true },
  { id: "leaks", label: "No fluid leaks or spills", type: "checkbox" as const, required: true },
  { id: "labels", label: "Warning labels are visible and legible", type: "checkbox" as const, required: true },
  { id: "notes", label: "Notes / observations", type: "text" as const, required: false },
];

export default function AssetInspectionPage() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const assetId = routeParams.assetId as string;
  const [currentItem, setCurrentItem] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, "pass" | "fail" | "na">>({});
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [photos, setPhotos] = React.useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showNotes, setShowNotes] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { items: assets } = useAssetsStore();
  const { add: addInspection } = useAssetInspectionsStore();
  const { user } = useAuth();
  const { toast } = useToast();

  const { t } = useTranslation();

  const asset = assets.find((a) => a.id === assetId);
  
  // Get inspection template based on asset category
  const inspectionItems = React.useMemo(() => {
    if (!asset) return defaultInspectionItems;
    const categoryTemplate = INSPECTION_TEMPLATES[asset.category as AssetCategory];
    return categoryTemplate || defaultInspectionItems;
  }, [asset]);
  
  const currentQuestion = inspectionItems[currentItem];
  const isLastItem = currentItem === inspectionItems.length - 1;
  const answeredCount = Object.keys(answers).length;
  const passCount = Object.values(answers).filter((a) => a === "pass").length;
  const failCount = Object.values(answers).filter((a) => a === "fail").length;

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

  const handleAnswer = (value: "pass" | "fail" | "na") => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
    if (value === "fail") {
      setShowNotes(true);
    } else if (!isLastItem) {
      setTimeout(() => setCurrentItem(currentItem + 1), 300);
    }
  };

  const handleNext = () => {
    if (isLastItem) {
      handleSubmit();
    } else {
      setCurrentItem(currentItem + 1);
      setShowNotes(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    if (!user || !asset) {
      toast("Unable to submit without a valid user or asset.");
      setIsSubmitting(false);
      return;
    }
    const now = new Date();
    const refNumber = `INS-${now.getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
    const combinedNotes = Object.entries(notes)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n")
      .trim();
    const mediaUrls = Object.values(photos).flat();
    addInspection({
      id: `ins_${Date.now()}`,
      asset_id: asset.id,
      inspector_id: user.id,
      checklist_id: null,
      result: failCount > 0 ? "needs_attention" : "pass",
      notes: combinedNotes || null,
      media_urls: mediaUrls,
      incident_id: null,
      inspected_at: now.toISOString(),
      created_at: now.toISOString(),
    });
    toast("Inspection submitted");
    router.push(`/${company}/app/report/success?ref=${refNumber}&type=inspection`);
  };

  if (!asset) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t("inspection.assetNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => currentItem > 0 ? setCurrentItem(currentItem - 1) : router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-sm">{t("inspection.inspecting", { name: asset.name })}</h1>
            <p className="text-xs text-muted-foreground">
              {t("inspection.checkOf", { current: String(currentItem + 1), total: String(inspectionItems.length) })}
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted" role="progressbar" aria-label="Completion progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((currentItem + 1) / inspectionItems.length) * 100)}>
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentItem + 1) / inspectionItems.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Asset Info */}
      <div className="border-b bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Wrench className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{asset.name}</p>
            <p className="text-sm text-muted-foreground">
              {asset.serial_number} • {asset.category}
            </p>
          </div>
        </div>
      </div>

      {/* Current Check */}
      <div className="flex-1 p-4">
        <div className="mb-6">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary capitalize">
            {asset.category.replace("_", " ")}
          </span>
          {!currentQuestion.required && (
            <span className="ml-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Optional
            </span>
          )}
        </div>

        <h2 className="text-xl font-semibold mb-8">{currentQuestion.label}</h2>

        {/* For text/number type questions, show input instead of pass/fail */}
        {currentQuestion.type === "text" || currentQuestion.type === "number" ? (
          <div className="space-y-3 mb-6">
            {currentQuestion.type === "text" ? (
              <Textarea
                placeholder={t("inspection.enterNotes")}
                value={notes[currentQuestion.id] || ""}
                onChange={(e) => setNotes({ ...notes, [currentQuestion.id]: e.target.value })}
                rows={4}
              />
            ) : (
              <input
                type="number"
                placeholder={t("inspection.enterValue")}
                value={notes[currentQuestion.id] || ""}
                onChange={(e) => setNotes({ ...notes, [currentQuestion.id]: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-lg"
              />
            )}
            <Button 
              className="w-full" 
              onClick={() => {
                setAnswers({ ...answers, [currentQuestion.id]: "pass" });
                if (!isLastItem) setTimeout(() => setCurrentItem(currentItem + 1), 300);
              }}
            >
              {isLastItem ? t("common.submit") : t("common.next")}
            </Button>
          </div>
        ) : currentQuestion.type === "rating" && currentQuestion.options ? (
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-2 gap-2">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={option}
                  onClick={() => {
                    setNotes({ ...notes, [currentQuestion.id]: option });
                    setAnswers({ ...answers, [currentQuestion.id]: idx >= currentQuestion.options!.length / 2 ? "pass" : "fail" });
                    if (!isLastItem) setTimeout(() => setCurrentItem(currentItem + 1), 300);
                  }}
                  className={cn(
                    "rounded-lg border-2 p-3 text-sm font-medium transition-all",
                    notes[currentQuestion.id] === option
                      ? "border-primary bg-primary text-white"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Answer buttons for checkbox type */
          <div className="grid grid-cols-3 gap-3 mb-6">
            <button
              onClick={() => handleAnswer("pass")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                answers[currentQuestion.id] === "pass"
                  ? "border-success bg-success text-white"
                  : "border-border hover:border-success/50"
              )}
            >
              <Check className="h-8 w-8" />
              <span className="font-medium">{t("checklists.pass")}</span>
            </button>

            <button
              onClick={() => handleAnswer("fail")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                answers[currentQuestion.id] === "fail"
                  ? "border-destructive bg-destructive text-white"
                  : "border-border hover:border-destructive/50"
              )}
            >
              <X className="h-8 w-8" />
              <span className="font-medium">{t("checklists.fail")}</span>
            </button>

            <button
              onClick={() => handleAnswer("na")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                answers[currentQuestion.id] === "na"
                  ? "border-muted-foreground bg-muted-foreground text-white"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <span className="text-2xl font-bold">{t("checklists.na")}</span>
              <span className="font-medium">{t("checklists.skip")}</span>
            </button>
          </div>
        )}

        {/* Notes for failed items - only for checkbox type */}
        {currentQuestion.type === "checkbox" && (showNotes || answers[currentQuestion.id] === "fail") && (
          <div className="space-y-2 mb-6">
            <Label>{t("inspection.notesRequiredForFailed")}</Label>
            <Textarea
              placeholder={t("inspection.describeIssue")}
              value={notes[currentQuestion.id] || ""}
              onChange={(e) => setNotes({ ...notes, [currentQuestion.id]: e.target.value })}
              rows={3}
            />
          </div>
        )}

        {/* Photo upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoUpload}
          className="hidden"
          aria-label="Upload photo"
        />
        
        {/* Photo previews */}
        {photos[currentQuestion.id]?.length > 0 && (
          <div className="flex gap-2 mb-2">
            {photos[currentQuestion.id].map((photo, index) => (
              <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                <img src={photo} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
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
            className="w-full gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            {photos[currentQuestion.id]?.length ? t("checklists.addAnotherPhoto") : t("checklists.addPhoto")}
          </Button>
        )}

        {/* Summary */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-success/10 p-3">
            <p className="text-2xl font-bold text-success">{passCount}</p>
            <p className="text-xs text-muted-foreground">{t("inspection.passed")}</p>
          </div>
          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-2xl font-bold text-destructive">{failCount}</p>
            <p className="text-xs text-muted-foreground">{t("inspection.failed")}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-2xl font-bold">{inspectionItems.length - answeredCount}</p>
            <p className="text-xs text-muted-foreground">{t("checklists.remaining")}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-16 left-0 right-0 border-t bg-background p-4 z-20">
        {answers[currentQuestion.id] && (
          <Button
            onClick={handleNext}
            disabled={isSubmitting || (answers[currentQuestion.id] === "fail" && !notes[currentQuestion.id])}
            className="h-14 w-full gap-2 text-base"
          >
            {isSubmitting ? (
              t("checklists.submitting")
            ) : isLastItem ? (
              <>
                <CheckCircle className="h-5 w-5" />
                {t("inspection.completeInspection")}
              </>
            ) : (
              <>
                {t("inspection.nextCheck")}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
