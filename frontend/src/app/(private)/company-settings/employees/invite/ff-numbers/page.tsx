"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { NativeSelect } from "@/components/employee-invite/native-select";
import { StepShell } from "@/components/employee-invite/step-shell";
import { addEmployeeFfNumbers } from "@/apis/employee";
import { getAirlines } from "@/apis/airline";
import { useEmployeeInvite } from "@/contexts/EmployeeInviteContext";
import type { Airline } from "@/types/airline.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";

const MAX_FF_NUMBER_LENGTH = 30;

type FfRow = {
  airlineId: string;
  ffNumber: string;
};

function createEmptyRow(): FfRow {
  return { airlineId: "", ffNumber: "" };
}

export default function InviteEmployeeFfNumbersPage() {
  const router = useRouter();
  const { employeeId } = useEmployeeInvite();

  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [isLoadingAirlines, setIsLoadingAirlines] = useState(true);
  const [rows, setRows] = useState<FfRow[]>([createEmptyRow()]);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employeeId === null) {
      router.replace(ROUTES.EMPLOYEE_INVITE.BASIC_INFO);
    }
  }, [employeeId, router]);

  useEffect(() => {
    async function loadAirlines(): Promise<void> {
      setIsLoadingAirlines(true);
      try {
        const { airlines: airlineList } = await getAirlines();
        setAirlines(airlineList);
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      } finally {
        setIsLoadingAirlines(false);
      }
    }

    void loadAirlines();
  }, []);

  function updateRow(index: number, patch: Partial<FfRow>): void {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addRow(): void {
    setRows((current) => [...current, createEmptyRow()]);
  }

  function removeRow(index: number): void {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function validate(filledRows: FfRow[]): boolean {
    const nextErrors: Record<number, string> = {};
    const seenAirlineIds = new Set<string>();

    filledRows.forEach((row, index) => {
      if (!row.airlineId) {
        nextErrors[index] = "Select an airline.";
        return;
      }
      if (!row.ffNumber.trim() || row.ffNumber.trim().length > MAX_FF_NUMBER_LENGTH) {
        nextErrors[index] = `Enter a frequent flyer number (max ${MAX_FF_NUMBER_LENGTH} characters).`;
        return;
      }
      if (seenAirlineIds.has(row.airlineId)) {
        nextErrors[index] = "This airline is already added.";
        return;
      }
      seenAirlineIds.add(row.airlineId);
    });

    setRowErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleContinue(): Promise<void> {
    if (employeeId === null) return;

    const filledRows = rows.filter((row) => row.airlineId || row.ffNumber.trim());
    if (filledRows.length === 0) {
      router.push(ROUTES.EMPLOYEE_INVITE.ACCESS_APPROVAL);
      return;
    }

    if (!validate(filledRows)) return;

    setIsSubmitting(true);
    try {
      await addEmployeeFfNumbers(
        employeeId,
        filledRows.map((row) => ({ airlineId: Number(row.airlineId), ffNumber: row.ffNumber.trim() }))
      );
      router.push(ROUTES.EMPLOYEE_INVITE.ACCESS_APPROVAL);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSkip(): void {
    router.push(ROUTES.EMPLOYEE_INVITE.ACCESS_APPROVAL);
  }

  if (employeeId === null) return null;

  return (
    <StepShell step={3} title="Frequent Flyer Numbers" description="Optionally add the employee's airline frequent flyer numbers.">
      {isLoadingAirlines ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="w-1/2 space-y-1.5">
                <Label htmlFor={`airline-${index}`}>Airline</Label>
                <NativeSelect
                  id={`airline-${index}`}
                  value={row.airlineId}
                  onChange={(e) => updateRow(index, { airlineId: e.target.value })}
                  hasError={Boolean(rowErrors[index])}
                >
                  <option value="">Select</option>
                  {airlines.map((airline) => (
                    <option key={airline.id} value={airline.id}>
                      {airline.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="w-1/2 space-y-1.5">
                <Label htmlFor={`ff-number-${index}`}>FF Number</Label>
                <Input
                  id={`ff-number-${index}`}
                  value={row.ffNumber}
                  onChange={(e) => updateRow(index, { ffNumber: e.target.value })}
                  aria-invalid={Boolean(rowErrors[index])}
                />
              </div>
              {rows.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-6"
                  aria-label="Remove row"
                  onClick={() => removeRow(index)}
                >
                  <XIcon />
                </Button>
              ) : null}
            </div>
          ))}
          {Object.values(rowErrors).map((message, index) => (
            <p key={index} className="text-xs text-destructive">
              {message}
            </p>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <PlusIcon data-icon="inline-start" />
            Add Another
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="w-full" onClick={handleSkip}>
              Skip
            </Button>
            <Button type="button" className="w-full" disabled={isSubmitting} onClick={handleContinue}>
              {isSubmitting ? <Spinner /> : null}
              Continue
            </Button>
          </div>
        </div>
      )}
    </StepShell>
  );
}
