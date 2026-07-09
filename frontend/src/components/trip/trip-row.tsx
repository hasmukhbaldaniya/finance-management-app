"use client";

import Link from "next/link";
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
    <div className="space-y-3 rounded-lg border border-border bg-background p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">
          <Link href={ROUTES.tripDetails(trip.id)} className="hover:underline">
            {trip.name}
          </Link>{" "}
          <span className="text-muted-foreground">(#{trip.id})</span>
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <TripStatusBadge status={trip.status} />
          {trip.status === "draft" ? (
            <button
              type="button"
              aria-label={`Delete ${trip.name}`}
              onClick={() => onDelete(trip)}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <TrashIcon size={16} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarBlankIcon size={14} /> Created Date <span className="font-medium text-foreground">{formatDateTime(trip.createdAt)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarBlankIcon size={14} /> Trip Start Date <span className="font-medium text-foreground">{formatDateTime(trip.startAt)}</span>
        </span>
      </div>

      <div className="flex gap-8 border-t border-border pt-3">
        <AmountChip label="Total Amount" amount={trip.totalAmount} />
        {trip.status === "approved_for_reimbursement" && trip.approvedAmount ? (
          <AmountChip label="Approved Amount" amount={trip.approvedAmount} />
        ) : null}
      </div>
    </div>
  );
}
