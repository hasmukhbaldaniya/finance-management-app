import Link from "next/link";
import { CalendarBlankIcon } from "@phosphor-icons/react";
import { AmountChip } from "@/components/trip/amount-chip";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/utils/helpers/format.helper";
import { ROUTES } from "@/utils/constants/route.constant";
import type { SplitRequestListItem } from "@/types/split-request.type";
import { SplitRequestStatusBadge } from "./split-request-status-badge";

// 025's Split Request Inbox row — "Split Request by: {name}", Requested On,
// Requested Amount (the viewer's own share, not the whole expense), and a
// Split Details link into /claims/split-requests/[id].
export function SplitRequestRow({ request }: { request: SplitRequestListItem }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">Split Request by: {request.requestedByName}</h3>
        <SplitRequestStatusBadge status={request.status} />
      </div>

      <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarBlankIcon size={14} /> Requested On <span className="font-medium text-foreground">{formatDateTime(request.requestedOn)}</span>
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <AmountChip label="Requested Amount" amount={request.requestedAmount} />
        <Button component={Link} href={ROUTES.splitRequestDetails(request.id)} variant="outline" size="sm">
          Split Details
        </Button>
      </div>
    </div>
  );
}
