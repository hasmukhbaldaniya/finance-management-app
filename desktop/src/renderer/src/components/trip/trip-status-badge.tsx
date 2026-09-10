import Chip from "@mui/material/Chip";
import { InfoIcon, StarIcon, UserCheckIcon } from "@phosphor-icons/react";
import { statusTones } from "@/theme/colors";
import { TRIP_STATUS_LABEL } from "@/utils/constants/trip.constant";
import type { TripStatus } from "@/types/trip.type";

const STATUS_ICON: Record<TripStatus, typeof InfoIcon> = {
  draft: InfoIcon,
  new: InfoIcon,
  pending_for_approval: StarIcon,
  approved_for_reimbursement: UserCheckIcon,
};

const STATUS_TONE: Record<TripStatus, { background: string; text: string }> = {
  draft: { background: "transparent", text: "" },
  new: { background: "transparent", text: "" },
  pending_for_approval: statusTones.pending,
  approved_for_reimbursement: statusTones.accepted,
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const Icon = STATUS_ICON[status];
  const isNeutral = status === "draft" || status === "new";
  const tone = STATUS_TONE[status];

  return (
    <Chip
      size="small"
      icon={<Icon size={14} />}
      label={TRIP_STATUS_LABEL[status]}
      sx={{
        fontWeight: 500,
        bgcolor: isNeutral ? "action.hover" : tone.background,
        color: isNeutral ? "text.secondary" : tone.text,
        "& .MuiChip-icon": { color: "inherit" },
      }}
    />
  );
}
