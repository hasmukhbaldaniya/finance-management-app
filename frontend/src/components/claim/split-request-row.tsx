import Link from "next/link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
    <Stack spacing={1.5} sx={{ borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "background.paper", p: 2.5 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Split Request by: {request.requestedByName}
        </Typography>
        <SplitRequestStatusBadge status={request.status} />
      </Stack>

      <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap", fontSize: "0.875rem", color: "text.secondary" }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <CalendarBlankIcon size={14} /> Requested On{" "}
          <Typography component="span" color="text.primary" sx={{ fontWeight: 500 }}>
            {formatDateTime(request.requestedOn)}
          </Typography>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between", borderTop: 1, borderColor: "divider", pt: 1.5 }}>
        <AmountChip label="Requested Amount" amount={request.requestedAmount} />
        <Button component={Link} href={ROUTES.splitRequestDetails(request.id)} variant="outline" size="sm">
          Split Details
        </Button>
      </Stack>
    </Stack>
  );
}
