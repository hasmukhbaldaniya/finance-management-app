import type { ReactNode } from "react";

type StepShellProps = {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
};

export function StepShell({ step, title, description, children }: StepShellProps) {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
      <p className="text-sm font-medium text-muted-foreground">Step {step} of 4</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-6 rounded-lg border border-border bg-background p-6">{children}</div>
    </div>
  );
}
