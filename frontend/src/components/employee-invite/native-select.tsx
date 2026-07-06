import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// A hand-styled native <select>, matching Input's height/border/radius —
// scoped to this feature since the wizard needs ~8 of these (Title, Gender,
// Country Code, Role, Department, Grade, Airline, Approver) and no shadcn
// Select primitive exists yet in src/components/ui/ (not worth adding one for
// this many plain single-value dropdowns — see frontend/CLAUDE.md's note on
// the Associated Organizations filters making the same call).
type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  hasError?: boolean;
};

export function NativeSelect({ className, hasError, ...props }: NativeSelectProps) {
  return (
    <select
      className={cn(
        "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        hasError && "border-destructive",
        className
      )}
      {...props}
    />
  );
}
