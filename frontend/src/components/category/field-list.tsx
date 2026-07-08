"use client";

import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CATEGORY_FIELD_TYPE_LABELS } from "@/utils/constants/category.constant";
import type { CategoryField } from "@/types/category.type";

type FieldListProps = {
  fields: CategoryField[];
  selectedFieldId: number | null;
  onSelect: (fieldId: number) => void;
  onMove: (fieldId: number, direction: "up" | "down") => void;
  onDelete: (fieldId: number) => void;
};

// Reordering here is up/down buttons rather than a drag handle — same
// end-result (a reorderable list persisted via `position`) without the
// added complexity of a drag-and-drop library for a single interaction.
export function FieldList({ fields, selectedFieldId, onSelect, onMove, onDelete }: FieldListProps) {
  if (fields.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Click a field type from the Field Library to add it to this form.
      </div>
    );
  }

  return (
    <ol className="flex-1 space-y-2">
      {fields.map((field, index) => (
        <li
          key={field.id}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2",
            field.id === selectedFieldId ? "border-primary bg-primary/5" : "border-border"
          )}
        >
          <button type="button" onClick={() => onSelect(field.id)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium">{field.fieldName}</p>
            <p className="text-xs text-muted-foreground">
              {CATEGORY_FIELD_TYPE_LABELS[field.fieldType]}
              {field.isRequired ? " · Required" : ""}
            </p>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={index === 0}
            aria-label={`Move ${field.fieldName} up`}
            onClick={() => onMove(field.id, "up")}
          >
            <ArrowUpIcon size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={index === fields.length - 1}
            aria-label={`Move ${field.fieldName} down`}
            onClick={() => onMove(field.id, "down")}
          >
            <ArrowDownIcon size={16} />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${field.fieldName}`} onClick={() => onDelete(field.id)}>
            <TrashIcon size={16} className="text-destructive" />
          </Button>
        </li>
      ))}
    </ol>
  );
}
