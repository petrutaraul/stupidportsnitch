import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onKeyDown, ...props }, ref) => {
    // Add keyboard event handler to ensure shortcuts work properly
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow Command+A (select all)
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        // Don't prevent default - let the browser handle select all
        if (onKeyDown) {
          onKeyDown(e);
        }
        return;
      }

      // Allow Command+V (paste)
      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        // Don't prevent default - let the browser handle paste
        if (onKeyDown) {
          onKeyDown(e);
        }
        return;
      }

      // Call the original onKeyDown handler if provided
      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
