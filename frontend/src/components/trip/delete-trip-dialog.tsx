"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteTrip } from "@/apis/trip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import type { TripListItem } from "@/types/trip.type";

type DeleteTripDialogProps = {
  trip: TripListItem | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (tripId: number) => void;
};

export function DeleteTripDialog({ trip, onOpenChange, onDeleted }: DeleteTripDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    if (!trip) return;
    setIsSubmitting(true);
    try {
      await deleteTrip(trip.id);
      toast.success("Trip deleted.");
      onDeleted(trip.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={trip !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Trip?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{trip?.name}&rdquo;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            No
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            Yes, Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
