import type { ReactNode } from "react";

type SectionCardProps = {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function SectionCard({ id, title, description, children }: SectionCardProps) {
  return (
    <section id={id} className="scroll-mt-24 rounded-lg border border-border bg-background p-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
