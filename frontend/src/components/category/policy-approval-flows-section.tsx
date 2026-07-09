"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { MAX_APPROVAL_LEVEL, MIN_APPROVAL_LEVEL } from "@/utils/constants/category.constant";
import type { CategoryApprovalLevel, CategoryPolicy } from "@/types/category.type";
import type { EmployeePickerOption } from "@/types/employee.type";
import { ApprovalLevelEditor } from "./approval-level-editor";

type PolicyApprovalFlowsSectionProps = {
  policy: CategoryPolicy;
  employees: EmployeePickerOption[];
  onChange: (policy: CategoryPolicy) => void;
};

function defaultFlowTemplate(): CategoryApprovalLevel {
  return { level: null, isDefaultFlow: true, autoApprove: false, stages: [{ stageNumber: 1, approverGroups: [{ logicGroup: 0, employeeIds: [] }] }] };
}

function numberedLevelTemplate(level: number): CategoryApprovalLevel {
  return { level, isDefaultFlow: false, autoApprove: false, stages: [{ stageNumber: 1, approverGroups: [{ logicGroup: 0, employeeIds: [] }] }] };
}

// Every policy has exactly one Default Flow plus up to 5 optional numbered
// Levels (013's Approval Flows section) — a claim uses whichever numbered
// Level's Rules match it, falling through to the Default Flow otherwise.
export function PolicyApprovalFlowsSection({ policy, employees, onChange }: PolicyApprovalFlowsSectionProps) {
  const defaultFlow = policy.approvalLevels.find((level) => level.isDefaultFlow) ?? defaultFlowTemplate();
  const numberedLevels = policy.approvalLevels.filter((level) => !level.isDefaultFlow).sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  const usedLevelNumbers = new Set(numberedLevels.map((level) => level.level));
  const nextAvailableLevel = Array.from({ length: MAX_APPROVAL_LEVEL - MIN_APPROVAL_LEVEL + 1 }, (_, i) => i + MIN_APPROVAL_LEVEL).find(
    (candidate) => !usedLevelNumbers.has(candidate)
  );

  function replaceAll(nextDefaultFlow: CategoryApprovalLevel, nextNumberedLevels: CategoryApprovalLevel[]): void {
    onChange({ ...policy, approvalLevels: [nextDefaultFlow, ...nextNumberedLevels] });
  }

  function addLevel(): void {
    if (nextAvailableLevel === undefined) return;
    replaceAll(defaultFlow, [...numberedLevels, numberedLevelTemplate(nextAvailableLevel)]);
  }

  function updateNumberedLevel(index: number, updated: CategoryApprovalLevel): void {
    replaceAll(defaultFlow, numberedLevels.map((level, i) => (i === index ? updated : level)));
  }

  function removeNumberedLevel(index: number): void {
    replaceAll(defaultFlow, numberedLevels.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Approval Flows</h4>
      {numberedLevels.map((level, index) => (
        <ApprovalLevelEditor
          key={level.level}
          title={`Level ${level.level}`}
          level={level}
          employees={employees}
          onChange={(updated) => updateNumberedLevel(index, updated)}
          onRemove={() => removeNumberedLevel(index)}
        />
      ))}
      <Button type="button" variant="outline" size="sm" disabled={nextAvailableLevel === undefined} onClick={addLevel}>
        <PlusIcon size={12} /> Add Level
      </Button>
      <ApprovalLevelEditor title="Default Flow" level={defaultFlow} employees={employees} onChange={(updated) => replaceAll(updated, numberedLevels)} />
    </div>
  );
}
