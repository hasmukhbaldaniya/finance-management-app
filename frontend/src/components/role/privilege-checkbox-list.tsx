"use client";

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
    <div className="space-y-2">
      {PRIVILEGE_CATALOG.map((privilege) => (
        <div key={privilege.key} className="flex items-center gap-2">
          <Checkbox
            id={`privilege-${privilege.key}`}
            checked={selected.includes(privilege.key)}
            disabled={disabled}
            onCheckedChange={(checked) => handleToggle(privilege.key, checked === true)}
          />
          <Label htmlFor={`privilege-${privilege.key}`}>{privilege.label}</Label>
        </div>
      ))}
    </div>
  );
}
