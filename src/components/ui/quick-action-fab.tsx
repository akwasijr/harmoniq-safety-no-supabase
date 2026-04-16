"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/ui/bottom-sheet";

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

interface QuickActionFABProps {
  actions: QuickAction[];
}

export function QuickActionFAB({ actions }: QuickActionFABProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close sheet on route change
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (actions.length === 0) return null;

  return (
    <>
      {/* FAB Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl active:scale-95 transition-all"
        aria-label={open ? "Close actions" : "Quick actions"}
      >
        <Plus
          className={cn(
            "h-6 w-6 transition-transform duration-300",
            open && "rotate-45",
          )}
        />
      </button>

      {/* Bottom Sheet */}
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Quick Actions">
        <div className="divide-y divide-border">
          {actions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 py-3.5 active:bg-muted/50 transition-colors -mx-1 px-1 rounded-lg"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{action.label}</p>
                {action.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
