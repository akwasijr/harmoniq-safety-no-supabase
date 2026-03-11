import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorMessage?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, errorMessage, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = props.id ?? generatedId;
    const errorId = errorMessage ? `${inputId}-error` : undefined;
    const describedBy = [props["aria-describedby"], errorId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full">
        <input
          type={type}
          id={inputId}
          aria-invalid={error || Boolean(errorMessage) || props["aria-invalid"] === true ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
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
Input.displayName = "Input";

export { Input };
