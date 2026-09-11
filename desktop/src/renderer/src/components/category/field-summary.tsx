"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { CATEGORY_FIELD_TYPE_LABELS } from "@/utils/constants/category.constant";
import type { CategoryField } from "@/types/category.type";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, fontSize: "0.875rem" }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ gridColumn: "span 2" }}>
        {value}
      </Typography>
    </Box>
  );
}

export function FieldSummary({ field }: { field: CategoryField }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Box sx={{ borderRadius: 2, border: 1, borderColor: "divider" }}>
      <Box
        component="button"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        sx={{ display: "flex", width: "100%", alignItems: "center", gap: 1, p: 1.5, textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
      >
        {isOpen ? <CaretDownIcon size={14} /> : <CaretRightIcon size={14} />}
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {field.fieldName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {CATEGORY_FIELD_TYPE_LABELS[field.fieldType]}
        </Typography>
        {field.isRequired ? (
          <Typography variant="caption" color="text.secondary">
            · Required
          </Typography>
        ) : null}
      </Box>
      {isOpen ? (
        <Stack spacing={0.75} sx={{ borderTop: 1, borderColor: "divider", p: 1.5 }}>
          <DetailRow label="Tooltip" value={field.tooltip ?? "—"} />
          <DetailRow label="Add to Policy Rules" value={field.addToPolicyRules ? "Yes" : "No"} />
          <DetailRow
            label="Conditional Visibility"
            value={field.conditionalVisibility ? `Depends on field #${field.conditionalVisibility.dependsOnFieldId} = "${field.conditionalVisibility.equalsValue}"` : "Always visible"}
          />
          <DetailRow label="Red Flag" value={field.redFlagMode ? `${field.redFlagMode === "ai" ? "AI Based" : "Formula Based"} · ${field.redFlagAction ?? "—"} · ${field.redFlagValue ?? "—"}` : "None"} />
          <DetailRow label="Configuration" value={Object.keys(field.config).length > 0 ? JSON.stringify(field.config) : "—"} />
        </Stack>
      ) : null}
    </Box>
  );
}
