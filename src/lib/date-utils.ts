// Date range filtering utilities

export type DateRangeValue = 
  | "today" 
  | "yesterday" 
  | "last_7_days" 
  | "last_30_days" 
  | "last_90_days" 
  | "last_6_months" 
  | "all_time" 
  | "custom";

export interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRangeFromValue(
  value: DateRangeValue,
  customStart?: string,
  customEnd?: string
): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  switch (value) {
    case "today":
      return { start: today, end };

    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);
      return { start: yesterday, end: yesterdayEnd };
    }

    case "last_7_days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return { start, end };
    }

    case "last_30_days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return { start, end };
    }

    case "last_90_days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 90);
      return { start, end };
    }

    case "last_6_months": {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 6);
      return { start, end };
    }

    case "custom":
      if (customStart && customEnd) {
        const endDate = new Date(customEnd);
        // Only append time if the value is a plain date (YYYY-MM-DD) without a time component
        const safeEnd = customEnd.includes("T")
          ? endDate
          : new Date(customEnd + "T23:59:59.999");
        return {
          start: new Date(customStart),
          end: safeEnd,
        };
      }
      // Fall through to all_time if no custom dates
      return { start: new Date(0), end };

    case "all_time":
    default:
      return { start: new Date(0), end };
  }
}

export function isWithinDateRange(
  date: Date | string,
  dateRange: DateRangeValue,
  customStart?: string,
  customEnd?: string
): boolean {
  if (dateRange === "all_time") return true;

  const targetDate = typeof date === "string" ? new Date(date) : date;
  const range = getDateRangeFromValue(dateRange, customStart, customEnd);

  return targetDate >= range.start && targetDate <= range.end;
}

export function formatDateRange(
  value: DateRangeValue,
  customStart?: string,
  customEnd?: string
): string {
  const labels: Record<DateRangeValue, string> = {
    today: "Today",
    yesterday: "Yesterday",
    last_7_days: "Last 7 days",
    last_30_days: "Last 30 days",
    last_90_days: "Last 90 days",
    last_6_months: "Last 6 months",
    all_time: "All time",
    custom: "Custom range",
  };

  if (value === "custom" && customStart && customEnd) {
    return `${new Date(customStart).toLocaleDateString()} - ${new Date(customEnd).toLocaleDateString()}`;
  }

  return labels[value];
}
