"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DateTimePickerProps = {
  value: string; // "" | "YYYY-MM-DDTHH:mm" — matches <input type="datetime-local">'s own value shape
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
};

function splitValue(value: string): { date: Date | undefined; time: string } {
  if (!value) return { date: undefined, time: "" };
  const [datePart, timePart = ""] = value.split("T");
  const date = new Date(`${datePart}T00:00:00`);
  return { date: Number.isNaN(date.getTime()) ? undefined : date, time: timePart };
}

function formatDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// Calendar+Popover date picker with a time input alongside, replacing
// native <input type="datetime-local"> — operates on the same
// "YYYY-MM-DDTHH:mm" string value shape that input already used.
export function DateTimePicker({ value, onChange, placeholder = "Select date & time", id, className, disabled }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const { date, time } = splitValue(value);

  function commit(nextDate: Date | undefined, nextTime: string): void {
    if (!nextDate) {
      onChange("");
      return;
    }
    onChange(`${formatDateOnly(nextDate)}T${nextTime || "00:00"}`);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            data-empty={!date}
            className={cn("w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground", className)}
          >
            {date ? `${format(date, "PPP")}${time ? `, ${time}` : ""}` : <span>{placeholder}</span>}
            <CaretDownIcon size={16} className="shrink-0 opacity-60" />
          </Button>
        }
      />
      <PopoverContent className="w-auto space-y-2 p-2" align="start">
        <Calendar mode="single" selected={date} defaultMonth={date} onSelect={(nextDate) => commit(nextDate, time)} />
        <div className="space-y-1.5 border-t border-border px-1 pt-2">
          <Label htmlFor={id ? `${id}-time` : undefined} className="text-xs text-muted-foreground">
            Time
          </Label>
          <Input id={id ? `${id}-time` : undefined} type="time" value={time} onChange={(event) => commit(date, event.target.value)} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
