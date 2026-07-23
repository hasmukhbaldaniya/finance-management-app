"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import type { CategoryPolicy } from "@/types/category.type";

export function PolicySummary({ policy }: { policy: CategoryPolicy }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Box sx={{ borderRadius: 2, border: 1, borderColor: "divider" }}>
      <Box
        component="button"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        sx={{ display: "flex", width: "100%", alignItems: "center", gap: 1, p: 1.5, textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
      >
        {isOpen ? <CaretDownIcon size={14} /> : <CaretRightIcon size={14} />}
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {policy.name}
        </Typography>
      </Box>
      {isOpen ? (
        <Stack spacing={1.5} sx={{ borderTop: 1, borderColor: "divider", p: 1.5, fontSize: "0.875rem" }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Eligibility
            </Typography>
            {policy.eligibility.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                None configured.
              </Typography>
            ) : (
              <Box component="ul" sx={{ listStyle: "disc", pl: 2.5, m: 0 }}>
                {policy.eligibility.map((entry) => (
                  <Typography component="li" variant="body2" key={entry.eligibilityType}>
                    {entry.eligibilityType}: {entry.entityIds.join(", ") || "none"}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Rules
            </Typography>
            {policy.rules.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                None configured.
              </Typography>
            ) : (
              <Box component="ul" sx={{ listStyle: "disc", pl: 2.5, m: 0 }}>
                {policy.rules.map((rule, index) => (
                  <Typography component="li" variant="body2" key={index}>
                    Level {rule.level} —{" "}
                    {rule.ruleType === "field_specific"
                      ? `Field #${rule.fieldId} ${rule.operator} ${rule.value}`
                      : `List field #${rule.comparisonFieldId} = ${rule.comparisonValue}, then Amount field #${rule.amountFieldId} ${rule.amountOperator} ${rule.amountValue}`}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Approval Flows
            </Typography>
            <Box component="ul" sx={{ listStyle: "disc", pl: 2.5, m: 0 }}>
              {policy.approvalLevels.map((level, index) => (
                <Typography component="li" variant="body2" key={index}>
                  {level.isDefaultFlow ? "Default Flow" : `Level ${level.level}`} —{" "}
                  {level.autoApprove
                    ? "Auto Approve"
                    : level.stages
                        .map(
                          (stage) =>
                            `Stage ${stage.stageNumber}: ${stage.approverGroups.map((group) => group.employeeIds.join(" OR ")).join(" AND ")}`
                        )
                        .join("; ")}
                </Typography>
              ))}
            </Box>
          </Box>
        </Stack>
      ) : null}
    </Box>
  );
}
