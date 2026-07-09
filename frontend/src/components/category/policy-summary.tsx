"use client";

import { useState } from "react";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import type { CategoryPolicy } from "@/types/category.type";

export function PolicySummary({ policy }: { policy: CategoryPolicy }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border">
      <button type="button" onClick={() => setIsOpen((open) => !open)} className="flex w-full items-center gap-2 p-3 text-left">
        {isOpen ? <CaretDownIcon size={14} /> : <CaretRightIcon size={14} />}
        <span className="font-medium">{policy.name}</span>
      </button>
      {isOpen ? (
        <div className="space-y-3 border-t border-border p-3 text-sm">
          <div>
            <p className="font-medium text-muted-foreground">Eligibility</p>
            {policy.eligibility.length === 0 ? (
              <p className="text-muted-foreground">None configured.</p>
            ) : (
              <ul className="list-inside list-disc">
                {policy.eligibility.map((entry) => (
                  <li key={entry.eligibilityType}>
                    {entry.eligibilityType}: {entry.entityIds.join(", ") || "none"}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Rules</p>
            {policy.rules.length === 0 ? (
              <p className="text-muted-foreground">None configured.</p>
            ) : (
              <ul className="list-inside list-disc">
                {policy.rules.map((rule, index) => (
                  <li key={index}>
                    Level {rule.level} —{" "}
                    {rule.ruleType === "field_specific"
                      ? `Field #${rule.fieldId} ${rule.operator} ${rule.value}`
                      : `List field #${rule.comparisonFieldId} = ${rule.comparisonValue}, then Amount field #${rule.amountFieldId} ${rule.amountOperator} ${rule.amountValue}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Approval Flows</p>
            <ul className="list-inside list-disc">
              {policy.approvalLevels.map((level, index) => (
                <li key={index}>
                  {level.isDefaultFlow ? "Default Flow" : `Level ${level.level}`} —{" "}
                  {level.autoApprove
                    ? "Auto Approve"
                    : level.stages
                        .map(
                          (stage) =>
                            `Stage ${stage.stageNumber}: ${stage.approverGroups.map((group) => group.employeeIds.join(" OR ")).join(" AND ")}`
                        )
                        .join("; ")}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
