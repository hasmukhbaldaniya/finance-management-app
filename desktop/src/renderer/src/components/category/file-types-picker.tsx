"use client";

import Box from "@mui/material/Box";
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
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {ALLOWED_FILE_TYPES.map((type) => (
        <Box
          component="button"
          key={type}
          type="button"
          onClick={() => toggle(type)}
          sx={{
            borderRadius: 999,
            border: 1,
            px: 1.5,
            py: 0.5,
            fontSize: "0.75rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "background-color 0.15s",
            borderColor: selected.includes(type) ? "primary.main" : "divider",
            bgcolor: selected.includes(type) ? "primary.main" : "transparent",
            color: selected.includes(type) ? "primary.contrastText" : "text.secondary",
            "&:hover": selected.includes(type) ? undefined : { bgcolor: "action.hover" },
          }}
        >
          {type}
        </Box>
      ))}
    </Box>
  );
}
