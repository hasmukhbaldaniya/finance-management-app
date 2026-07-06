"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { NativeSelect } from "@/components/employee-invite/native-select";
import { StepShell } from "@/components/employee-invite/step-shell";
import { updateEmployeeCompanyAccess } from "@/apis/employee";
import { createProject, getProjects } from "@/apis/project";
import { getDepartments } from "@/apis/department";
import { getGrades } from "@/apis/grade";
import { getRoles } from "@/apis/role";
import { useEmployeeInvite } from "@/contexts/EmployeeInviteContext";
import type { Department } from "@/types/department.type";
import type { Grade } from "@/types/grade.type";
import type { Project } from "@/types/project.type";
import type { Role } from "@/types/role.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";

const PICKER_PAGE_SIZE = 100;

type FieldErrors = {
  roleId?: string;
  departmentId?: string;
  gradeId?: string;
};

export default function InviteEmployeeCompanyAccessPage() {
  const router = useRouter();
  const { employeeId } = useEmployeeInvite();

  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const [roleId, setRoleId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [projectIds, setProjectIds] = useState<number[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [isAddingProject, setIsAddingProject] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employeeId === null) {
      router.replace(ROUTES.EMPLOYEE_INVITE.BASIC_INFO);
    }
  }, [employeeId, router]);

  useEffect(() => {
    async function loadOptions(): Promise<void> {
      setIsLoadingOptions(true);
      try {
        const [rolesResult, departmentsResult, gradesResult] = await Promise.all([
          getRoles({ pageSize: PICKER_PAGE_SIZE }),
          getDepartments({ pageSize: PICKER_PAGE_SIZE }),
          getGrades({ pageSize: PICKER_PAGE_SIZE }),
        ]);
        setRoles(rolesResult.roles.filter((role) => role.isActive));
        setDepartments(departmentsResult.departments.filter((department) => department.isActive));
        setGrades(gradesResult.grades.filter((grade) => grade.isActive));
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

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    if (!roleId) nextErrors.roleId = "Select a role.";
    if (!departmentId) nextErrors.departmentId = "Select a department.";
    if (!gradeId) nextErrors.gradeId = "Select a grade.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (employeeId === null || !validate()) return;

    setIsSubmitting(true);
    try {
      await updateEmployeeCompanyAccess(employeeId, {
        roleId: Number(roleId),
        departmentId: Number(departmentId),
        gradeId: Number(gradeId),
        projectIds,
      });
      router.push(ROUTES.EMPLOYEE_INVITE.FF_NUMBERS);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (employeeId === null) return null;

  return (
    <StepShell step={2} title="Company Access" description="Assign the employee's role, department, and grade.">
      {isLoadingOptions ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="roleId">Role</Label>
            <NativeSelect id="roleId" value={roleId} onChange={(e) => setRoleId(e.target.value)} hasError={Boolean(errors.roleId)}>
              <option value="">Select</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </NativeSelect>
            {errors.roleId ? <p className="text-xs text-destructive">{errors.roleId}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="departmentId">Department</Label>
            <NativeSelect
              id="departmentId"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              hasError={Boolean(errors.departmentId)}
            >
              <option value="">Select</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </NativeSelect>
            {errors.departmentId ? <p className="text-xs text-destructive">{errors.departmentId}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gradeId">Grade</Label>
            <NativeSelect id="gradeId" value={gradeId} onChange={(e) => setGradeId(e.target.value)} hasError={Boolean(errors.gradeId)}>
              <option value="">Select</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </NativeSelect>
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
                  <Input
                    placeholder="New project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                  <Button type="button" variant="outline" size="sm" disabled={isAddingProject} onClick={handleAddProject}>
                    {isAddingProject ? <Spinner /> : null}
                    Add Project
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            Continue
          </Button>
        </form>
      )}
    </StepShell>
  );
}
