"use client";

import Link from "next/link";
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
      <Link href={ROUTES.claimManualEdit(claim.id)} className="hover:underline">
        {name}
      </Link>
    ) : (
      name
    );

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">
          {title} <span className="text-muted-foreground">(#{claim.id})</span>
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <ClaimStatusBadge status={claim.status} />
          {claim.status === "draft" ? (
            <button
              type="button"
              aria-label={`Delete ${name}`}
              onClick={() => onDelete(claim)}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <TrashIcon size={16} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarBlankIcon size={14} /> Submission Date <span className="font-medium text-foreground">{formatDateTime(claim.createdAt)}</span>
        </span>
      </div>

      <div className="flex gap-8 border-t border-border pt-3">
        <AmountChip label="Total Amount" amount={claim.totalAmount} />
      </div>
    </div>
  );
}
