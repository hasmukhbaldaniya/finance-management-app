"use client";

import { useEffect, useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createGrade, deleteGrade, updateGrade } from "@/apis/grade";
import type { Grade } from "@/types/grade.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";

type GradeFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grade: Grade | null;
  onSaved: (grade: Grade) => void;
  onDeleted: (gradeId: number) => void;
};

export function GradeFormDialog({ open, onOpenChange, grade, onSaved, onDeleted }: GradeFormDialogProps) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(grade?.name ?? "");
      setNameError(undefined);
      setIsConfirmingDelete(false);
    }
  }, [open, grade]);

  function validate(): boolean {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      setNameError("Enter a grade name between 2 and 50 characters.");
      return false;
    }
    setNameError(undefined);
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { grade: saved } = grade ? await updateGrade(grade.id, name.trim()) : await createGrade(name.trim());
      onSaved(saved);
      toast.success(grade ? "Grade updated." : "Grade created.");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setNameError(error.message);
      } else {
        toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!grade) return;

    setIsDeleting(true);
    try {
      await deleteGrade(grade.id);
      toast.success("Grade deleted.");
      onDeleted(grade.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsDeleting(false);
    }
  }

  const canDelete = grade ? grade.membersCount === 0 : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{grade ? "Edit Grade" : "New Grade"}</DialogTitle>
        </DialogHeader>

        <Stack component="form" onSubmit={handleSubmit} noValidate spacing={2}>
          <Stack spacing={0.75}>
            <Label htmlFor="grade-name">Grade Name</Label>
            <Input
              id="grade-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? "grade-name-error" : undefined}
              autoFocus
            />
            {nameError ? (
              <Typography id="grade-name-error" variant="caption" color="error">
                {nameError}
              </Typography>
            ) : null}
          </Stack>

          {grade ? (
            <Box sx={{ borderRadius: 1.5, border: 1, borderColor: "divider", p: 1.5 }}>
              {isConfirmingDelete ? (
                <Stack spacing={1}>
                  <Typography variant="body2">Are you sure you want to delete this grade? This cannot be undone.</Typography>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsConfirmingDelete(false)}>
                      Cancel
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                      {isDeleting ? <Spinner /> : null}
                      Delete
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Delete this grade
                    </Typography>
                    {!canDelete ? (
                      <Typography variant="caption" color="text.secondary">
                        This grade has {grade.membersCount} member(s) assigned. Disable it instead, or reassign those
                        members first.
                      </Typography>
                    ) : null}
                  </Box>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={!canDelete}
                    onClick={() => setIsConfirmingDelete(true)}
                  >
                    Delete
                  </Button>
                </Stack>
              )}
            </Box>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : null}
              Save
            </Button>
          </DialogFooter>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
