"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";
import { CalendarBlankIcon, TrashIcon } from "@phosphor-icons/react";
import { AmountChip } from "@/components/trip/amount-chip";
import { formatClaimName, formatDateTime } from "@/utils/helpers/format.helper";
import { ROUTES } from "@/utils/constants/route.constant";
import type { ClaimListItem } from "@/types/claim.type";
import { ClaimStatusBadge } from "./claim-status-badge";

type ClaimRowProps = {
  claim: ClaimListItem;
  onDelete: (claim: ClaimListItem) => void;
};

// 024's own doc doesn't specify a Claim Details page (its own Out of
// Scope) — a Draft claim's row links back into the editable manual-style
// form (reused for both manually- and AI-created drafts, see 022's own
// reopening-a-draft precedent); a submitted claim's row isn't a link at all,
// the same "flagged gap" posture Trip Listing had before Trip Details (020)
// existed.
export function ClaimRow({ claim, onDelete }: ClaimRowProps) {
  const name = formatClaimName(claim);
  const title =
    claim.status === "draft" ? (
      <MuiLink component={Link} href={ROUTES.claimManualEdit(claim.id)} color="inherit" sx={{ "&:hover": { textDecoration: "underline" } }}>
        {name}
      </MuiLink>
    ) : (
      name
    );

  return (
    <Stack spacing={1.5} sx={{ borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "background.paper", p: 2.5 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {title}{" "}
          <Typography component="span" color="text.secondary">
            (#{claim.id})
          </Typography>
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
          <ClaimStatusBadge status={claim.status} />
          {claim.status === "draft" ? (
            <Box
              component="button"
              type="button"
              aria-label={`Delete ${name}`}
              onClick={() => onDelete(claim)}
              sx={{
                display: "flex",
                width: 32,
                height: 32,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 1.5,
                color: "text.secondary",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "background-color 0.15s, color 0.15s",
                "&:hover": { bgcolor: "error.main", color: "error.contrastText", opacity: 0.9 },
              }}
            >
              <TrashIcon size={16} />
            </Box>
          ) : null}
        </Stack>
      </Stack>

      <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap", fontSize: "0.875rem", color: "text.secondary" }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <CalendarBlankIcon size={14} /> Submission Date{" "}
          <Typography component="span" color="text.primary" sx={{ fontWeight: 500 }}>
            {formatDateTime(claim.createdAt)}
          </Typography>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={4} sx={{ borderTop: 1, borderColor: "divider", pt: 1.5 }}>
        <AmountChip label="Total Amount" amount={claim.totalAmount} />
      </Stack>
    </Stack>
  );
}
