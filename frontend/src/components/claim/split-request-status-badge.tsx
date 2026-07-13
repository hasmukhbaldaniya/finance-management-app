import { CheckCircleIcon, ClockIcon, XCircleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { SplitRequestMemberStatus } from "@/types/split-request.type";

const STATUS_STYLE: Record<SplitRequestMemberStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

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
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", STATUS_STYLE[status])}>
      <Icon size={14} />
      {STATUS_LABEL[status]}
    </span>
  );
}
