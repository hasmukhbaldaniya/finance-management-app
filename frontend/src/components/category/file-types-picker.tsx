"use client";

import { cn } from "@/lib/utils";
import { ALLOWED_FILE_TYPES } from "@/utils/constants/category.constant";

type FileTypesPickerProps = {
  selected: string[];
  onChange: (selected: string[]) => void;
};

// Shared by Invoice and File Upload's "Types of File Allowed" multi-select
// chips (013's Field-specific configuration table lists the same three
// settings for both field types).
export function FileTypesPicker({ selected, onChange }: FileTypesPickerProps) {
  function toggle(type: string): void {
    onChange(selected.includes(type) ? selected.filter((entry) => entry !== type) : [...selected, type]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ALLOWED_FILE_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => toggle(type)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            selected.includes(type) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted/50"
          )}
        >
          {type}
        </button>
      ))}
    </div>
  );
}
