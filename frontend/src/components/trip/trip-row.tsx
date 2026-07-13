"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";
import { CalendarBlankIcon, TrashIcon } from "@phosphor-icons/react";
import { formatDateTime } from "@/utils/helpers/format.helper";
import { ROUTES } from "@/utils/constants/route.constant";
import type { TripListItem } from "@/types/trip.type";
import { AmountChip } from "./amount-chip";
import { TripStatusBadge } from "./trip-status-badge";

type TripRowProps = {
  trip: TripListItem;
  onDelete: (trip: TripListItem) => void;
};

export function TripRow({ trip, onDelete }: TripRowProps) {
  return (
    <Stack spacing={1.5} sx={{ borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "background.paper", p: 2.5 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          <MuiLink component={Link} href={ROUTES.tripDetails(trip.id)} color="inherit" sx={{ "&:hover": { textDecoration: "underline" } }}>
            {trip.name}
          </MuiLink>{" "}
          <Typography component="span" color="text.secondary">
            (#{trip.id})
          </Typography>
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
          <TripStatusBadge status={trip.status} />
          {trip.status === "draft" ? (
            <Box
              component="button"
              type="button"
              aria-label={`Delete ${trip.name}`}
              onClick={() => onDelete(trip)}
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
          <CalendarBlankIcon size={14} /> Created Date{" "}
          <Typography component="span" color="text.primary" sx={{ fontWeight: 500 }}>
            {formatDateTime(trip.createdAt)}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <CalendarBlankIcon size={14} /> Trip Start Date{" "}
          <Typography component="span" color="text.primary" sx={{ fontWeight: 500 }}>
            {formatDateTime(trip.startAt)}
          </Typography>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={4} sx={{ borderTop: 1, borderColor: "divider", pt: 1.5 }}>
        <AmountChip label="Total Amount" amount={trip.totalAmount} />
        {trip.status === "approved_for_reimbursement" && trip.approvedAmount ? (
          <AmountChip label="Approved Amount" amount={trip.approvedAmount} />
        ) : null}
      </Stack>
    </Stack>
  );
}
