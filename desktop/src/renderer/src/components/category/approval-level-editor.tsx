"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
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
    <Stack spacing={1.5} sx={{ borderRadius: 1.5, border: 1, borderColor: "divider", p: 1.5 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box component="label" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "0.75rem", fontWeight: 400 }}>
            Auto Approve
            <Switch checked={level.autoApprove} onCheckedChange={(checked) => onChange({ ...level, autoApprove: checked })} />
          </Box>
          {onRemove ? (
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${title}`} onClick={onRemove}>
              <Box component="span" sx={{ color: "error.main", display: "flex" }}>
                <TrashIcon size={14} />
              </Box>
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {!level.autoApprove ? (
        <Stack spacing={1}>
          {level.stages.map((stage, stageIndex) => {
            const slots = slotsFromStage(stage);
            const nextLogicGroup = Math.max(-1, ...slots.map((slot) => slot.logicGroup)) + 1;
            return (
              <Stack spacing={1} key={stageIndex} sx={{ borderRadius: 1.5, bgcolor: "action.hover", p: 1 }}>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Stage {stage.stageNumber}
                  </Typography>
                  {level.stages.length > 1 ? (
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove stage ${stage.stageNumber}`} onClick={() => removeStage(stageIndex)}>
                      <Box component="span" sx={{ color: "error.main", display: "flex" }}>
                        <TrashIcon size={12} />
                      </Box>
                    </Button>
                  ) : null}
                </Stack>
                <Stack spacing={0.5}>
                  {slots.map((slot, slotIndex) => (
                    <Stack direction="row" key={slotIndex} spacing={1} sx={{ alignItems: "center" }}>
                      {slotIndex > 0 ? (
                        <Typography variant="caption" sx={{ width: 32, fontWeight: 500 }} color="text.secondary">
                          {slots[slotIndex - 1]!.logicGroup === slot.logicGroup ? "OR" : "AND"}
                        </Typography>
                      ) : (
                        <Box sx={{ width: 32 }} />
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
                        sx={{ flex: 1 }}
                        options={employees.map((employee) => ({ value: String(employee.id), label: `${employee.firstName} ${employee.lastName}` }))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove approver"
                        onClick={() => updateStage(stageIndex, slots.filter((_, i) => i !== slotIndex))}
                      >
                        <Box component="span" sx={{ color: "error.main", display: "flex" }}>
                          <TrashIcon size={12} />
                        </Box>
                      </Button>
                    </Stack>
                  ))}
                </Stack>
                <Stack direction="row" spacing={1}>
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
                </Stack>
              </Stack>
            );
          })}
          <Button type="button" variant="outline" size="sm" onClick={addStage} sx={{ alignSelf: "flex-start" }}>
            <PlusIcon size={12} /> Add Stage
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}
