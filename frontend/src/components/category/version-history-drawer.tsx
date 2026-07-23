"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";
import { getCategoryVersions } from "@/apis/category";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
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
      <DialogContent sx={{ width: "100%", maxWidth: { sm: 448 } }}>
        <DialogHeader>
          <DialogTitle>{category?.name} Version History</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <Spinner />
          </Box>
        ) : loadError ? (
          <Typography variant="body2" color="error">
            {loadError}
          </Typography>
        ) : isDraft ? (
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderRadius: 2, border: 1, borderColor: "divider", p: 1.5 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "warning.main" }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Draft
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Unsaved draft changes
                </Typography>
              </Box>
            </Stack>
            {category ? (
              <MuiLink component={Link} href={ROUTES.categoryDetails(category.id)} variant="body2" sx={{ fontWeight: 500, "&:hover": { textDecoration: "underline" } }}>
                View Details
              </MuiLink>
            ) : null}
          </Stack>
        ) : (
          <Stack component="ul" spacing={1} sx={{ maxHeight: 384, overflowY: "auto", listStyle: "none", p: 0, m: 0 }}>
            {versions.map((version) => (
              <Stack
                component="li"
                direction="row"
                key={version.version}
                sx={{ alignItems: "center", justifyContent: "space-between", borderRadius: 2, border: 1, borderColor: "divider", p: 1.5 }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: version.isMajor ? "success.main" : "transparent",
                      border: version.isMajor ? "none" : 1,
                      borderColor: "text.secondary",
                    }}
                  />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Version {version.version}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(version.createdAt)} {version.createdBy ? `· ${version.createdBy.name}` : ""}
                    </Typography>
                  </Box>
                </Stack>
                {category ? (
                  <MuiLink
                    component={Link}
                    href={`${ROUTES.categoryDetails(category.id)}?version=${version.version}`}
                    variant="body2"
                    sx={{ fontWeight: 500, "&:hover": { textDecoration: "underline" } }}
                  >
                    View Details
                  </MuiLink>
                ) : null}
              </Stack>
            ))}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
