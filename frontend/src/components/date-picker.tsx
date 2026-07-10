"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value: string; // "" | "YYYY-MM-DD" — matches <input type="date">'s own value shape
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
};

function parseDateOnly(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// A Calendar+Popover date picker, replacing native <input type="date">
// across the app — operates on the same "YYYY-MM-DD" string value native
// date inputs already use, so callers only ever swap the component, not
// their state shape.
export function DatePicker({ value, onChange, placeholder = "Select date", id, className, disabled }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDateOnly(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            data-empty={!selected}
            className={cn("w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground", className)}
          >
            {selected ? format(selected, "PPP") : <span>{placeholder}</span>}
            <CaretDownIcon size={16} className="shrink-0 opacity-60" />
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onChange(date ? formatDateOnly(date) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
