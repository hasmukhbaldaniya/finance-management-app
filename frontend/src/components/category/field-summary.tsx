"use client";

import { useState } from "react";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { CATEGORY_FIELD_TYPE_LABELS } from "@/utils/constants/category.constant";
import type { CategoryField } from "@/types/category.type";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2">{value}</span>
    </div>
  );
}

export function FieldSummary({ field }: { field: CategoryField }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border">
      <button type="button" onClick={() => setIsOpen((open) => !open)} className="flex w-full items-center gap-2 p-3 text-left">
        {isOpen ? <CaretDownIcon size={14} /> : <CaretRightIcon size={14} />}
        <span className="font-medium">{field.fieldName}</span>
        <span className="text-xs text-muted-foreground">{CATEGORY_FIELD_TYPE_LABELS[field.fieldType]}</span>
        {field.isRequired ? <span className="text-xs text-muted-foreground">· Required</span> : null}
      </button>
      {isOpen ? (
        <div className="space-y-1.5 border-t border-border p-3">
          <DetailRow label="Tooltip" value={field.tooltip ?? "—"} />
          <DetailRow label="Add to Policy Rules" value={field.addToPolicyRules ? "Yes" : "No"} />
          <DetailRow
            label="Conditional Visibility"
            value={field.conditionalVisibility ? `Depends on field #${field.conditionalVisibility.dependsOnFieldId} = "${field.conditionalVisibility.equalsValue}"` : "Always visible"}
          />
          <DetailRow label="Red Flag" value={field.redFlagMode ? `${field.redFlagMode === "ai" ? "AI Based" : "Formula Based"} · ${field.redFlagAction ?? "—"} · ${field.redFlagValue ?? "—"}` : "None"} />
          <DetailRow label="Configuration" value={Object.keys(field.config).length > 0 ? JSON.stringify(field.config) : "—"} />
        </div>
      ) : null}
    </div>
  );
}
