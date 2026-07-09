"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { updateCategoryEnabledStatus } from "@/apis/category";
import type { CategoryListItem } from "@/types/category.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";

type EnableDisableCategoryDialogProps = {
  category: CategoryListItem | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: (categoryId: number, isEnabled: boolean) => void;
};

// Both directions confirm here — a deliberate departure from 009's Employee
// Listing (instant Activate, confirmed Suspend only), per 014's own Flow.
export function EnableDisableCategoryDialog({ category, onOpenChange, onUpdated }: EnableDisableCategoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextIsEnabled = category ? !category.isEnabled : false;

  async function handleConfirm(): Promise<void> {
    if (!category) return;
    setIsSubmitting(true);
    try {
      const response = await updateCategoryEnabledStatus(category.id, nextIsEnabled);
      onUpdated(category.id, response.category.isEnabled);
      toast.success(nextIsEnabled ? "Category enabled." : "Category disabled.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={category !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{nextIsEnabled ? "Enable Category?" : "Disable Category?"}</DialogTitle>
          <DialogDescription>Are you sure you want to {nextIsEnabled ? "enable" : "disable"} this category?</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            No
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            {nextIsEnabled ? "Yes, Enable" : "Yes, Disable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
