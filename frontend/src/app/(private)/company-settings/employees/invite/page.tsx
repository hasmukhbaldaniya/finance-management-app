"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "@/components/ui/toast";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/select-field";
import { Spinner } from "@/components/ui/spinner";
import { SectionCard } from "@/components/employee-invite/section-card";
import { StepNav, type StepNavItem } from "@/components/employee-invite/step-nav";
import {
  addEmployeeFfNumbers,
  createEmployee,
  getEmployeesForPicker,
  saveEmployeeApprovals,
  sendEmployeeInvite,
  updateEmployeeCompanyAccess,
} from "@/apis/employee";
import { getAirlines } from "@/apis/airline";
import { createProject, getProjects } from "@/apis/project";
import { getDepartments } from "@/apis/department";
import { getGrades } from "@/apis/grade";
import { getRoles } from "@/apis/role";
import type { Airline } from "@/types/airline.type";
import type { Department } from "@/types/department.type";
import { type EmployeeGender, type EmployeePickerOption, type EmployeeTitle } from "@/types/employee.type";
import type { Grade } from "@/types/grade.type";
import type { Project } from "@/types/project.type";
import type { Role } from "@/types/role.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { calculateAge, isEmail, isValidContactNumber, isValidEmployeeName } from "@/utils/helpers/validation.helper";

const TITLES: EmployeeTitle[] = ["Mr", "Mrs", "Ms"];
const GENDERS: EmployeeGender[] = ["Male", "Female", "Other"];
const COUNTRY_CODES = ["+91", "+1", "+44", "+971", "+65"];
const MINIMUM_AGE = 18;
const MAX_FF_NUMBER_LENGTH = 30;
const PICKER_PAGE_SIZE = 100;

const STEPS: StepNavItem[] = [
  { id: "basic-information", label: "Basic Information" },
  { id: "company-access", label: "Company Access" },
  { id: "ff-numbers", label: "FF Numbers" },
  { id: "access-approval", label: "Access & Approval" },
];

type FfRow = {
  airlineId: string;
  ffNumber: string;
};

type ApproverRow = {
  level: number;
  approverEmployeeId: string;
};

type FieldErrors = {
  title?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  contactNumber?: string;
  dob?: string;
  gender?: string;
  employeeCode?: string;
  roleId?: string;
  departmentId?: string;
  gradeId?: string;
  ffRows?: Record<number, string>;
  approvers?: string;
};

function createEmptyFfRow(): FfRow {
  return { airlineId: "", ffNumber: "" };
}

export default function InviteEmployeePage() {
  const router = useRouter();

  // Basic Information
  const [title, setTitle] = useState<EmployeeTitle | "">("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [contactNumber, setContactNumber] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<EmployeeGender | "">("");
  const [employeeCode, setEmployeeCode] = useState("");

  // Company Access
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [roleId, setRoleId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [projectIds, setProjectIds] = useState<number[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // FF Numbers
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [ffRows, setFfRows] = useState<FfRow[]>([createEmptyFfRow()]);

  // Access & Approval
  const [employees, setEmployees] = useState<EmployeePickerOption[]>([]);
  const [approverRows, setApproverRows] = useState<ApproverRow[]>([{ level: 1, approverEmployeeId: "" }]);

  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadOptions(): Promise<void> {
      setIsLoadingOptions(true);
      try {
        const [rolesResult, departmentsResult, gradesResult, airlinesResult, employeesResult] = await Promise.all([
          getRoles({ pageSize: PICKER_PAGE_SIZE }),
          getDepartments({ pageSize: PICKER_PAGE_SIZE }),
          getGrades({ pageSize: PICKER_PAGE_SIZE }),
          getAirlines(),
          getEmployeesForPicker(),
        ]);
        setRoles(rolesResult.roles.filter((role) => role.isActive));
        setDepartments(departmentsResult.departments.filter((department) => department.isActive));
        setGrades(gradesResult.grades.filter((grade) => grade.isActive));
        setAirlines(airlinesResult.airlines);
        setEmployees(employeesResult.employees);
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      } finally {
        setIsLoadingOptions(false);
      }
    }

    void loadOptions();
  }, []);

  useEffect(() => {
    if (!departmentId) {
      setProjects([]);
      setProjectIds([]);
      return;
    }

    async function loadProjects(): Promise<void> {
      setIsLoadingProjects(true);
      try {
        const { projects: departmentProjects } = await getProjects(Number(departmentId));
        setProjects(departmentProjects.filter((project) => project.isActive));
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      } finally {
        setIsLoadingProjects(false);
      }
    }

    setProjectIds([]);
    void loadProjects();
  }, [departmentId]);

  function toggleProject(projectId: number, checked: boolean): void {
    setProjectIds((current) => (checked ? [...current, projectId] : current.filter((id) => id !== projectId)));
  }

  async function handleAddProject(): Promise<void> {
    const name = newProjectName.trim();
    if (!departmentId || name.length < 2) return;

    setIsAddingProject(true);
    try {
      const { project } = await createProject(Number(departmentId), name);
      setProjects((current) => [...current, project]);
      setProjectIds((current) => [...current, project.id]);
      setNewProjectName("");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsAddingProject(false);
    }
  }

  function updateFfRow(index: number, patch: Partial<FfRow>): void {
    setFfRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addFfRow(): void {
    setFfRows((current) => [...current, createEmptyFfRow()]);
  }

  function removeFfRow(index: number): void {
    setFfRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function updateApprover(index: number, approverEmployeeId: string): void {
    setApproverRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, approverEmployeeId } : row))
    );
  }

  function addApproverLevel(): void {
    setApproverRows((current) => [...current, { level: current.length + 1, approverEmployeeId: "" }]);
  }

  function removeApproverLevel(index: number): void {
    setApproverRows((current) =>
      current.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, level: rowIndex + 1 }))
    );
  }

  function validate(filledFfRows: FfRow[]): boolean {
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

    if (!roleId) nextErrors.roleId = "Select a role.";
    if (!departmentId) nextErrors.departmentId = "Select a department.";
    if (!gradeId) nextErrors.gradeId = "Select a grade.";

    const ffRowErrors: Record<number, string> = {};
    const seenAirlineIds = new Set<string>();
    filledFfRows.forEach((row, index) => {
      if (!row.airlineId) {
        ffRowErrors[index] = "Select an airline.";
        return;
      }
      if (!row.ffNumber.trim() || row.ffNumber.trim().length > MAX_FF_NUMBER_LENGTH) {
        ffRowErrors[index] = `Enter a frequent flyer number (max ${MAX_FF_NUMBER_LENGTH} characters).`;
        return;
      }
      if (seenAirlineIds.has(row.airlineId)) {
        ffRowErrors[index] = "This airline is already added.";
        return;
      }
      seenAirlineIds.add(row.airlineId);
    });
    if (Object.keys(ffRowErrors).length > 0) nextErrors.ffRows = ffRowErrors;

    if (!approverRows[0]?.approverEmployeeId) {
      nextErrors.approvers = "Select a Level 1 approver.";
    } else {
      const filledApproverIds = approverRows.filter((row) => row.approverEmployeeId).map((row) => row.approverEmployeeId);
      if (new Set(filledApproverIds).size !== filledApproverIds.length) {
        nextErrors.approvers = "Each approval level must have a different approver.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const filledFfRows = ffRows.filter((row) => row.airlineId || row.ffNumber.trim());
    if (!validate(filledFfRows)) return;

    setIsSubmitting(true);
    try {
      let currentEmployeeId = employeeId;

      if (currentEmployeeId === null) {
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
          currentEmployeeId = id;
          setEmployeeId(id);
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            if (error.message.includes("email")) setErrors((current) => ({ ...current, email: error.message }));
            else if (error.message.includes("contact number")) setErrors((current) => ({ ...current, contactNumber: error.message }));
            else if (error.message.includes("Employee ID")) setErrors((current) => ({ ...current, employeeCode: error.message }));
            else toast.error(error.message);
          } else {
            toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
          }
          return;
        }
      }

      await updateEmployeeCompanyAccess(currentEmployeeId, {
        roleId: Number(roleId),
        departmentId: Number(departmentId),
        gradeId: Number(gradeId),
        projectIds,
      });

      if (filledFfRows.length > 0) {
        await addEmployeeFfNumbers(
          currentEmployeeId,
          filledFfRows.map((row) => ({ airlineId: Number(row.airlineId), ffNumber: row.ffNumber.trim() }))
        );
      }

      await saveEmployeeApprovals(currentEmployeeId, {
        approvers: approverRows
          .filter((row) => row.approverEmployeeId)
          .map((row) => ({ level: row.level, approverEmployeeId: Number(row.approverEmployeeId) })),
      });

      await sendEmployeeInvite(currentEmployeeId);

      toast.success("Invitation sent.");
      router.push(ROUTES.COMPANY_SETTINGS.EMPLOYEES);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Invite Employee</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Fill in any of the sections below in any order, then send the invitation.
      </p>

      {isLoadingOptions ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="mt-6 flex gap-8">
          <StepNav steps={STEPS} />
          <form onSubmit={handleSubmit} noValidate className="min-w-0 flex-1 space-y-6">
          <SectionCard id="basic-information" title="Basic Information" description="The employee's personal details.">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <SelectField
                  id="title"
                  value={title}
                  onValueChange={(value) => setTitle(value as EmployeeTitle)}
                  hasError={Boolean(errors.title)}
                  placeholder="Select"
                  options={TITLES.map((option) => ({ value: option, label: option }))}
                />
                {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} aria-invalid={Boolean(errors.firstName)} />
                {errors.firstName ? <p className="text-xs text-destructive">{errors.firstName}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} aria-invalid={Boolean(errors.lastName)} />
                {errors.lastName ? <p className="text-xs text-destructive">{errors.lastName}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} />
                {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
              </div>

              <div className="grid grid-cols-[6rem_1fr] gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="countryCode">Code</Label>
                  <SelectField
                    id="countryCode"
                    value={countryCode}
                    onValueChange={setCountryCode}
                    options={COUNTRY_CODES.map((code) => ({ value: code, label: code }))}
                  />
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
                <DatePicker id="dob" value={dob} onChange={setDob} placeholder="Select date of birth" className={cn(Boolean(errors.dob) && "border-destructive")} />
                {errors.dob ? <p className="text-xs text-destructive">{errors.dob}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <SelectField
                  id="gender"
                  value={gender}
                  onValueChange={(value) => setGender(value as EmployeeGender)}
                  hasError={Boolean(errors.gender)}
                  placeholder="Select"
                  options={GENDERS.map((option) => ({ value: option, label: option }))}
                />
                {errors.gender ? <p className="text-xs text-destructive">{errors.gender}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="employeeCode">Employee ID (optional)</Label>
                <Input id="employeeCode" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} aria-invalid={Boolean(errors.employeeCode)} />
                {errors.employeeCode ? <p className="text-xs text-destructive">{errors.employeeCode}</p> : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard id="company-access" title="Company Access" description="Assign the employee's role, department, grade, and projects.">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="roleId">Role</Label>
                <SelectField
                  id="roleId"
                  value={roleId}
                  onValueChange={setRoleId}
                  hasError={Boolean(errors.roleId)}
                  placeholder="Select"
                  options={roles.map((role) => ({ value: String(role.id), label: role.name }))}
                />
                {errors.roleId ? <p className="text-xs text-destructive">{errors.roleId}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="departmentId">Department</Label>
                <SelectField
                  id="departmentId"
                  value={departmentId}
                  onValueChange={setDepartmentId}
                  hasError={Boolean(errors.departmentId)}
                  placeholder="Select"
                  options={departments.map((department) => ({ value: String(department.id), label: department.name }))}
                />
                {errors.departmentId ? <p className="text-xs text-destructive">{errors.departmentId}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gradeId">Grade</Label>
                <SelectField
                  id="gradeId"
                  value={gradeId}
                  onValueChange={setGradeId}
                  hasError={Boolean(errors.gradeId)}
                  placeholder="Select"
                  options={grades.map((grade) => ({ value: String(grade.id), label: grade.name }))}
                />
                {errors.gradeId ? <p className="text-xs text-destructive">{errors.gradeId}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label>Projects</Label>
                {!departmentId ? (
                  <p className="text-xs text-muted-foreground">Select a department to see its projects.</p>
                ) : isLoadingProjects ? (
                  <Spinner />
                ) : (
                  <div className="space-y-2">
                    {projects.map((project) => (
                      <div key={project.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`project-${project.id}`}
                          checked={projectIds.includes(project.id)}
                          onCheckedChange={(checked) => toggleProject(project.id, checked === true)}
                        />
                        <Label htmlFor={`project-${project.id}`}>{project.name}</Label>
                      </div>
                    ))}
                    {projects.length === 0 ? <p className="text-xs text-muted-foreground">No projects yet in this department.</p> : null}

                    <div className="flex items-center gap-2 pt-1">
                      <Input placeholder="New project name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} />
                      <Button type="button" variant="outline" size="sm" disabled={isAddingProject} onClick={handleAddProject}>
                        {isAddingProject ? <Spinner /> : null}
                        Add Project
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard id="ff-numbers" title="Frequent Flyer Numbers" description="Optionally add the employee's airline frequent flyer numbers.">
            <div className="space-y-4">
              {ffRows.map((row, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1/2 space-y-1.5">
                    <Label htmlFor={`airline-${index}`}>Airline</Label>
                    <SelectField
                      id={`airline-${index}`}
                      value={row.airlineId}
                      onValueChange={(value) => updateFfRow(index, { airlineId: value })}
                      hasError={Boolean(errors.ffRows?.[index])}
                      placeholder="Select"
                      options={airlines.map((airline) => ({ value: String(airline.id), label: airline.name }))}
                    />
                  </div>
                  <div className="w-1/2 space-y-1.5">
                    <Label htmlFor={`ff-number-${index}`}>FF Number</Label>
                    <Input
                      id={`ff-number-${index}`}
                      value={row.ffNumber}
                      onChange={(e) => updateFfRow(index, { ffNumber: e.target.value })}
                      aria-invalid={Boolean(errors.ffRows?.[index])}
                    />
                  </div>
                  {ffRows.length > 1 ? (
                    <Button type="button" variant="ghost" size="icon" className="mt-6" aria-label="Remove row" onClick={() => removeFfRow(index)}>
                      <XIcon />
                    </Button>
                  ) : null}
                </div>
              ))}
              {errors.ffRows
                ? Object.values(errors.ffRows).map((message, index) => (
                    <p key={index} className="text-xs text-destructive">
                      {message}
                    </p>
                  ))
                : null}

              <Button type="button" variant="outline" size="sm" onClick={addFfRow}>
                <PlusIcon data-icon="inline-start" />
                Add Another
              </Button>
            </div>
          </SectionCard>

          <SectionCard id="access-approval" title="Access & Approval" description="Choose the approver chain.">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Approval Chain</Label>
                {approverRows.map((row, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor={`approver-${index}`}>
                        Level {row.level} Approver{row.level === 1 ? "" : " (optional)"}
                      </Label>
                      <SelectField
                        id={`approver-${index}`}
                        value={row.approverEmployeeId}
                        onValueChange={(value) => updateApprover(index, value)}
                        placeholder="Select"
                        options={employees
                          .filter((employee) => employee.id !== employeeId)
                          .map((employee) => ({ value: String(employee.id), label: `${employee.firstName} ${employee.lastName} (${employee.email})` }))}
                      />
                    </div>
                    {index > 0 ? (
                      <Button type="button" variant="ghost" size="icon" aria-label="Remove level" onClick={() => removeApproverLevel(index)}>
                        <XIcon />
                      </Button>
                    ) : null}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addApproverLevel}>
                  <PlusIcon data-icon="inline-start" />
                  Add Level
                </Button>
              </div>

              {errors.approvers ? <p className="text-xs text-destructive">{errors.approvers}</p> : null}
            </div>
          </SectionCard>

          <div className="flex justify-end gap-2">
            <Button component={Link} href={ROUTES.COMPANY_SETTINGS.EMPLOYEES} variant="outline" size="sm">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : null}
              Send Invite
            </Button>
          </div>
          </form>
        </div>
      )}
    </div>
  );
}
