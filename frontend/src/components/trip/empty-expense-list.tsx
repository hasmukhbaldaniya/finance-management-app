import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ChatCircleDotsIcon } from "@phosphor-icons/react";
import { chipColors } from "@/theme/colors";

// The zero-expenses state for the Trip Details page's Expenses panel — its
// sibling, TripExpenseList, covers the case where at least one Claim is
// actually linked to this trip (see trip.controller.ts's getTripDetail).
export function EmptyExpenseList() {
  return (
    <Stack
      spacing={1}
      sx={{ flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "background.paper", py: 8, textAlign: "center" }}
    >
      <Box
        sx={{
          display: "flex",
          width: 56,
          height: 56,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          bgcolor: chipColors.amountIconBackground,
          color: chipColors.amountIconForeground,
        }}
      >
        <ChatCircleDotsIcon size={24} />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        No expenses added yet
      </Typography>
      <Typography variant="body2" color="text.secondary">
        No expenses have been added to this claim.
      </Typography>
    </Stack>
  );
}
