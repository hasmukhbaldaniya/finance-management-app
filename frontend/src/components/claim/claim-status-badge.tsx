import { InfoIcon, StarIcon, UserCheckIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { CLAIM_STATUS_BADGE_STYLE, CLAIM_STATUS_LABEL } from "@/utils/constants/claim.constant";
import type { ClaimStatus } from "@/types/claim.type";

const STATUS_ICON: Record<ClaimStatus, typeof InfoIcon> = {
  draft: InfoIcon,
  submitted: InfoIcon,
  pending_for_approval: StarIcon,
  ready_for_submission: StarIcon,
  approved_for_reimbursement: UserCheckIcon,
};

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", CLAIM_STATUS_BADGE_STYLE[status])}>
      <Icon size={14} />
      {CLAIM_STATUS_LABEL[status]}
    </span>
  );
}
