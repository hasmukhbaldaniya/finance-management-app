"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type DeleteFieldDialogProps = {
  fieldName: string | null;
  dependents: string[];
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

// 013's Flow point 4: deleting a field that other configuration depends on
// shows a confirmation listing what will also be affected before proceeding.
export function DeleteFieldDialog({ fieldName, dependents, onOpenChange, onConfirm }: DeleteFieldDialogProps) {
  return (
    <Dialog open={fieldName !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{fieldName}&rdquo;?</DialogTitle>
          <DialogDescription>
            {dependents.length > 0
              ? `This will also clear configuration that depends on it: ${dependents.join(", ")}.`
              : "This field will be removed from the form."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
