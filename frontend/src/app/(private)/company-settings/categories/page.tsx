"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { getCategories } from "@/apis/category";
import { CategoryCard } from "@/components/category/category-card";
import { DeleteCategoryDialog } from "@/components/category/delete-category-dialog";
import { EnableDisableCategoryDialog } from "@/components/category/enable-disable-category-dialog";
import { VersionHistoryDrawer } from "@/components/category/version-history-drawer";
import { buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { cn } from "@/lib/utils";
import type { CategoryListItem } from "@/types/category.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";

const PAGE_SIZE = 20;

export default function CategoriesManagementPage() {
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();

  const [versionHistoryCategory, setVersionHistoryCategory] = useState<CategoryListItem | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<CategoryListItem | null>(null);
  const [toggleCategoryTarget, setToggleCategoryTarget] = useState<CategoryListItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(undefined);

    getCategories({ page: 1, pageSize: PAGE_SIZE })
      .then(({ categories: fetched, hasMore: fetchedHasMore }) => {
        if (!isMounted) return;
        setCategories(fetched);
        setPage(1);
        setHasMore(fetchedHasMore);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLoadMore(): Promise<void> {
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { categories: fetched, hasMore: fetchedHasMore } = await getCategories({ page: nextPage, pageSize: PAGE_SIZE });
      setCategories((previous) => [...previous, ...fetched]);
      setPage(nextPage);
      setHasMore(fetchedHasMore);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsLoadingMore(false);
    }
  }

  const sentinelRef = useInfiniteScroll(handleLoadMore, hasMore, isLoadingMore);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">My Categories</h1>
        <Link href={ROUTES.CATEGORY_NEW} className={cn(buttonVariants())}>
          <PlusIcon size={16} /> Create Category
        </Link>
      </div>

      <div className="flex gap-4 border-b border-border text-sm font-medium">
        <button type="button" className="border-b-2 border-primary px-1 pb-2 text-foreground">
          Cost Categories
        </button>
        <button type="button" disabled className="px-1 pb-2 text-muted-foreground/50">
          Daily Allowance
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={24} />
        </div>
      ) : loadError ? (
        <p className="py-16 text-center text-sm text-destructive">{loadError}</p>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No categories yet.</p>
          <Link href={ROUTES.CATEGORY_NEW} className={cn(buttonVariants())}>
            <PlusIcon size={16} /> Create Category
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onOpenVersionHistory={setVersionHistoryCategory}
                onDelete={setDeleteCategoryTarget}
                onToggleEnabled={setToggleCategoryTarget}
              />
            ))}
          </div>
          {hasMore ? (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {isLoadingMore ? <Spinner size={20} /> : null}
            </div>
          ) : null}
        </>
      )}

      <VersionHistoryDrawer category={versionHistoryCategory} onOpenChange={(open) => !open && setVersionHistoryCategory(null)} />
      <DeleteCategoryDialog
        category={deleteCategoryTarget}
        onOpenChange={(open) => !open && setDeleteCategoryTarget(null)}
        onDeleted={(categoryId) => setCategories((previous) => previous.filter((category) => category.id !== categoryId))}
      />
      <EnableDisableCategoryDialog
        category={toggleCategoryTarget}
        onOpenChange={(open) => !open && setToggleCategoryTarget(null)}
        onUpdated={(categoryId, isEnabled) =>
          setCategories((previous) => previous.map((category) => (category.id === categoryId ? { ...category, isEnabled } : category)))
        }
      />
    </div>
  );
}
