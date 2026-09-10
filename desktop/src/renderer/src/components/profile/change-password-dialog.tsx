"use client";

import { useEffect, useState, type FormEvent } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/ui/spinner";
import { changePassword } from "@/apis/auth";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { isStrongPassword } from "@/utils/helpers/validation.helper";

type ChangePasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
};

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setErrors({});
    }
  }, [open]);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};

    if (!currentPassword) nextErrors.currentPassword = "Enter your current password.";
    if (!isStrongPassword(newPassword)) {
      nextErrors.newPassword =
        "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.";
    }
    if (confirmNewPassword !== newPassword) {
      nextErrors.confirmNewPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { message } = await changePassword(currentPassword, newPassword);
      toast.success(message);
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
      if (error instanceof ApiError && error.status === 400 && message.includes("Current password")) {
        setErrors((current) => ({ ...current, currentPassword: message }));
      } else if (error instanceof ApiError && error.status === 400 && message.includes("different from your current")) {
        setErrors((current) => ({ ...current, newPassword: message }));
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>

        <Stack component="form" onSubmit={handleSubmit} noValidate spacing={2}>
          <Stack spacing={0.75}>
            <Label htmlFor="currentPassword">Current Password</Label>
            <PasswordInput
              id="currentPassword"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              aria-invalid={Boolean(errors.currentPassword)}
              autoFocus
            />
            {errors.currentPassword ? (
              <Typography variant="caption" color="error">
                {errors.currentPassword}
              </Typography>
            ) : null}
          </Stack>

          <Stack spacing={0.75}>
            <Label htmlFor="newPassword">New Password</Label>
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              aria-invalid={Boolean(errors.newPassword)}
            />
            {errors.newPassword ? (
              <Typography variant="caption" color="error">
                {errors.newPassword}
              </Typography>
            ) : null}
          </Stack>

          <Stack spacing={0.75}>
            <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
            <PasswordInput
              id="confirmNewPassword"
              autoComplete="new-password"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              aria-invalid={Boolean(errors.confirmNewPassword)}
            />
            {errors.confirmNewPassword ? (
              <Typography variant="caption" color="error">
                {errors.confirmNewPassword}
              </Typography>
            ) : null}
          </Stack>

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
