"use client";

import * as React from "react";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type" | "color" | "size"> & {
  className?: string;
};

// 026's MUI Migration — the show/hide toggle moves from an absolutely-
// positioned button overlaid on a relative-positioned wrapper div to
// MUI's own InputAdornment/IconButton pattern, the idiomatic way to put
// an inline control inside an OutlinedInput.
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <Input
      type={isVisible ? "text" : "password"}
      className={className}
      endAdornment={
        <InputAdornment position="end">
          <IconButton
            type="button"
            onClick={() => setIsVisible((previous) => !previous)}
            aria-label={isVisible ? "Hide password" : "Show password"}
            aria-pressed={isVisible}
            edge="end"
            size="small"
          >
            {isVisible ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
          </IconButton>
        </InputAdornment>
      }
      {...props}
    />
  );
}
