"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  listboxId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within a Select");
  }
  return context;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value = "", onValueChange = () => {}, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const listboxId = `select-listbox-${React.useId()}`;
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, listboxId, triggerRef }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
  const { open, setOpen, listboxId, triggerRef } = useSelectContext();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      if (!open) setOpen(true);
    }
  };

  return (
    <button
      ref={triggerRef}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listboxId}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => setOpen(!open)}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", open && "rotate-180")} />
    </button>
  );
}

interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = useSelectContext();
  const [displayValue, setDisplayValue] = React.useState<string | null>(null);

  // Get display value from SelectItem children
  React.useEffect(() => {
    if (!value) {
      setDisplayValue(null);
    }
  }, [value]);

  return (
    <span className={cn(!value && !displayValue && "text-muted-foreground")}>
      {displayValue || value || placeholder}
    </span>
  );
}

interface SelectContentProps {
  children: React.ReactNode;
  "aria-label"?: string;
}

export function SelectContent({ children, "aria-label": ariaLabel }: SelectContentProps) {
  const { open, setOpen, value, onValueChange, listboxId, triggerRef } = useSelectContext();
  const ref = React.useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const typeaheadBuffer = React.useRef("");
  const typeaheadTimeout = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  const getOptions = React.useCallback((): HTMLElement[] => {
    if (!ref.current) return [];
    return Array.from(
      ref.current.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])')
    );
  }, []);

  // Focus listbox and set initial focused index when opened
  React.useEffect(() => {
    if (open && ref.current) {
      ref.current.focus();
      const options = getOptions();
      const selectedIdx = options.findIndex(
        (el) => el.getAttribute("data-value") === value
      );
      setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    } else {
      setFocusedIndex(-1);
    }
  }, [open, getOptions, value]);

  // Update data-focused attribute and scroll into view
  React.useEffect(() => {
    const options = getOptions();
    options.forEach((el, i) => {
      if (i === focusedIndex) {
        el.setAttribute("data-focused", "true");
        el.scrollIntoView({ block: "nearest" });
      } else {
        el.removeAttribute("data-focused");
      }
    });
  }, [focusedIndex, getOptions]);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, setOpen]);

  const closeAndReturnFocus = React.useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, [setOpen, triggerRef]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const options = getOptions();
    if (!options.length) return;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        setFocusedIndex((i) => (i + 1) % options.length);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        setFocusedIndex((i) => (i - 1 + options.length) % options.length);
        break;
      }
      case "Home": {
        e.preventDefault();
        setFocusedIndex(0);
        break;
      }
      case "End": {
        e.preventDefault();
        setFocusedIndex(options.length - 1);
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          const optionValue = options[focusedIndex].getAttribute("data-value");
          if (optionValue) {
            onValueChange(optionValue);
            closeAndReturnFocus();
          }
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        closeAndReturnFocus();
        break;
      }
      default: {
        if (e.key.length === 1) {
          e.preventDefault();
          clearTimeout(typeaheadTimeout.current);
          typeaheadBuffer.current += e.key.toLowerCase();
          typeaheadTimeout.current = setTimeout(() => {
            typeaheadBuffer.current = "";
          }, 500);

          const match = options.findIndex((el) =>
            (el.textContent || "").toLowerCase().startsWith(typeaheadBuffer.current)
          );
          if (match >= 0) setFocusedIndex(match);
        }
      }
    }
  };

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="listbox"
      id={listboxId}
      aria-label={ariaLabel}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95"
    >
      {children}
    </div>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SelectItem({ value, children, disabled }: SelectItemProps) {
  const { value: selectedValue, onValueChange, setOpen, triggerRef } = useSelectContext();
  const isSelected = value === selectedValue;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled || undefined}
      data-value={value}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[focused]:bg-accent data-[focused]:text-accent-foreground",
        isSelected && "bg-accent",
        disabled && "pointer-events-none opacity-50"
      )}
      onClick={() => {
        if (!disabled) {
          onValueChange(value);
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4" />}
      </span>
      {children}
    </div>
  );
}
