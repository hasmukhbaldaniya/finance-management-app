"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClockCounterClockwiseIcon, CopyIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/utils/constants/route.constant";
import type { CategoryListItem } from "@/types/category.type";

type CategoryCardProps = {
  category: CategoryListItem;
  onOpenVersionHistory: (category: CategoryListItem) => void;
  onDelete: (category: CategoryListItem) => void;
  onToggleEnabled: (category: CategoryListItem) => void;
};

const iconButtonClass =
  "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function CategoryCard({ category, onOpenVersionHistory, onDelete, onToggleEnabled }: CategoryCardProps) {
  const router = useRouter();
  const isDraft = category.status === "draft";

  function handleCardClick(event: React.MouseEvent): void {
    if ((event.target as HTMLElement).closest("[data-stop-card-navigation]")) return;
    router.push(ROUTES.categoryDetails(category.id));
  }

  return (
    <div
      onClick={handleCardClick}
      className="flex h-full cursor-pointer flex-col gap-4 rounded-xl border border-border bg-background p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold">{category.name}</h3>
            {isDraft ? (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-amber-800">Draft</span>
            ) : null}
          </div>
          <p className="mt-1.5 line-clamp-2 min-h-10 text-sm text-muted-foreground">{category.description || "No description."}</p>
        </div>
        <button
          type="button"
          data-stop-card-navigation
          onClick={() => onOpenVersionHistory(category)}
          aria-label={`View version history for ${category.name}`}
          className={cn(iconButtonClass, "shrink-0")}
          title="Version History"
        >
          <ClockCounterClockwiseIcon size={18} />
        </button>
      </div>

      <span className="inline-flex w-fit items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        Last updated {formatDateTime(category.updatedAt)}
      </span>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-3" data-stop-card-navigation>
        <div className="flex items-center gap-1">
          <Link href={`${ROUTES.CATEGORY_NEW}?duplicateFrom=${category.id}`} aria-label={`Duplicate ${category.name}`} className={iconButtonClass} title="Duplicate">
            <CopyIcon size={16} />
          </Link>
          <Link href={ROUTES.categoryStep(category.id, "basic-details")} aria-label={`Edit ${category.name}`} className={iconButtonClass} title="Edit">
            <PencilSimpleIcon size={16} />
          </Link>
          {isDraft ? (
            <button
              type="button"
              aria-label={`Delete ${category.name}`}
              onClick={() => onDelete(category)}
              className={cn(iconButtonClass, "hover:bg-destructive/10 hover:text-destructive")}
              title="Delete"
            >
              <TrashIcon size={16} />
            </button>
          ) : null}
        </div>
        <Switch
          checked={category.isEnabled && !isDraft}
          disabled={isDraft}
          onCheckedChange={() => onToggleEnabled(category)}
          aria-label={category.isEnabled ? `Disable ${category.name}` : `Enable ${category.name}`}
        />
      </div>
    </div>
  );
}
