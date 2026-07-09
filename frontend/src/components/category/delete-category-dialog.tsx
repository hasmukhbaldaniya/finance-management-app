"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { deleteCategory } from "@/apis/category";
import type { CategoryListItem } from "@/types/category.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";

type DeleteCategoryDialogProps = {
  category: CategoryListItem | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (categoryId: number) => void;
};

export function DeleteCategoryDialog({ category, onOpenChange, onDeleted }: DeleteCategoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    if (!category) return;
    setIsSubmitting(true);
    try {
      await deleteCategory(category.id);
      toast.success("Category deleted.");
      onDeleted(category.id);
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
          <DialogTitle>Delete Category?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{category?.name}&rdquo;? This action cannot be undone.
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
