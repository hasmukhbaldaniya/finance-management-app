"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCategoryVersions } from "@/apis/category";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/utils/constants/route.constant";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import type { CategoryListItem, CategoryVersionListItem } from "@/types/category.type";

type VersionHistoryDrawerProps = {
  category: CategoryListItem | null;
  onOpenChange: (open: boolean) => void;
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// A real right-side drawer per 016's reference screenshots wasn't built —
// this reuses the existing centered Dialog primitive (the only modal
// surface this codebase has) rather than adding new slide-in drawer
// infrastructure for one screen; content/behavior match the story exactly.
export function VersionHistoryDrawer({ category, onOpenChange }: VersionHistoryDrawerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDraft, setIsDraft] = useState(false);
  const [versions, setVersions] = useState<CategoryVersionListItem[]>([]);

  useEffect(() => {
    if (!category) return;
    setIsLoading(true);
    setLoadError(null);
    getCategoryVersions(category.id)
      .then((response) => {
        setIsDraft(response.isDraft);
        setVersions(response.isDraft ? [] : response.versions);
      })
      .catch((error) => setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE))
      .finally(() => setIsLoading(false));
  }, [category]);

  return (
    <Dialog open={category !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category?.name} Version History</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : isDraft ? (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500" />
              <div>
                <p className="text-sm font-medium">Draft</p>
                <p className="text-xs text-muted-foreground">Unsaved draft changes</p>
              </div>
            </div>
            {category ? (
              <Link href={ROUTES.categoryDetails(category.id)} className="text-sm font-medium text-primary hover:underline">
                View Details
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {versions.map((version) => (
              <li key={version.version} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", version.isMajor ? "bg-green-600" : "border border-muted-foreground bg-transparent")} />
                  <div>
                    <p className="text-sm font-medium">Version {version.version}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(version.createdAt)} {version.createdBy ? `· ${version.createdBy.name}` : ""}
                    </p>
                  </div>
                </div>
                {category ? (
                  <Link href={`${ROUTES.categoryDetails(category.id)}?version=${version.version}`} className="text-sm font-medium text-primary hover:underline">
                    View Details
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
