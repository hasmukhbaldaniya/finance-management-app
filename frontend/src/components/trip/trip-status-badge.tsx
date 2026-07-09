import { InfoIcon, StarIcon, UserCheckIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { TRIP_STATUS_BADGE_STYLE, TRIP_STATUS_LABEL } from "@/utils/constants/trip.constant";
import type { TripStatus } from "@/types/trip.type";

const STATUS_ICON: Record<TripStatus, typeof InfoIcon> = {
  draft: InfoIcon,
  new: InfoIcon,
  pending_for_approval: StarIcon,
  approved_for_reimbursement: UserCheckIcon,
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", TRIP_STATUS_BADGE_STYLE[status])}>
      <Icon size={14} />
      {TRIP_STATUS_LABEL[status]}
    </span>
  );
}
