"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Eye,
  FileText,
  Image,
  Newspaper,
  FolderOpen,
  HelpCircle,
  GraduationCap,
  CalendarDays,
  Check,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Upload,
  Clock,
  Globe,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useContentStore } from "@/stores/content-store";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyStore } from "@/stores/company-store";
import type { Content } from "@/types";
import { useTranslation } from "@/i18n";
import { DEFAULT_COMPANY_ID, DEFAULT_USER_ID } from "@/mocks/data";

const contentTypes = [
  { value: "news", label: "News Article", icon: Newspaper, description: "Company news and announcements" },
  { value: "document", label: "Document", icon: FolderOpen, description: "Policies, manuals, SOPs" },
  { value: "faq", label: "FAQ", icon: HelpCircle, description: "Frequently asked questions" },
  { value: "training", label: "Training", icon: GraduationCap, description: "Training materials and videos" },
  { value: "event", label: "Event", icon: CalendarDays, description: "Safety events and drills" },
];

const steps = [
  { id: 1, title: "Content Type", description: "Choose what you're creating" },
  { id: 2, title: "Details", description: "Add title and content" },
  { id: 3, title: "Media", description: "Upload images and files" },
  { id: 4, title: "Publish", description: "Review and publish" },
];

export default function NewContentPage() {
  const { t, formatDate } = useTranslation();
  const router = useRouter();
  const company = useCompanyParam();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showLinkInput, setShowLinkInput] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const editorRef = React.useRef<HTMLDivElement>(null);
  const { add: addContent } = useContentStore();
  const { toast } = useToast();
  const { user } = useAuth();
  const { items: companies } = useCompanyStore();
  const companyId = (companies.find((c) => c.slug === company) || companies[0])?.id || DEFAULT_COMPANY_ID;
  
  const [formData, setFormData] = React.useState({
    type: "",
    title: "",
    content: "",
    category: "",
    publish_now: true,
    scheduled_date: "",
    event_date: "",
    event_time: "",
    send_notification: false,
    all_employees: true,
  });

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleSubmit = async (publish: boolean) => {
    setIsSubmitting(true);
    const now = new Date().toISOString();
    const contentItem: Content = {
      id: `content_${Date.now()}`,
      company_id: companyId,
      type: formData.type as Content["type"],
      title: formData.title,
      content: formData.content || null,
      file_url: null,
      video_url: null,
      question: formData.type === "faq" ? formData.title : null,
      answer: formData.type === "faq" ? formData.content || null : null,
      event_date: formData.type === "event" ? formData.event_date || null : null,
      event_time: formData.type === "event" ? formData.event_time || null : null,
      event_location: null,
      category: formData.category || null,
      featured_image: null,
      status: publish ? "published" : "draft",
      published_at: publish ? now : null,
      scheduled_for: !publish && formData.scheduled_date ? formData.scheduled_date : null,
      created_by: user?.id || DEFAULT_USER_ID,
      created_at: now,
      updated_at: now,
    };
    addContent(contentItem);
    toast(publish ? "Content published" : "Content saved");
    router.push(`/${company}/dashboard/content`);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.type !== "";
      case 2:
        return formData.title.trim() !== "";
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const selectedType = contentTypes.find(t => t.value === formData.type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Create Content</h1>
          <p className="text-sm text-muted-foreground">
            {steps[currentStep - 1].description}
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <button
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 font-medium transition-all",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary",
                    !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : step.id}
                </button>
                <span className={cn(
                  "mt-2 text-xs font-medium hidden sm:block",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-2",
                  isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="max-w-3xl mx-auto">
        {/* Step 1: Content Type */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>What type of content are you creating?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.type === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={cn(
                        "flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all text-center",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <Icon className={cn("h-8 w-8", isSelected ? "text-primary-foreground" : "text-muted-foreground")} />
                      <div>
                        <p className="font-semibold">{type.label}</p>
                        <p className={cn("text-xs mt-1", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {type.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {selectedType && <selectedType.icon className="h-5 w-5" />}
                  {formData.type === "faq" ? "FAQ Details" : `${selectedType?.label || "Content"} Details`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">
                    {formData.type === "faq" ? "Question" : "Title"} *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={formData.type === "faq" ? "Enter the frequently asked question" : "Enter a descriptive title"}
                    className="mt-1 text-lg"
                  />
                </div>

                <div>
                  <Label>
                    {formData.type === "faq" ? "Answer" : "Content"} *
                  </Label>
                  
                  {/* Formatting Toolbar */}
                  <div className="mt-1 flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 bg-muted/50 p-2">
                    <button
                      type="button"
                      onClick={() => handleFormat("bold")}
                      className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
                      title="Bold"
                    >
                      <Bold className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormat("italic")}
                      className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
                      title="Italic"
                    >
                      <Italic className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormat("underline")}
                      className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
                      title="Underline"
                    >
                      <Underline className="h-4 w-4" />
                    </button>
                    <div className="mx-1 h-6 w-px bg-border" />
                    <button
                      type="button"
                      onClick={() => handleFormat("insertUnorderedList")}
                      className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
                      title="Bullet List"
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormat("insertOrderedList")}
                      className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
                      title="Numbered List"
                    >
                      <ListOrdered className="h-4 w-4" />
                    </button>
                    <div className="mx-1 h-6 w-px bg-border" />
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowLinkInput(!showLinkInput)}
                        className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
                        title="Insert Link"
                      >
                        <Link className="h-4 w-4" />
                      </button>
                      {showLinkInput && (
                        <div className="absolute top-full left-0 z-10 mt-1 flex gap-1 rounded-md border bg-background p-2 shadow-md">
                          <input
                            type="url"
                            placeholder="https://..."
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && linkUrl) {
                                handleFormat("createLink", linkUrl);
                                setLinkUrl("");
                                setShowLinkInput(false);
                              } else if (e.key === "Escape") {
                                setShowLinkInput(false);
                                setLinkUrl("");
                              }
                            }}
                            className="h-8 w-48 rounded border bg-background px-2 text-sm"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (linkUrl) {
                                handleFormat("createLink", linkUrl);
                                setLinkUrl("");
                                setShowLinkInput(false);
                              }
                            }}
                            className="h-8 rounded bg-primary px-2 text-xs text-primary-foreground"
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Editable Content Area */}
                  <div
                    ref={editorRef}
                    contentEditable
                    onInput={(e) => setFormData({ ...formData, content: sanitizeHtml(e.currentTarget.innerHTML) })}
                    className="min-h-[200px] rounded-b-md border bg-background p-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 prose prose-sm max-w-none"
                    style={{ minHeight: "200px" }}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use the toolbar above to format your text
                  </p>
                </div>

                <div>
                  <Label htmlFor="category">Category (optional)</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Safety, Training, Policy"
                    className="mt-1"
                  />
                </div>

                {formData.type === "event" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="event_date">Event Date *</Label>
                      <Input
                        id="event_date"
                        type="date"
                        value={formData.event_date}
                        onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="event_time">Event Time</Label>
                      <Input
                        id="event_time"
                        type="time"
                        value={formData.event_time}
                        onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Media */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Featured Image */}
            {(formData.type === "news" || formData.type === "event" || formData.type === "training") && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Featured Image
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
                    <div className="text-center">
                      <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                      <p className="mt-2 text-sm font-medium">Click to upload image</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* File Attachment */}
            {(formData.type === "document" || formData.type === "training") && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    File Attachment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
                    <div className="text-center">
                      <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                      <p className="mt-2 text-sm font-medium">Click to upload file</p>
                      <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, XLS up to 10MB</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No media needed */}
            {formData.type === "faq" && (
              <Card className="bg-muted/50">
                <CardContent className="py-12 text-center">
                  <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">
                    FAQs don&apos;t require media attachments.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You can proceed to the next step.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 4: Publish */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  {selectedType && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <selectedType.icon className="h-3 w-3" />
                      {selectedType.label}
                    </span>
                  )}
                  {formData.category && (
                    <span className="text-sm text-muted-foreground">{formData.category}</span>
                  )}
                </div>
                <h2 className="text-xl font-semibold">{formData.title || "Untitled"}</h2>
                {formData.content && (
                  <div 
                    className="prose prose-sm max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.content) }}
                  />
                )}
                {formData.type === "event" && formData.event_date && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(formData.event_date)}
                    {formData.event_time && ` at ${formData.event_time}`}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Publishing Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Publishing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="publish_now"
                    checked={formData.publish_now}
                    onChange={() => setFormData({ ...formData, publish_now: true })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="publish_now" className="cursor-pointer">
                    Publish immediately
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="schedule"
                    checked={!formData.publish_now}
                    onChange={() => setFormData({ ...formData, publish_now: false })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="schedule" className="cursor-pointer">
                    Schedule for later
                  </Label>
                </div>
                {!formData.publish_now && (
                  <div className="pl-7">
                    <Input
                      type="datetime-local"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Visibility */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Visibility & Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="all_employees" 
                    checked={formData.all_employees}
                    onChange={(e) => setFormData({ ...formData, all_employees: e.target.checked })}
                    className="h-4 w-4" 
                  />
                  <Label htmlFor="all_employees" className="cursor-pointer">
                    Visible to all employees
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="send_notification" 
                    checked={formData.send_notification}
                    onChange={(e) => setFormData({ ...formData, send_notification: e.target.checked })}
                    className="h-4 w-4" 
                  />
                  <Label htmlFor="send_notification" className="cursor-pointer flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Send push notification to employees
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => prev - 1)}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Button>

          <div className="flex gap-2">
            {currentStep === 4 ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => handleSubmit(false)} 
                  disabled={isSubmitting}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button 
                  onClick={() => handleSubmit(true)} 
                  disabled={isSubmitting || !formData.title}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {formData.publish_now ? "Publish Now" : "Schedule"}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                disabled={!canProceed()}
                className="gap-2"
              >
                {t("common.next")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
