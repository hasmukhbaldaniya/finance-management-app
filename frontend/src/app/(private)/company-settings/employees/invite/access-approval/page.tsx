"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { NativeSelect } from "@/components/employee-invite/native-select";
import { StepShell } from "@/components/employee-invite/step-shell";
import { getEmployeesForPicker, saveEmployeeApprovals, sendEmployeeInvite } from "@/apis/employee";
import { useEmployeeInvite } from "@/contexts/EmployeeInviteContext";
import { MODULE_ACCESS_OPTIONS, type EmployeePickerOption, type ModuleAccessKey } from "@/types/employee.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";

type ApproverRow = {
  level: number;
  approverEmployeeId: string;
};

export default function InviteEmployeeAccessApprovalPage() {
  const router = useRouter();
  const { employeeId, reset } = useEmployeeInvite();

  const [employees, setEmployees] = useState<EmployeePickerOption[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [moduleAccess, setModuleAccess] = useState<ModuleAccessKey[]>([]);
  const [approverRows, setApproverRows] = useState<ApproverRow[]>([{ level: 1, approverEmployeeId: "" }]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employeeId === null) {
      router.replace(ROUTES.EMPLOYEE_INVITE.BASIC_INFO);
    }
  }, [employeeId, router]);

  useEffect(() => {
    async function loadEmployees(): Promise<void> {
      setIsLoadingEmployees(true);
      try {
        const { employees: employeeList } = await getEmployeesForPicker();
        setEmployees(employeeList.filter((employee) => employee.id !== employeeId));
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      } finally {
        setIsLoadingEmployees(false);
      }
    }

    void loadEmployees();
  }, [employeeId]);

  function toggleModule(key: ModuleAccessKey, checked: boolean): void {
    setModuleAccess((current) => (checked ? [...current, key] : current.filter((moduleKey) => moduleKey !== key)));
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

  function validate(): boolean {
    if (!approverRows[0]?.approverEmployeeId) {
      setErrorMessage("Select a Level 1 approver.");
      return false;
    }

    const filledApproverIds = approverRows.filter((row) => row.approverEmployeeId).map((row) => row.approverEmployeeId);
    if (new Set(filledApproverIds).size !== filledApproverIds.length) {
      setErrorMessage("Each approval level must have a different approver.");
      return false;
    }

    setErrorMessage("");
    return true;
  }

  async function handleSendInvite(): Promise<void> {
    if (employeeId === null || !validate()) return;

    setIsSubmitting(true);
    try {
      await saveEmployeeApprovals(employeeId, {
        moduleAccess,
        approvers: approverRows
          .filter((row) => row.approverEmployeeId)
          .map((row) => ({ level: row.level, approverEmployeeId: Number(row.approverEmployeeId) })),
      });
      await sendEmployeeInvite(employeeId);
      toast.success("Invitation sent.");
      reset();
      router.push(ROUTES.COMPANY_SETTINGS.EMPLOYEES);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (employeeId === null) return null;

  return (
    <StepShell step={4} title="Access & Approval" description="Choose module access and the approver chain.">
      {isLoadingEmployees ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Module Access</Label>
            {MODULE_ACCESS_OPTIONS.map((option) => (
              <div key={option.key} className="flex items-center gap-2">
                <Checkbox
                  id={`module-${option.key}`}
                  checked={moduleAccess.includes(option.key)}
                  onCheckedChange={(checked) => toggleModule(option.key, checked === true)}
                />
                <Label htmlFor={`module-${option.key}`}>{option.label}</Label>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Label>Approval Chain</Label>
            {approverRows.map((row, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`approver-${index}`}>Level {row.level} Approver{row.level === 1 ? "" : " (optional)"}</Label>
                  <NativeSelect
                    id={`approver-${index}`}
                    value={row.approverEmployeeId}
                    onChange={(e) => updateApprover(index, e.target.value)}
                  >
                    <option value="">Select</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </option>
                    ))}
                  </NativeSelect>
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

          {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}

          <Button type="button" className="w-full" disabled={isSubmitting} onClick={handleSendInvite}>
            {isSubmitting ? <Spinner /> : null}
            Send Invite
          </Button>
        </div>
      )}
    </StepShell>
  );
}
