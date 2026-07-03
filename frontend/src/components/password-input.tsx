"use client";

import * as React from "react";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  className?: string;
};

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div className={cn("relative", className)}>
      <Input type={isVisible ? "text" : "password"} className="pr-8" {...props} />
      <button
        type="button"
        onClick={() => setIsVisible((prev) => !prev)}
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground"
      >
        {isVisible ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    </div>
  );
}
