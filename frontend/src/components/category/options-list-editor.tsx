"use client";

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
    <div className="space-y-2">
      {options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input value={option} onChange={(event) => updateOption(index, event.target.value)} placeholder={`Option ${index + 1}`} />
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove option ${index + 1}`} onClick={() => removeOption(index)}>
            <TrashIcon size={16} className="text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addOption}>
        <PlusIcon size={14} /> Add More Options
      </Button>
    </div>
  );
}
