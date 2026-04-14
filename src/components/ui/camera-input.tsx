"use client";

import * as React from "react";

interface CameraInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  cameraOnly?: boolean;
}

/**
 * A file input for photos that respects the company's camera-only setting.
 * When cameraOnly is true, forces `capture="environment"` and restricts to
 * image capture only (no gallery/camera roll access on mobile).
 */
export const CameraInput = React.forwardRef<HTMLInputElement, CameraInputProps>(
  ({ cameraOnly, accept, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="file"
        accept={cameraOnly ? "image/*" : (accept || "image/*")}
        {...(cameraOnly ? { capture: "environment" } : {})}
        {...props}
      />
    );
  },
);
CameraInput.displayName = "CameraInput";
