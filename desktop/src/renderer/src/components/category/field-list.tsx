"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
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
      <Box
        sx={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 2,
          border: 1,
          borderStyle: "dashed",
          borderColor: "divider",
          p: 4,
          textAlign: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Click a field type from the Field Library to add it to this form.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack component="ol" spacing={1} sx={{ flex: 1, listStyle: "none", p: 0, m: 0 }}>
      {fields.map((field, index) => (
        <Stack
          component="li"
          direction="row"
          key={field.id}
          spacing={1}
          sx={{
            alignItems: "center",
            borderRadius: 2,
            border: 1,
            borderColor: field.id === selectedFieldId ? "primary.main" : "divider",
            bgcolor: field.id === selectedFieldId ? (theme) => alpha(theme.palette.primary.main, 0.05) : "transparent",
            px: 1.5,
            py: 1,
          }}
        >
          <Box
            component="button"
            type="button"
            onClick={() => onSelect(field.id)}
            sx={{ minWidth: 0, flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
          >
            <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
              {field.fieldName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {CATEGORY_FIELD_TYPE_LABELS[field.fieldType]}
              {field.isRequired ? " · Required" : ""}
            </Typography>
          </Box>
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
            <Box component="span" sx={{ color: "error.main", display: "flex" }}>
              <TrashIcon size={16} />
            </Box>
          </Button>
        </Stack>
      ))}
    </Stack>
  );
}
