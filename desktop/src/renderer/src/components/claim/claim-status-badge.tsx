import Chip from "@mui/material/Chip";
import { InfoIcon, StarIcon, UserCheckIcon } from "@phosphor-icons/react";
import { statusTones } from "@/theme/colors";
import { CLAIM_STATUS_LABEL } from "@/utils/constants/claim.constant";
import type { ClaimStatus } from "@/types/claim.type";

const STATUS_ICON: Record<ClaimStatus, typeof InfoIcon> = {
  draft: InfoIcon,
  submitted: InfoIcon,
  pending_for_approval: StarIcon,
  ready_for_submission: StarIcon,
  approved_for_reimbursement: UserCheckIcon,
};

const STATUS_TONE: Record<ClaimStatus, { background: string; text: string } | null> = {
  draft: null,
  submitted: statusTones.info,
  pending_for_approval: statusTones.pending,
  ready_for_submission: statusTones.pending,
  approved_for_reimbursement: statusTones.accepted,
};

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  const Icon = STATUS_ICON[status];
  const tone = STATUS_TONE[status];

  return (
    <Chip
      size="small"
      icon={<Icon size={14} />}
      label={CLAIM_STATUS_LABEL[status]}
      sx={{
        fontWeight: 500,
        bgcolor: tone ? tone.background : "action.hover",
        color: tone ? tone.text : "text.secondary",
        "& .MuiChip-icon": { color: "inherit" },
      }}
    />
  );
}
