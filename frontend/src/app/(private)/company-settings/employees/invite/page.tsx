"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { NativeSelect } from "@/components/employee-invite/native-select";
import { StepShell } from "@/components/employee-invite/step-shell";
import { createEmployee } from "@/apis/employee";
import { useEmployeeInvite } from "@/contexts/EmployeeInviteContext";
import type { EmployeeGender, EmployeeTitle } from "@/types/employee.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { calculateAge, isEmail, isValidContactNumber, isValidEmployeeName } from "@/utils/helpers/validation.helper";

const TITLES: EmployeeTitle[] = ["Mr", "Mrs", "Ms"];
const GENDERS: EmployeeGender[] = ["Male", "Female", "Other"];
const COUNTRY_CODES = ["+91", "+1", "+44", "+971", "+65"];
const MINIMUM_AGE = 18;

type FieldErrors = {
  title?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  contactNumber?: string;
  dob?: string;
  gender?: string;
  employeeCode?: string;
};

export default function InviteEmployeeBasicInfoPage() {
  const router = useRouter();
  const { basicInfo, setBasicInfo, setEmployeeId, reset } = useEmployeeInvite();

  const [title, setTitle] = useState(basicInfo.title);
  const [firstName, setFirstName] = useState(basicInfo.firstName);
  const [lastName, setLastName] = useState(basicInfo.lastName);
  const [email, setEmail] = useState(basicInfo.email);
  const [countryCode, setCountryCode] = useState(basicInfo.countryCode);
  const [contactNumber, setContactNumber] = useState(basicInfo.contactNumber);
  const [dob, setDob] = useState(basicInfo.dob);
  const [gender, setGender] = useState(basicInfo.gender);
  const [employeeCode, setEmployeeCode] = useState(basicInfo.employeeCode);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};

    if (!title) nextErrors.title = "Select a title.";
    if (!isValidEmployeeName(firstName.trim())) nextErrors.firstName = "First Name is required.";
    if (!isValidEmployeeName(lastName.trim())) nextErrors.lastName = "Last Name is required.";
    if (!isEmail(email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!isValidContactNumber(contactNumber.trim())) nextErrors.contactNumber = "Enter a valid contact number.";
    if (dob) {
      const dobDate = new Date(dob);
      const today = new Date();
      if (dobDate.getTime() > today.getTime()) {
        nextErrors.dob = "Date of birth cannot be in the future.";
      } else if (calculateAge(dobDate, today) < MINIMUM_AGE) {
        nextErrors.dob = "Employee must be at least 18 years old.";
      }
    }
    if (!gender) nextErrors.gender = "Select a gender.";
    if (employeeCode.trim().length > 30) nextErrors.employeeCode = "Employee ID must be at most 30 characters.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { id } = await createEmployee({
        title: title as EmployeeTitle,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        countryCode,
        contactNumber: contactNumber.trim(),
        dob: dob || undefined,
        gender: gender as EmployeeGender,
        employeeCode: employeeCode.trim() || undefined,
      });

      setEmployeeId(id);
      setBasicInfo({ title, firstName, lastName, email, countryCode, contactNumber, dob, gender, employeeCode });
      router.push(ROUTES.EMPLOYEE_INVITE.COMPANY_ACCESS);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        if (error.message.includes("email")) setErrors({ email: error.message });
        else if (error.message.includes("contact number")) setErrors({ contactNumber: error.message });
        else if (error.message.includes("Employee ID")) setErrors({ employeeCode: error.message });
        else toast.error(error.message);
      } else {
        toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel(): void {
    reset();
    router.push(ROUTES.COMPANY_SETTINGS.EMPLOYEES);
  }

  return (
    <StepShell step={1} title="Invite Employee" description="Enter the employee's basic details.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <NativeSelect id="title" value={title} onChange={(e) => setTitle(e.target.value as EmployeeTitle)} hasError={Boolean(errors.title)}>
            <option value="">Select</option>
            {TITLES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </NativeSelect>
          {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            aria-invalid={Boolean(errors.firstName)}
          />
          {errors.firstName ? <p className="text-xs text-destructive">{errors.firstName}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            aria-invalid={Boolean(errors.lastName)}
          />
          {errors.lastName ? <p className="text-xs text-destructive">{errors.lastName}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
        </div>

        <div className="grid grid-cols-[6rem_1fr] gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="countryCode">Code</Label>
            <NativeSelect id="countryCode" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
              {COUNTRY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input
              id="contactNumber"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              aria-invalid={Boolean(errors.contactNumber)}
            />
          </div>
        </div>
        {errors.contactNumber ? <p className="text-xs text-destructive">{errors.contactNumber}</p> : null}

        <div className="space-y-1.5">
          <Label htmlFor="dob">Date of Birth</Label>
          <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} aria-invalid={Boolean(errors.dob)} />
          {errors.dob ? <p className="text-xs text-destructive">{errors.dob}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gender">Gender</Label>
          <NativeSelect id="gender" value={gender} onChange={(e) => setGender(e.target.value as EmployeeGender)} hasError={Boolean(errors.gender)}>
            <option value="">Select</option>
            {GENDERS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </NativeSelect>
          {errors.gender ? <p className="text-xs text-destructive">{errors.gender}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="employeeCode">Employee ID (optional)</Label>
          <Input
            id="employeeCode"
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
            aria-invalid={Boolean(errors.employeeCode)}
          />
          {errors.employeeCode ? <p className="text-xs text-destructive">{errors.employeeCode}</p> : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          Continue
        </Button>

        <p className="text-center text-sm">
          <Link href={ROUTES.COMPANY_SETTINGS.EMPLOYEES} onClick={handleCancel} className="text-primary underline-offset-4 hover:underline">
            Cancel
          </Link>
        </p>
      </form>
    </StepShell>
  );
}
