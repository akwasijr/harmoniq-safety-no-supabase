"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Tag,
  Share2,
  Bookmark,
  BookmarkCheck,
  FileText,
  Download,
  CalendarPlus,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContentStore } from "@/stores/content-store";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { sanitizeHtml } from "@/lib/sanitize";

export default function NewsDetailPage() {
  const router = useRouter();
  const params = useParams();
  const newsId = params.newsId as string;
  const [isBookmarked, setIsBookmarked] = React.useState(false);
  const [showShareSuccess, setShowShareSuccess] = React.useState(false);
  const [showDownloadSuccess, setShowDownloadSuccess] = React.useState(false);
  const { t, formatDate } = useTranslation();
  const { items: contentItems } = useContentStore();
  const { toast } = useToast();

  // Load bookmark state from localStorage
  React.useEffect(() => {
    if (newsId && typeof window !== "undefined") {
      try {
        const bookmarks = JSON.parse(localStorage.getItem("harmoniq_bookmarks") || "[]");
        setIsBookmarked(bookmarks.includes(newsId));
      } catch {
        // Invalid JSON, ignore
        setIsBookmarked(false);
      }
    }
  }, [newsId]);

  const article = contentItems.find((c) => c.id === newsId);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 2000);
    } catch {
      toast("Unable to copy link");
    }
  };

  const handleShare = async () => {
    if (!article) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.content?.substring(0, 100) || article.title,
          url: window.location.href,
        });
      } catch {
        // User cancelled or error - fall back to clipboard
        await copyToClipboard();
      }
    } else {
      // Fallback: copy to clipboard
      await copyToClipboard();
    }
  };

  const handleBookmark = () => {
    if (typeof window === "undefined") return;
    
    let bookmarks: string[] = [];
    try {
      bookmarks = JSON.parse(localStorage.getItem("harmoniq_bookmarks") || "[]");
    } catch {
      // Invalid JSON in localStorage, reset
      bookmarks = [];
    }
    
    if (isBookmarked) {
      const newBookmarks = bookmarks.filter((id: string) => id !== newsId);
      localStorage.setItem("harmoniq_bookmarks", JSON.stringify(newBookmarks));
      setIsBookmarked(false);
    } else {
      bookmarks.push(newsId);
      localStorage.setItem("harmoniq_bookmarks", JSON.stringify(bookmarks));
      setIsBookmarked(true);
    }
  };

  const handleDownload = () => {
    if (!article) return;
    // Simulate download - in production this would fetch actual file
    setShowDownloadSuccess(true);
    setTimeout(() => setShowDownloadSuccess(false), 2000);
    
    // Create a simple text file as demo
    const content = `${article.title}\n\n${article.content || "No content available."}\n\nDownloaded from Harmoniq Safety`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${article.title.replace(/[^a-z0-9]/gi, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddToCalendar = () => {
    if (!article) return;
    // Generate ICS file for calendar
    const eventDate = new Date(article.published_at || article.created_at);
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 1);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };
    
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Harmoniq Safety//Event//EN",
      "BEGIN:VEVENT",
      `DTSTART:${formatDate(eventDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${article.title}`,
      `DESCRIPTION:${article.content?.substring(0, 200) || "Company event"}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    
    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${article.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!article) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t("newsApp.articleNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <span className="text-sm text-muted-foreground capitalize">{article.type}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleShare}
            className="relative"
          >
            {showShareSuccess ? (
              <Check className="h-5 w-5 text-success" />
            ) : (
              <Share2 className="h-5 w-5" />
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBookmark}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-5 w-5 text-primary fill-primary" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1">
        {/* Hero image */}
        {article.featured_image ? (
          <div className="h-48 overflow-hidden">
            <img 
              src={article.featured_image} 
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <FileText className="h-16 w-16 text-primary/30" />
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(new Date(article.published_at || article.created_at))}</span>
            </div>
            {article.category && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {article.category}
              </span>
            )}
            <span className="text-xs text-muted-foreground capitalize">{article.type}</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold">{article.title}</h1>

          {/* Body */}
          <div className="prose prose-sm max-w-none">
            <div
              className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content || "") }}
            />

            {/* Key Points — extracted from content sentences */}
            {article.content && article.content.length > 50 && (() => {
              // Strip HTML tags before extracting sentences
              const plainText = article.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
              const sentences = plainText
                .split(/[.!?]+/)
                .map((s) => s.trim())
                .filter((s) => s.length > 15 && s.length < 120);
              const keyPoints = sentences.slice(0, Math.min(4, sentences.length));
              if (keyPoints.length === 0) return null;
              return (
                <>
                  <h3 className="text-lg font-semibold mt-6 mb-2">{t("newsApp.keyPoints")}</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    {keyPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </>
              );
            })()}

            <h3 className="text-lg font-semibold mt-6 mb-2">{t("newsApp.nextSteps")}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {t("newsApp.nextStepsDesc")}
            </p>
          </div>

          {/* Related documents (if type is document/training) */}
          {(article.type === "document" || article.type === "training") && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-3">{t("newsApp.attachments")}</h3>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={handleDownload}
              >
                {showDownloadSuccess ? (
                  <>
                    <Check className="h-4 w-4 text-success" />
                    {t("newsApp.downloaded")}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    {t("newsApp.downloadDocument")}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer for events */}
      {article.type === "event" && (
        <div className="fixed bottom-16 left-0 right-0 border-t bg-background p-4 z-20">
          <Button className="w-full h-12 gap-2" onClick={handleAddToCalendar}>
            <CalendarPlus className="h-5 w-5" />
            {t("newsApp.addToCalendar")}
          </Button>
        </div>
      )}
    </div>
  );
}
