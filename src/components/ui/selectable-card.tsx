import * as React from "react";
import { cn } from "../../lib/utils";
import { Check } from "lucide-react";

interface SelectableCardProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  title: string;
  description: string;
  onSelect?: () => void;
  disabled?: boolean;
}

const SelectableCard = React.forwardRef<HTMLDivElement, SelectableCardProps>(
  (
    { className, selected, title, description, onSelect, disabled, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-lg border p-4 transition-all",
          !disabled && "hover:border-primary/50 cursor-pointer",
          disabled && "opacity-60 cursor-not-allowed",
          selected && "border-primary bg-primary/5",
          className
        )}
        onClick={disabled ? undefined : onSelect}
        {...props}
      >
        {selected && (
          <div className="absolute right-2 top-2">
            <Check className="h-4 w-4 text-primary" />
          </div>
        )}
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    );
  }
);
SelectableCard.displayName = "SelectableCard";

export { SelectableCard };
