"use client";

import * as React from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const dateRanges = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "last_6_months", label: "Last 6 months" },
  { value: "all_time", label: "All time" },
  { value: "custom", label: "Custom range" },
];

interface DateRangeDropdownProps {
  value: string;
  onChange: (value: string, customStart?: string, customEnd?: string) => void;
  className?: string;
}

export function DateRangeDropdown({ value, onChange, className }: DateRangeDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showCustom, setShowCustom] = React.useState(false);
  const [customStart, setCustomStart] = React.useState("");
  const [customEnd, setCustomEnd] = React.useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCustom(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (rangeValue: string) => {
    if (rangeValue === "custom") {
      setShowCustom(true);
    } else {
      onChange(rangeValue);
      setIsOpen(false);
      setShowCustom(false);
    }
  };

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      onChange("custom", customStart, customEnd);
      setIsOpen(false);
      setShowCustom(false);
    }
  };

  const getDisplayLabel = () => {
    if (value === "custom" && customStart && customEnd) {
      return `${new Date(customStart).toLocaleDateString()} - ${new Date(customEnd).toLocaleDateString()}`;
    }
    return dateRanges.find(d => d.value === value)?.label || "Select date";
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar className="h-4 w-4" />
        <span className="max-w-[150px] truncate">{getDisplayLabel()}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1 rounded-md border bg-background shadow-lg"
          onKeyDown={(e) => {
            if (e.key === "Escape") { setIsOpen(false); setShowCustom(false); }
            if (showCustom) return;
            const items = dateRanges;
            const currentIndex = items.findIndex((r) => r.value === value);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              const next = items[(currentIndex + 1) % items.length];
              handleSelect(next.value);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              const prev = items[(currentIndex - 1 + items.length) % items.length];
              handleSelect(prev.value);
            }
          }}
        >
          {!showCustom ? (
            <div className="w-48" role="listbox" aria-label="Date range options">
              {dateRanges.map((range) => (
                <button
                  key={range.value}
                  role="option"
                  aria-selected={value === range.value}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                    value === range.value ? "bg-muted font-medium" : ""
                  }`}
                  onClick={() => handleSelect(range.value)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="w-72 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Custom Range</h4>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => setShowCustom(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="start-date" className="text-xs">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date" className="text-xs">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setShowCustom(false)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={handleApplyCustom}
                  disabled={!customStart || !customEnd}
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
