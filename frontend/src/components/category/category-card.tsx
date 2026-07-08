"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ROUTES } from "@/utils/constants/route.constant";
import type { CategoryListItem } from "@/types/category.type";

type CategoryCardProps = {
  category: CategoryListItem;
  onOpenVersionHistory: (category: CategoryListItem) => void;
  onDelete: (category: CategoryListItem) => void;
  onToggleEnabled: (category: CategoryListItem) => void;
};

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
    <div onClick={handleCardClick} className="cursor-pointer space-y-3 rounded-lg border border-border bg-background p-4 hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{category.name}</h3>
            {isDraft ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Draft</span> : null}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{category.description || "No description."}</p>
        </div>
        <button
          type="button"
          data-stop-card-navigation
          onClick={() => onOpenVersionHistory(category)}
          className="shrink-0 text-sm font-medium text-primary hover:underline"
        >
          Version History
        </button>
      </div>

      <span className="inline-block rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
        Last updated {formatDateTime(category.updatedAt)}
      </span>

      <div className="flex items-center justify-between border-t border-border pt-3" data-stop-card-navigation>
        <div className="flex items-center gap-1">
          <Link
            href={`${ROUTES.CATEGORY_NEW}?duplicateFrom=${category.id}`}
            aria-label={`Duplicate ${category.name}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <CopyIcon size={16} />
          </Link>
          <Link
            href={ROUTES.categoryStep(category.id, "basic-details")}
            aria-label={`Edit ${category.name}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <PencilSimpleIcon size={16} />
          </Link>
          {isDraft ? (
            <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${category.name}`} onClick={() => onDelete(category)}>
              <TrashIcon size={16} className="text-destructive" />
            </Button>
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
