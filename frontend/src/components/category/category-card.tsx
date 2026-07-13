"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import { ClockCounterClockwiseIcon, CopyIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import { ROUTES } from "@/utils/constants/route.constant";
import type { CategoryListItem } from "@/types/category.type";

type CategoryCardProps = {
  category: CategoryListItem;
  onOpenVersionHistory: (category: CategoryListItem) => void;
  onDelete: (category: CategoryListItem) => void;
  onToggleEnabled: (category: CategoryListItem) => void;
};

const iconButtonSx = {
  display: "flex",
  width: 32,
  height: 32,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 1.5,
  color: "text.secondary",
  transition: "background-color 0.15s, color 0.15s",
  "&:hover": { bgcolor: "action.hover", color: "text.primary" },
} as const;

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
    <Paper
      variant="outlined"
      onClick={handleCardClick}
      sx={{
        display: "flex",
        height: "100%",
        cursor: "pointer",
        flexDirection: "column",
        gap: 2,
        borderRadius: 3,
        p: 2.5,
        boxShadow: 1,
        transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
        "&:hover": { transform: "translateY(-2px)", borderColor: "primary.light", boxShadow: 3 },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
              {category.name}
            </Typography>
            {isDraft ? <Chip label="Draft" color="warning" size="small" /> : null}
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.75, minHeight: 40, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {category.description || "No description."}
          </Typography>
        </Box>
        <Box
          component="button"
          type="button"
          data-stop-card-navigation
          onClick={() => onOpenVersionHistory(category)}
          aria-label={`View version history for ${category.name}`}
          title="Version History"
          sx={{ ...iconButtonSx, flexShrink: 0, background: "none", border: "none", cursor: "pointer" }}
        >
          <ClockCounterClockwiseIcon size={18} />
        </Box>
      </Stack>

      <Chip label={`Last updated ${formatDateTime(category.updatedAt)}`} size="small" sx={{ alignSelf: "flex-start", bgcolor: "action.selected", color: "text.secondary" }} />

      <Stack direction="row" data-stop-card-navigation sx={{ mt: "auto", alignItems: "center", justifyContent: "space-between", borderTop: 1, borderColor: "divider", pt: 1.5 }}>
        <Stack direction="row" spacing={0.5}>
          <Box component={Link} href={`${ROUTES.CATEGORY_NEW}?duplicateFrom=${category.id}`} aria-label={`Duplicate ${category.name}`} title="Duplicate" sx={iconButtonSx}>
            <CopyIcon size={16} />
          </Box>
          <Box component={Link} href={ROUTES.categoryStep(category.id, "basic-details")} aria-label={`Edit ${category.name}`} title="Edit" sx={iconButtonSx}>
            <PencilSimpleIcon size={16} />
          </Box>
          {isDraft ? (
            <Box
              component="button"
              type="button"
              aria-label={`Delete ${category.name}`}
              onClick={() => onDelete(category)}
              title="Delete"
              sx={{ ...iconButtonSx, background: "none", border: "none", cursor: "pointer", "&:hover": { bgcolor: "error.main", color: "error.contrastText", opacity: 0.9 } }}
            >
              <TrashIcon size={16} />
            </Box>
          ) : null}
        </Stack>
        <Switch
          checked={category.isEnabled && !isDraft}
          disabled={isDraft}
          onCheckedChange={() => onToggleEnabled(category)}
          aria-label={category.isEnabled ? `Disable ${category.name}` : `Enable ${category.name}`}
        />
      </Stack>
    </Paper>
  );
}
