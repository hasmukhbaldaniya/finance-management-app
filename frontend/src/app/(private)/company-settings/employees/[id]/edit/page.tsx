"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
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
  getEmployeeDetail,
  getEmployeesForPicker,
  saveEmployeeApprovals,
  updateEmployeeBasicInfo,
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
  id: string;
  airlineId: string;
  ffNumber: string;
};

type ApproverRow = {
  id: string;
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
  return { id: crypto.randomUUID(), airlineId: "", ffNumber: "" };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Typography variant="caption" color="error">
      {message}
    </Typography>
  );
}

// Reuses 008's exact fields/sections/validation, per 009's own Flow note that
// Edit "reuses [008]'s field-level rules verbatim" — the only differences
// from the Invite page are: pre-filled from GET /employees/:id, every write
// call updates instead of creates, and there's no terminal "Send Invite" step
// (Resend Invitation is a separate row action on the listing, not part of
// editing).
export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const employeeId = Number(params.id);

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
  const [hasLoadedInitialProjects, setHasLoadedInitialProjects] = useState(false);

  // FF Numbers
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [ffRows, setFfRows] = useState<FfRow[]>([createEmptyFfRow()]);

  // Access & Approval
  const [employees, setEmployees] = useState<EmployeePickerOption[]>([]);
  const [approverRows, setApproverRows] = useState<ApproverRow[]>([{ id: crypto.randomUUID(), level: 1, approverEmployeeId: "" }]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadAll(): Promise<void> {
      setIsLoading(true);
      setLoadError(undefined);
      try {
        const [rolesResult, departmentsResult, gradesResult, airlinesResult, employeesResult, detailResult] = await Promise.all([
          getRoles({ pageSize: PICKER_PAGE_SIZE }),
          getDepartments({ pageSize: PICKER_PAGE_SIZE }),
          getGrades({ pageSize: PICKER_PAGE_SIZE }),
          getAirlines(),
          getEmployeesForPicker(),
          getEmployeeDetail(employeeId),
        ]);
        setRoles(rolesResult.roles.filter((role) => role.isActive));
        setDepartments(departmentsResult.departments.filter((department) => department.isActive));
        setGrades(gradesResult.grades.filter((grade) => grade.isActive));
        setAirlines(airlinesResult.airlines);
        setEmployees(employeesResult.employees);

        const { employee } = detailResult;
        setTitle(employee.title ?? "");
        setFirstName(employee.firstName);
        setLastName(employee.lastName);
        setEmail(employee.email);
        setCountryCode(employee.countryCode ?? "+91");
        setContactNumber(employee.contactNumber ?? "");
        setDob(employee.dob ?? "");
        setGender(employee.gender ?? "");
        setEmployeeCode(employee.employeeCode ?? "");
        setRoleId(employee.roleId ? String(employee.roleId) : "");
        setDepartmentId(employee.departmentId ? String(employee.departmentId) : "");
        setGradeId(employee.gradeId ? String(employee.gradeId) : "");
        setProjectIds(employee.projectIds);
        if (employee.ffNumbers.length > 0) {
          setFfRows(employee.ffNumbers.map((row) => ({ id: crypto.randomUUID(), airlineId: String(row.airlineId), ffNumber: row.ffNumber })));
        }
        if (employee.approvers.length > 0) {
          setApproverRows(
            employee.approvers.map((row) => ({ id: crypto.randomUUID(), level: row.level, approverEmployeeId: String(row.approverEmployeeId) }))
          );
        }
      } catch (error) {
        setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      } finally {
        setIsLoading(false);
      }
    }

    void loadAll();
  }, [employeeId]);

  useEffect(() => {
    if (!departmentId) {
      setProjects([]);
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

    // Unlike the Invite page, switching Department here shouldn't clear an
    // already-loaded employee's project selections on the very first load —
    // only reset them on a genuine, user-driven department change afterward.
    if (hasLoadedInitialProjects) setProjectIds([]);
    setHasLoadedInitialProjects(true);
    void loadProjects();
  }, [departmentId, hasLoadedInitialProjects]);

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

  function updateFfRow(id: string, patch: Partial<FfRow>): void {
    setFfRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addFfRow(): void {
    setFfRows((current) => [...current, createEmptyFfRow()]);
  }

  function removeFfRow(id: string): void {
    setFfRows((current) => current.filter((row) => row.id !== id));
  }

  function updateApprover(id: string, approverEmployeeId: string): void {
    setApproverRows((current) => current.map((row) => (row.id === id ? { ...row, approverEmployeeId } : row)));
  }

  function addApproverLevel(): void {
    setApproverRows((current) => [...current, { id: crypto.randomUUID(), level: current.length + 1, approverEmployeeId: "" }]);
  }

  function removeApproverLevel(id: string): void {
    setApproverRows((current) =>
      current.filter((row) => row.id !== id).map((row, rowIndex) => ({ ...row, level: rowIndex + 1 }))
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
      try {
        await updateEmployeeBasicInfo(employeeId, {
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

      await updateEmployeeCompanyAccess(employeeId, {
        roleId: Number(roleId),
        departmentId: Number(departmentId),
        gradeId: Number(gradeId),
        projectIds,
      });

      await addEmployeeFfNumbers(
        employeeId,
        filledFfRows.map((row) => ({ airlineId: Number(row.airlineId), ffNumber: row.ffNumber.trim() }))
      );

      await saveEmployeeApprovals(employeeId, {
        approvers: approverRows
          .filter((row) => row.approverEmployeeId)
          .map((row) => ({ level: row.level, approverEmployeeId: Number(row.approverEmployeeId) })),
      });

      toast.success("Employee updated.");
      router.push(ROUTES.COMPANY_SETTINGS.EMPLOYEES);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Box sx={{ mx: "auto", width: "100%", maxWidth: 1024, flex: 1, px: 2, py: 5 }}>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        Edit Employee
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Update any of the sections below, then save your changes.
      </Typography>

      {loadError ? (
        <Stack sx={{ mt: 3, alignItems: "center", gap: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {loadError}
          </Typography>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </Stack>
      ) : isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <Spinner />
        </Box>
      ) : (
        <Stack direction="row" spacing={4} sx={{ mt: 3 }}>
          <StepNav steps={STEPS} />
          <Stack component="form" onSubmit={handleSubmit} noValidate spacing={3} sx={{ minWidth: 0, flex: 1 }}>
            <SectionCard id="basic-information" title="Basic Information" description="The employee's personal details.">
              <Stack spacing={2}>
                <Stack spacing={0.75}>
                  <Label htmlFor="title">Title</Label>
                  <SelectField
                    id="title"
                    value={title}
                    onValueChange={(value) => setTitle(value as EmployeeTitle)}
                    hasError={Boolean(errors.title)}
                    placeholder="Select"
                    options={TITLES.map((option) => ({ value: option, label: option }))}
                  />
                  <FieldError message={errors.title} />
                </Stack>

                <Stack spacing={0.75}>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} aria-invalid={Boolean(errors.firstName)} />
                  <FieldError message={errors.firstName} />
                </Stack>

                <Stack spacing={0.75}>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} aria-invalid={Boolean(errors.lastName)} />
                  <FieldError message={errors.lastName} />
                </Stack>

                <Stack spacing={0.75}>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} />
                  <FieldError message={errors.email} />
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: "6rem 1fr", gap: 1 }}>
                  <Stack spacing={0.75}>
                    <Label htmlFor="countryCode">Code</Label>
                    <SelectField id="countryCode" value={countryCode} onValueChange={setCountryCode} options={COUNTRY_CODES.map((code) => ({ value: code, label: code }))} />
                  </Stack>
                  <Stack spacing={0.75}>
                    <Label htmlFor="contactNumber">Contact Number</Label>
                    <Input id="contactNumber" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} aria-invalid={Boolean(errors.contactNumber)} />
                  </Stack>
                </Box>
                <FieldError message={errors.contactNumber} />

                <Stack spacing={0.75}>
                  <Label htmlFor="dob">Date of Birth</Label>
                  <DatePicker id="dob" value={dob} onChange={setDob} placeholder="Select date of birth" />
                  <FieldError message={errors.dob} />
                </Stack>

                <Stack spacing={0.75}>
                  <Label htmlFor="gender">Gender</Label>
                  <SelectField
                    id="gender"
                    value={gender}
                    onValueChange={(value) => setGender(value as EmployeeGender)}
                    hasError={Boolean(errors.gender)}
                    placeholder="Select"
                    options={GENDERS.map((option) => ({ value: option, label: option }))}
                  />
                  <FieldError message={errors.gender} />
                </Stack>

                <Stack spacing={0.75}>
                  <Label htmlFor="employeeCode">Employee ID (optional)</Label>
                  <Input id="employeeCode" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} aria-invalid={Boolean(errors.employeeCode)} />
                  <FieldError message={errors.employeeCode} />
                </Stack>
              </Stack>
            </SectionCard>

            <SectionCard id="company-access" title="Company Access" description="Assign the employee's role, department, grade, and projects.">
              <Stack spacing={2}>
                <Stack spacing={0.75}>
                  <Label htmlFor="roleId">Role</Label>
                  <SelectField
                    id="roleId"
                    value={roleId}
                    onValueChange={setRoleId}
                    hasError={Boolean(errors.roleId)}
                    placeholder="Select"
                    options={roles.map((role) => ({ value: String(role.id), label: role.name }))}
                  />
                  <FieldError message={errors.roleId} />
                </Stack>

                <Stack spacing={0.75}>
                  <Label htmlFor="departmentId">Department</Label>
                  <SelectField
                    id="departmentId"
                    value={departmentId}
                    onValueChange={setDepartmentId}
                    hasError={Boolean(errors.departmentId)}
                    placeholder="Select"
                    options={departments.map((department) => ({ value: String(department.id), label: department.name }))}
                  />
                  <FieldError message={errors.departmentId} />
                </Stack>

                <Stack spacing={0.75}>
                  <Label htmlFor="gradeId">Grade</Label>
                  <SelectField
                    id="gradeId"
                    value={gradeId}
                    onValueChange={setGradeId}
                    hasError={Boolean(errors.gradeId)}
                    placeholder="Select"
                    options={grades.map((grade) => ({ value: String(grade.id), label: grade.name }))}
                  />
                  <FieldError message={errors.gradeId} />
                </Stack>

                <Stack spacing={0.75}>
                  <Label>Projects</Label>
                  {!departmentId ? (
                    <Typography variant="caption" color="text.secondary">
                      Select a department to see its projects.
                    </Typography>
                  ) : isLoadingProjects ? (
                    <Spinner />
                  ) : (
                    <Stack spacing={1}>
                      {projects.map((project) => (
                        <Stack direction="row" key={project.id} spacing={1} sx={{ alignItems: "center" }}>
                          <Checkbox id={`project-${project.id}`} checked={projectIds.includes(project.id)} onCheckedChange={(checked) => toggleProject(project.id, checked === true)} />
                          <Label htmlFor={`project-${project.id}`}>{project.name}</Label>
                        </Stack>
                      ))}
                      {projects.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          No projects yet in this department.
                        </Typography>
                      ) : null}

                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", pt: 0.5 }}>
                        <Input placeholder="New project name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} />
                        <Button type="button" variant="outline" size="sm" disabled={isAddingProject} onClick={handleAddProject}>
                          {isAddingProject ? <Spinner /> : null}
                          Add Project
                        </Button>
                      </Stack>
                    </Stack>
                  )}
                </Stack>
              </Stack>
            </SectionCard>

            <SectionCard id="ff-numbers" title="Frequent Flyer Numbers" description="Optionally add the employee's airline frequent flyer numbers.">
              <Stack spacing={2}>
                {ffRows.map((row, index) => (
                  <Stack direction="row" key={row.id} spacing={1} sx={{ alignItems: "flex-start" }}>
                    <Stack spacing={0.75} sx={{ width: "50%" }}>
                      <Label htmlFor={`airline-${index}`}>Airline</Label>
                      <SelectField
                        id={`airline-${index}`}
                        value={row.airlineId}
                        onValueChange={(value) => updateFfRow(row.id, { airlineId: value })}
                        hasError={Boolean(errors.ffRows?.[index])}
                        placeholder="Select"
                        options={airlines.map((airline) => ({ value: String(airline.id), label: airline.name }))}
                      />
                    </Stack>
                    <Stack spacing={0.75} sx={{ width: "50%" }}>
                      <Label htmlFor={`ff-number-${index}`}>FF Number</Label>
                      <Input id={`ff-number-${index}`} value={row.ffNumber} onChange={(e) => updateFfRow(row.id, { ffNumber: e.target.value })} aria-invalid={Boolean(errors.ffRows?.[index])} />
                    </Stack>
                    {ffRows.length > 1 ? (
                      <Button type="button" variant="ghost" size="icon" sx={{ mt: 3 }} aria-label="Remove row" onClick={() => removeFfRow(row.id)}>
                        <XIcon size={16} />
                      </Button>
                    ) : null}
                  </Stack>
                ))}
                {errors.ffRows ? Object.values(errors.ffRows).map((message, index) => <FieldError key={index} message={message} />) : null}

                <Button type="button" variant="outline" size="sm" onClick={addFfRow} sx={{ alignSelf: "flex-start" }}>
                  <PlusIcon size={14} />
                  Add Another
                </Button>
              </Stack>
            </SectionCard>

            <SectionCard id="access-approval" title="Access & Approval" description="Choose the approver chain.">
              <Stack spacing={3}>
                <Stack spacing={1.5}>
                  <Label>Approval Chain</Label>
                  {approverRows.map((row, index) => (
                    <Stack direction="row" key={row.id} spacing={1} sx={{ alignItems: "flex-end" }}>
                      <Stack spacing={0.75} sx={{ flex: 1 }}>
                        <Label htmlFor={`approver-${index}`}>
                          Level {row.level} Approver{row.level === 1 ? "" : " (optional)"}
                        </Label>
                        <SelectField
                          id={`approver-${index}`}
                          value={row.approverEmployeeId}
                          onValueChange={(value) => updateApprover(row.id, value)}
                          placeholder="Select"
                          options={employees
                            .filter((employee) => employee.id !== employeeId)
                            .map((employee) => ({ value: String(employee.id), label: `${employee.firstName} ${employee.lastName} (${employee.email})` }))}
                        />
                      </Stack>
                      {index > 0 ? (
                        <Button type="button" variant="ghost" size="icon" aria-label="Remove level" onClick={() => removeApproverLevel(row.id)}>
                          <XIcon size={16} />
                        </Button>
                      ) : null}
                    </Stack>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addApproverLevel} sx={{ alignSelf: "flex-start" }}>
                    <PlusIcon size={14} />
                    Add Level
                  </Button>
                </Stack>

                <FieldError message={errors.approvers} />
              </Stack>
            </SectionCard>

            <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
              <Button component={Link} href={ROUTES.COMPANY_SETTINGS.EMPLOYEES} variant="outline" size="sm">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? <Spinner /> : null}
                Save Changes
              </Button>
            </Stack>
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
