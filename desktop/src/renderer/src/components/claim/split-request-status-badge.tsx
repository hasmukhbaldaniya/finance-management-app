import Chip from "@mui/material/Chip";
import { CheckCircleIcon, ClockIcon, XCircleIcon } from "@phosphor-icons/react";
import { statusTones } from "@/theme/colors";
import type { SplitRequestMemberStatus } from "@/types/split-request.type";

const STATUS_ICON: Record<SplitRequestMemberStatus, typeof ClockIcon> = {
  pending: ClockIcon,
  accepted: CheckCircleIcon,
  rejected: XCircleIcon,
};

const STATUS_LABEL: Record<SplitRequestMemberStatus, string> = {
  pending: "Pending Split Request",
  accepted: "Accepted",
  rejected: "Rejected",
};

export function SplitRequestStatusBadge({ status }: { status: SplitRequestMemberStatus }) {
  const Icon = STATUS_ICON[status];
  const tone = statusTones[status];

  return (
    <Chip
      size="small"
      icon={<Icon size={14} />}
      label={STATUS_LABEL[status]}
      sx={{ fontWeight: 500, bgcolor: tone.background, color: tone.text, "& .MuiChip-icon": { color: "inherit" } }}
    />
  );
}
