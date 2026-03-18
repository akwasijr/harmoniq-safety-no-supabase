"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Calendar,
  FolderOpen,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { useContentStore } from "@/stores/content-store";
import { useCompanyParam } from "@/hooks/use-company-param";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import type { Content } from "@/types";

// ---------------------------------------------------------------------------
// Carousel component — reusable per content section
// ---------------------------------------------------------------------------

const CARD_COLORS = [
  "from-blue-500/20 to-blue-600/10",
  "from-emerald-500/20 to-emerald-600/10",
  "from-amber-500/20 to-amber-600/10",
  "from-violet-500/20 to-violet-600/10",
  "from-rose-500/20 to-rose-600/10",
];

function ContentCarousel({
  items,
  company,
  title,
  icon: Icon,
  t,
  formatDate,
}: {
  items: Content[];
  company: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  t: (key: string) => string;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const scroll = (dir: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    const cardWidth = container.offsetWidth * 0.72;
    const newIndex = dir === "left" ? Math.max(0, activeIndex - 1) : Math.min(items.length - 1, activeIndex + 1);
    container.scrollTo({ left: newIndex * cardWidth, behavior: "smooth" });
    setActiveIndex(newIndex);
  };

  React.useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      const cardWidth = container.offsetWidth * 0.72;
      const idx = Math.round(container.scrollLeft / cardWidth);
      setActiveIndex(idx);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Section header with arrows */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-bold">{title}</h2>
          <span className="text-[11px] text-muted-foreground">({items.length})</span>
        </div>
        {items.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={activeIndex === 0}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border transition-colors disabled:opacity-30 hover:bg-muted"
              aria-label="Previous"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={activeIndex === items.length - 1}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border transition-colors disabled:opacity-30 hover:bg-muted"
              aria-label="Next"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Scrollable cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((item, i) => (
          <Link
            key={item.id}
            href={`/${company}/app/news/${item.id}`}
            className="flex-shrink-0 snap-center rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-md active:shadow-sm"
            style={{ width: "72%" }}
          >
            <div className={`h-28 w-full bg-gradient-to-br ${CARD_COLORS[i % CARD_COLORS.length]} relative overflow-hidden`}>
              {item.featured_image ? (
                <img src={item.featured_image} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Icon className="h-8 w-8 text-foreground/10" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="px-3 py-2.5 space-y-1">
              <h3 className="font-semibold text-xs leading-snug line-clamp-2">{item.title}</h3>
              {item.content && (
                <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">
                  {item.content.replace(/<[^>]*>/g, "").slice(0, 120)}
                </p>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(new Date(item.published_at || item.created_at))}
                </span>
                <span className="text-xs font-medium text-primary flex items-center gap-0.5">
                  {t("common.readMore") || "Read more"} <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {items.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/20"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function EmployeeNewsPage() {
  const company = useCompanyParam();
  const { t, formatDate } = useTranslation();

  const { items: contentItems, isLoading } = useContentStore();
  const content = contentItems.filter((c) => c.status === "published");

  const news = content.filter((c) => c.type === "news");
  const events = content.filter((c) => c.type === "event");
  const training = content.filter((c) => c.type === "training");
  const documents = content.filter((c) => c.type === "document");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const hasAnyContent = news.length > 0 || events.length > 0 || training.length > 0 || documents.length > 0;

  return (
    <div className="flex flex-col min-h-full pb-20">
      <div className="sticky top-14 z-10 bg-background border-b px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold">{t("newsApp.title")}</h1>
      </div>

      <div className="flex-1 px-4 pt-4 space-y-6">
        {!hasAnyContent ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-semibold">{t("newsApp.empty.noContent")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("newsApp.empty.checkBackLater")}</p>
          </div>
        ) : (
          <>
            {news.length > 0 && (
              <ContentCarousel items={news} company={company} title={t("newsApp.tabs.news")} icon={Newspaper} t={t} formatDate={formatDate} />
            )}
            {events.length > 0 && (
              <ContentCarousel items={events} company={company} title={t("newsApp.tabs.events")} icon={Calendar} t={t} formatDate={formatDate} />
            )}
            {training.length > 0 && (
              <ContentCarousel items={training} company={company} title={t("newsApp.tabs.training")} icon={GraduationCap} t={t} formatDate={formatDate} />
            )}
            {documents.length > 0 && (
              <ContentCarousel items={documents} company={company} title={t("newsApp.tabs.documents")} icon={FolderOpen} t={t} formatDate={formatDate} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
