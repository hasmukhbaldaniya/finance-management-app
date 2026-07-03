import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
};

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Finance Management" className={className}>
      <rect width="100" height="100" rx="22" fill="#1c1c1e" />
      <path
        d="M28 28 H62 L72 38 V72 H28 Z"
        fill="none"
        stroke="#ece8df"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <rect x="60" y="52" width="16" height="16" rx="4" fill="#3457ff" />
    </svg>
  );
}

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="size-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-extrabold tracking-tight text-foreground">finance</span>
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          Management
        </span>
      </span>
    </div>
  );
}
