import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

type AuthCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function AuthCard({ title, description, children, className }: AuthCardProps) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className={cn("w-full max-w-sm", className)}>
        <Logo className="mb-6 justify-center" />
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <div className="mb-6 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
