import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  errorMessage?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, errorMessage, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = props.id ?? generatedId;
    const errorId = errorMessage ? `${textareaId}-error` : undefined;
    const describedBy = [props["aria-describedby"], errorId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full">
        <textarea
          id={textareaId}
          aria-invalid={error || Boolean(errorMessage) || props["aria-invalid"] === true ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={ref}
          {...props}
        />
        {errorMessage ? (
          <p id={errorId} className="mt-1 text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
