"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MAX_APPROVERS_PER_STAGE } from "@/utils/constants/category.constant";
import type { CategoryApprovalLevel, CategoryApprovalStage } from "@/types/category.type";
import type { EmployeePickerOption } from "@/types/employee.type";

type ApprovalSlot = { logicGroup: number; employeeId: number | null };

function slotsFromStage(stage: CategoryApprovalStage): ApprovalSlot[] {
  return stage.approverGroups.flatMap((group): ApprovalSlot[] =>
    group.employeeIds.length > 0
      ? group.employeeIds.map((employeeId): ApprovalSlot => ({ logicGroup: group.logicGroup, employeeId }))
      : [{ logicGroup: group.logicGroup, employeeId: null }]
  );
}

function stageFromSlots(stageNumber: number, slots: ApprovalSlot[]): CategoryApprovalStage {
  const groupMap = new Map<number, number[]>();
  slots.forEach((slot) => {
    if (slot.employeeId === null) return;
    const existing = groupMap.get(slot.logicGroup) ?? [];
    existing.push(slot.employeeId);
    groupMap.set(slot.logicGroup, existing);
  });
  return {
    stageNumber,
    approverGroups: Array.from(groupMap.entries()).map(([logicGroup, employeeIds]) => ({ logicGroup, employeeIds })),
  };
}

type ApprovalLevelEditorProps = {
  title: string;
  level: CategoryApprovalLevel;
  employees: EmployeePickerOption[];
  onChange: (level: CategoryApprovalLevel) => void;
  onRemove?: () => void;
};

// Shared shape behind every numbered Level and the always-present Default
// Flow (013's Approval Flows section) — a stage's approvers are edited as a
// flat list of slots for simplicity; "+OR" adds a slot sharing the previous
// slot's logicGroup (any one suffices), "+AND" adds one with a fresh
// logicGroup (every group must approve), both counted toward the 1-3 cap.
export function ApprovalLevelEditor({ title, level, employees, onChange, onRemove }: ApprovalLevelEditorProps) {
  function updateStage(stageIndex: number, slots: ApprovalSlot[]): void {
    const stages = level.stages.map((stage, index) => (index === stageIndex ? stageFromSlots(stage.stageNumber, slots) : stage));
    onChange({ ...level, stages });
  }

  function addStage(): void {
    onChange({ ...level, stages: [...level.stages, { stageNumber: level.stages.length + 1, approverGroups: [{ logicGroup: 0, employeeIds: [] }] }] });
  }

  function removeStage(stageIndex: number): void {
    onChange({ ...level, stages: level.stages.filter((_, index) => index !== stageIndex).map((stage, index) => ({ ...stage, stageNumber: index + 1 })) });
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <div className="flex items-center gap-3">
          <Label className="flex items-center gap-2 text-xs font-normal">
            Auto Approve
            <Switch checked={level.autoApprove} onCheckedChange={(checked) => onChange({ ...level, autoApprove: checked })} />
          </Label>
          {onRemove ? (
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${title}`} onClick={onRemove}>
              <TrashIcon size={14} className="text-destructive" />
            </Button>
          ) : null}
        </div>
      </div>

      {!level.autoApprove ? (
        <div className="space-y-2">
          {level.stages.map((stage, stageIndex) => {
            const slots = slotsFromStage(stage);
            const nextLogicGroup = Math.max(-1, ...slots.map((slot) => slot.logicGroup)) + 1;
            return (
              <div key={stageIndex} className="space-y-2 rounded-md bg-muted/40 p-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Stage {stage.stageNumber}</p>
                  {level.stages.length > 1 ? (
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove stage ${stage.stageNumber}`} onClick={() => removeStage(stageIndex)}>
                      <TrashIcon size={12} className="text-destructive" />
                    </Button>
                  ) : null}
                </div>
                <div className="space-y-1">
                  {slots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="flex items-center gap-2">
                      {slotIndex > 0 ? (
                        <span className="w-8 text-xs font-medium text-muted-foreground">
                          {slots[slotIndex - 1]!.logicGroup === slot.logicGroup ? "OR" : "AND"}
                        </span>
                      ) : (
                        <span className="w-8" />
                      )}
                      <SelectField
                        value={slot.employeeId?.toString() ?? ""}
                        onValueChange={(value) =>
                          updateStage(
                            stageIndex,
                            slots.map((current, i) => (i === slotIndex ? { ...current, employeeId: value ? Number(value) : null } : current))
                          )
                        }
                        placeholder="Select approver…"
                        className="flex-1"
                        options={employees.map((employee) => ({ value: String(employee.id), label: `${employee.firstName} ${employee.lastName}` }))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove approver"
                        onClick={() => updateStage(stageIndex, slots.filter((_, i) => i !== slotIndex))}
                      >
                        <TrashIcon size={12} className="text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={slots.length >= MAX_APPROVERS_PER_STAGE}
                    onClick={() => updateStage(stageIndex, [...slots, { logicGroup: slots.at(-1)?.logicGroup ?? 0, employeeId: null }])}
                  >
                    +OR
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={slots.length >= MAX_APPROVERS_PER_STAGE}
                    onClick={() => updateStage(stageIndex, [...slots, { logicGroup: nextLogicGroup, employeeId: null }])}
                  >
                    +AND
                  </Button>
                </div>
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" onClick={addStage}>
            <PlusIcon size={12} /> Add Stage
          </Button>
        </div>
      ) : null}
    </div>
  );
}
