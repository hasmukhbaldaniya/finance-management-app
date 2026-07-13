"use client";

import Stack from "@mui/material/Stack";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PRIVILEGE_CATALOG, type PrivilegeKey } from "@/utils/constants/privilege.constant";

type PrivilegeCheckboxListProps = {
  selected: PrivilegeKey[];
  onChange?: (privileges: PrivilegeKey[]) => void;
  disabled?: boolean;
};

export function PrivilegeCheckboxList({ selected, onChange, disabled }: PrivilegeCheckboxListProps) {
  function handleToggle(key: PrivilegeKey, checked: boolean): void {
    if (!onChange) return;
    onChange(checked ? [...selected, key] : selected.filter((privilege) => privilege !== key));
  }

  return (
    <Stack spacing={1}>
      {PRIVILEGE_CATALOG.map((privilege) => (
        <Stack direction="row" key={privilege.key} spacing={1} sx={{ alignItems: "center" }}>
          <Checkbox
            id={`privilege-${privilege.key}`}
            checked={selected.includes(privilege.key)}
            disabled={disabled}
            onCheckedChange={(checked) => handleToggle(privilege.key, checked === true)}
          />
          <Label htmlFor={`privilege-${privilege.key}`}>{privilege.label}</Label>
        </Stack>
      ))}
    </Stack>
  );
}
