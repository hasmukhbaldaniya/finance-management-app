"use client";

import { useEffect, useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { DatePicker } from "@/components/date-picker";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { resendMyMobileOtp, setMyMobile, updateMyProfile, verifyMyMobileOtp } from "@/apis/employee";
import type { EmployeeGender, EmployeeTitle, MyProfile } from "@/types/employee.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { calculateAge, isValidContactNumber, isValidEmployeeName, isValidOtp } from "@/utils/helpers/validation.helper";

const TITLES: EmployeeTitle[] = ["Mr", "Mrs", "Ms"];
const GENDERS: EmployeeGender[] = ["Male", "Female", "Other"];
const MINIMUM_AGE = 18;
const MAX_EMPLOYEE_CODE_LENGTH = 30;

type EditProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: MyProfile;
  onSaved: (profile: MyProfile) => void;
};

type FieldErrors = {
  title?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  employeeCode?: string;
  contactNumber?: string;
};

type Mode = "edit" | "verify-mobile";

export function EditProfileDialog({ open, onOpenChange, profile, onSaved }: EditProfileDialogProps) {
  const [mode, setMode] = useState<Mode>("edit");

  const [title, setTitle] = useState<EmployeeTitle | "">("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<EmployeeGender | "">("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | undefined>();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [pendingContactNumber, setPendingContactNumber] = useState("");

  useEffect(() => {
    if (open) {
      setMode("edit");
      setTitle(profile.title ?? "");
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setDob(profile.dob ?? "");
      setGender(profile.gender ?? "");
      setEmployeeCode(profile.employeeCode ?? "");
      setCountryCode(profile.countryCode ?? "+91");
      setContactNumber(profile.contactNumber ?? "");
      setErrors({});
      setOtp("");
      setOtpError(undefined);
    }
  }, [open, profile]);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};

    if (!title) nextErrors.title = "Select a valid title.";
    if (!isValidEmployeeName(firstName.trim())) nextErrors.firstName = "First Name is required.";
    if (!isValidEmployeeName(lastName.trim())) nextErrors.lastName = "Last Name is required.";
    if (dob) {
      const dobDate = new Date(dob);
      const today = new Date();
      if (dobDate.getTime() > today.getTime()) {
        nextErrors.dob = "Date of birth cannot be in the future.";
      } else if (calculateAge(dobDate, today) < MINIMUM_AGE) {
        nextErrors.dob = "Employee must be at least 18 years old.";
      }
    }
    if (!gender) nextErrors.gender = "Select a valid gender.";
    if (employeeCode.trim().length > MAX_EMPLOYEE_CODE_LENGTH) {
      nextErrors.employeeCode = "Employee ID must be at most 30 characters.";
    }
    if (!isValidContactNumber(contactNumber.trim())) {
      nextErrors.contactNumber = "Enter a valid contact number.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!validate() || !title || !gender) return;

    const contactNumberChanged = countryCode !== (profile.countryCode ?? "+91") || contactNumber.trim() !== (profile.contactNumber ?? "");

    setIsSaving(true);
    try {
      await updateMyProfile({
        title,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob: dob || undefined,
        gender,
        employeeCode: employeeCode.trim() || undefined,
      });

      if (contactNumberChanged) {
        await setMyMobile(countryCode, contactNumber.trim());
        setPendingContactNumber(contactNumber.trim());
        setMode("verify-mobile");
        toast.success("OTP sent to your mobile number.");
        return;
      }

      toast.success("Profile updated.");
      onSaved({
        ...profile,
        title,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob: dob || null,
        gender,
        employeeCode: employeeCode.trim() || null,
      });
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
      if (error instanceof ApiError && error.status === 409 && message.includes("Employee ID")) {
        setErrors((current) => ({ ...current, employeeCode: message }));
      } else if (error instanceof ApiError && error.status === 409 && message.includes("contact number")) {
        setErrors((current) => ({ ...current, contactNumber: message }));
      } else {
        toast.error(message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleVerifyOtp(): Promise<void> {
    if (!isValidOtp(otp)) {
      setOtpError("Enter the 6-digit OTP.");
      return;
    }
    setOtpError(undefined);

    setIsVerifying(true);
    try {
      await verifyMyMobileOtp(otp);
      toast.success("Mobile number updated.");
      onSaved({
        ...profile,
        title: title as EmployeeTitle,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob: dob || null,
        gender: gender as EmployeeGender,
        employeeCode: employeeCode.trim() || null,
        countryCode,
        contactNumber: pendingContactNumber,
      });
      onOpenChange(false);
    } catch (error) {
      setOtpError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResendOtp(): Promise<void> {
    setIsResending(true);
    try {
      const { message } = await resendMyMobileOtp();
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsResending(false);
    }
  }

  if (mode === "verify-mobile") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify your new mobile number</DialogTitle>
          </DialogHeader>

          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Enter the 6-digit code sent to {pendingContactNumber}.
            </Typography>
            <Stack spacing={0.75}>
              <Label htmlFor="mobile-otp">OTP</Label>
              <Input
                id="mobile-otp"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                aria-invalid={Boolean(otpError)}
                autoFocus
              />
              {otpError ? (
                <Typography variant="caption" color="error">
                  {otpError}
                </Typography>
              ) : null}
            </Stack>
            <Box
              component="button"
              type="button"
              onClick={handleResendOtp}
              disabled={isResending}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                fontSize: "0.875rem",
                color: "primary.main",
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: isResending ? 0.5 : 1,
                "&:hover": { textDecoration: "underline" },
              }}
            >
              {isResending ? <Spinner size={14} /> : null}
              Resend OTP
            </Box>
          </Stack>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={isVerifying} onClick={handleVerifyOtp}>
              {isVerifying ? <Spinner /> : null}
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent sx={{ maxHeight: "85vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <Stack component="form" onSubmit={handleSubmit} noValidate spacing={2}>
          <Stack spacing={0.75}>
            <Label htmlFor="edit-title">Title</Label>
            <SelectField
              id="edit-title"
              value={title}
              onValueChange={(value) => setTitle(value as EmployeeTitle)}
              hasError={Boolean(errors.title)}
              placeholder="Select"
              options={TITLES.map((option) => ({ value: option, label: option }))}
            />
            {errors.title ? (
              <Typography variant="caption" color="error">
                {errors.title}
              </Typography>
            ) : null}
          </Stack>

          <Stack spacing={0.75}>
            <Label htmlFor="edit-firstName">First Name</Label>
            <Input id="edit-firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} aria-invalid={Boolean(errors.firstName)} />
            {errors.firstName ? (
              <Typography variant="caption" color="error">
                {errors.firstName}
              </Typography>
            ) : null}
          </Stack>

          <Stack spacing={0.75}>
            <Label htmlFor="edit-lastName">Last Name</Label>
            <Input id="edit-lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} aria-invalid={Boolean(errors.lastName)} />
            {errors.lastName ? (
              <Typography variant="caption" color="error">
                {errors.lastName}
              </Typography>
            ) : null}
          </Stack>

          <Stack spacing={0.75}>
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" value={profile.email} disabled readOnly />
          </Stack>

          <Box sx={{ display: "grid", gridTemplateColumns: "6rem 1fr", gap: 1 }}>
            <Stack spacing={0.75}>
              <Label htmlFor="edit-countryCode">Code</Label>
              <Input id="edit-countryCode" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} />
            </Stack>
            <Stack spacing={0.75}>
              <Label htmlFor="edit-contactNumber">Contact Number</Label>
              <Input
                id="edit-contactNumber"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                aria-invalid={Boolean(errors.contactNumber)}
              />
            </Stack>
          </Box>
          {errors.contactNumber ? (
            <Typography variant="caption" color="error">
              {errors.contactNumber}
            </Typography>
          ) : null}
          <Typography variant="caption" color="text.secondary">
            Changing this sends an OTP to the new number before it takes effect.
          </Typography>

          <Stack spacing={0.75}>
            <Label htmlFor="edit-dob">Date of Birth</Label>
            <DatePicker id="edit-dob" value={dob} onChange={setDob} placeholder="Select date of birth" hasError={Boolean(errors.dob)} />
            {errors.dob ? (
              <Typography variant="caption" color="error">
                {errors.dob}
              </Typography>
            ) : null}
          </Stack>

          <Stack spacing={0.75}>
            <Label htmlFor="edit-gender">Gender</Label>
            <SelectField
              id="edit-gender"
              value={gender}
              onValueChange={(value) => setGender(value as EmployeeGender)}
              hasError={Boolean(errors.gender)}
              placeholder="Select"
              options={GENDERS.map((option) => ({ value: option, label: option }))}
            />
            {errors.gender ? (
              <Typography variant="caption" color="error">
                {errors.gender}
              </Typography>
            ) : null}
          </Stack>

          <Stack spacing={0.75}>
            <Label htmlFor="edit-employeeCode">Employee ID (optional)</Label>
            <Input
              id="edit-employeeCode"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              aria-invalid={Boolean(errors.employeeCode)}
            />
            {errors.employeeCode ? (
              <Typography variant="caption" color="error">
                {errors.employeeCode}
              </Typography>
            ) : null}
          </Stack>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Spinner /> : null}
              Save
            </Button>
          </DialogFooter>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
