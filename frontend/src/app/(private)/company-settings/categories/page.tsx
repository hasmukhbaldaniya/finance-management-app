"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PlusIcon } from "@phosphor-icons/react";
import { getCategories } from "@/apis/category";
import { CategoryCard } from "@/components/category/category-card";
import { DeleteCategoryDialog } from "@/components/category/delete-category-dialog";
import { EnableDisableCategoryDialog } from "@/components/category/enable-disable-category-dialog";
import { VersionHistoryDrawer } from "@/components/category/version-history-drawer";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
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
    <Stack spacing={3} sx={{ mx: "auto", maxWidth: 1280, px: 3, py: 4 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
          My Categories
        </Typography>
        <Button component={Link} href={ROUTES.CATEGORY_NEW}>
          <PlusIcon size={16} /> Create Category
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ borderBottom: 1, borderColor: "divider", fontSize: "0.875rem", fontWeight: 500 }}>
        <Box component="button" type="button" sx={{ borderBottom: 2, borderColor: "primary.main", px: 0.5, pb: 1, background: "none", border: "none", borderBottomWidth: 2, borderBottomStyle: "solid", cursor: "pointer", color: "text.primary" }}>
          Cost Categories
        </Box>
        <Box component="button" type="button" disabled sx={{ px: 0.5, pb: 1, background: "none", border: "none", color: "text.disabled" }}>
          Daily Allowance
        </Box>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <Spinner size={24} />
        </Box>
      ) : loadError ? (
        <Typography variant="body2" color="error" sx={{ py: 8, textAlign: "center" }}>
          {loadError}
        </Typography>
      ) : categories.length === 0 ? (
        <Stack spacing={1.5} sx={{ alignItems: "center", borderRadius: 2, border: 1, borderStyle: "dashed", borderColor: "divider", py: 8, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No categories yet.
          </Typography>
          <Button component={Link} href={ROUTES.CATEGORY_NEW}>
            <PlusIcon size={16} /> Create Category
          </Button>
        </Stack>
      ) : (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", xl: "1fr 1fr 1fr" }, gap: 2.5 }}>
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onOpenVersionHistory={setVersionHistoryCategory}
                onDelete={setDeleteCategoryTarget}
                onToggleEnabled={setToggleCategoryTarget}
              />
            ))}
          </Box>
          {hasMore ? (
            <Box ref={sentinelRef} sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              {isLoadingMore ? <Spinner size={20} /> : null}
            </Box>
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
    </Stack>
  );
}
