"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useSession } from "@/contexts/SessionContext";

export default function DashboardPage() {
  const { user, organization } = useSession();

  return (
    <Stack spacing={3} sx={{ flex: 1, alignItems: "center", justifyContent: "center", px: 2, py: 5 }}>
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
          Welcome, {user.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {user.email}
        </Typography>
        {organization ? (
          <Box sx={{ mt: 2, borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "background.paper", px: 2, py: 1.5, textAlign: "left" }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Organization
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
              {organization.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              GSTIN: {organization.gstNumber}
            </Typography>
          </Box>
        ) : null}
      </Box>
    </Stack>
  );
}
