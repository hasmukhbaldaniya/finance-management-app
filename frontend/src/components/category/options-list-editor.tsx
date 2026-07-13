"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OptionsListEditorProps = {
  options: string[];
  onChange: (options: string[]) => void;
};

// Shared by Dropdown and Radio Button's manually-entered Options list — same
// add/edit/delete-per-option pattern for both, per 013's Field-specific
// configuration table.
export function OptionsListEditor({ options, onChange }: OptionsListEditorProps) {
  function updateOption(index: number, value: string): void {
    onChange(options.map((option, i) => (i === index ? value : option)));
  }

  function removeOption(index: number): void {
    onChange(options.filter((_, i) => i !== index));
  }

  function addOption(): void {
    onChange([...options, ""]);
  }

  return (
    <Stack spacing={1}>
      {options.map((option, index) => (
        <Stack direction="row" key={index} spacing={1} sx={{ alignItems: "center" }}>
          <Input value={option} onChange={(event) => updateOption(index, event.target.value)} placeholder={`Option ${index + 1}`} />
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove option ${index + 1}`} onClick={() => removeOption(index)}>
            <Box component="span" sx={{ color: "error.main", display: "flex" }}>
              <TrashIcon size={16} />
            </Box>
          </Button>
        </Stack>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addOption}>
        <PlusIcon size={14} /> Add More Options
      </Button>
    </Stack>
  );
}
