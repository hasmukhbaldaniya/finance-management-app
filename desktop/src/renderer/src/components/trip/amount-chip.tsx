import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CurrencyInrIcon } from "@phosphor-icons/react";
import { chipColors } from "@/theme/colors";
import { formatInr } from "@/utils/helpers/format.helper";

type AmountChipProps = {
  label: string;
  amount: string;
};

export function AmountChip({ label, amount }: AmountChipProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Box
        sx={{
          display: "flex",
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 1.5,
          bgcolor: chipColors.amountIconBackground,
          color: chipColors.amountIconForeground,
        }}
      >
        <CurrencyInrIcon size={16} weight="bold" />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, color: chipColors.amountIconForeground }}>
          ₹{formatInr(amount)}
        </Typography>
      </Box>
    </Stack>
  );
}
