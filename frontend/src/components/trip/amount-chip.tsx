import { CurrencyInrIcon } from "@phosphor-icons/react";
import { formatInr } from "@/utils/helpers/format.helper";

type AmountChipProps = {
  label: string;
  amount: string;
};

export function AmountChip({ label, amount }: AmountChipProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-md bg-green-100 text-green-700">
        <CurrencyInrIcon size={16} weight="bold" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-green-700">₹{formatInr(amount)}</p>
      </div>
    </div>
  );
}
