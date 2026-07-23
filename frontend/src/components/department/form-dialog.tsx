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
import { createDepartment, deleteDepartment, updateDepartment } from "@/apis/department";
import type { Department } from "@/types/department.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";

type DepartmentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department | null;
  onSaved: (department: Department) => void;
  onDeleted: (departmentId: number) => void;
};

export function DepartmentFormDialog({ open, onOpenChange, department, onSaved, onDeleted }: DepartmentFormDialogProps) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(department?.name ?? "");
      setNameError(undefined);
      setIsConfirmingDelete(false);
    }
  }, [open, department]);

  function validate(): boolean {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      setNameError("Enter a department name between 2 and 50 characters.");
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
      const { department: saved } = department
        ? await updateDepartment(department.id, name.trim())
        : await createDepartment(name.trim());
      onSaved(saved);
      toast.success(department ? "Department updated." : "Department created.");
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
    if (!department) return;

    setIsDeleting(true);
    try {
      await deleteDepartment(department.id);
      toast.success("Department deleted.");
      onDeleted(department.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsDeleting(false);
    }
  }

  const canDelete = department ? department.membersCount === 0 : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department ? "Edit Department" : "New Department"}</DialogTitle>
        </DialogHeader>

        <Stack component="form" onSubmit={handleSubmit} noValidate spacing={2}>
          <Stack spacing={0.75}>
            <Label htmlFor="department-name">Department Name</Label>
            <Input
              id="department-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? "department-name-error" : undefined}
              autoFocus
            />
            {nameError ? (
              <Typography id="department-name-error" variant="caption" color="error">
                {nameError}
              </Typography>
            ) : null}
          </Stack>

          {department ? (
            <Box sx={{ borderRadius: 1.5, border: 1, borderColor: "divider", p: 1.5 }}>
              {isConfirmingDelete ? (
                <Stack spacing={1}>
                  <Typography variant="body2">Are you sure you want to delete this department? This cannot be undone.</Typography>
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
                      Delete this department
                    </Typography>
                    {!canDelete ? (
                      <Typography variant="caption" color="text.secondary">
                        This department has {department.membersCount} member(s) assigned. Disable it instead, or
                        reassign those members first.
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
