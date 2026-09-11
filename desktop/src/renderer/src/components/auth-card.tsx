import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { Logo } from "@/components/logo";

type AuthCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  sx?: SxProps<Theme>;
};

// 026's MUI Migration Phase 4 — re-styled via Box/Paper/Typography + sx,
// replacing the old Tailwind utility-class layout. `className` is
// replaced by `sx` (this app's own `cn()`-merge convention has no MUI
// equivalent; `sx` objects merge the same way plain object spreads do).
export function AuthCard({ title, description, children, sx }: AuthCardProps) {
  return (
    <Box sx={{ display: "flex", minHeight: "100%", flex: 1, alignItems: "center", justifyContent: "center", bgcolor: "grey.50", px: 2, py: 8 }}>
      <Box sx={{ width: "100%", maxWidth: 384, ...sx }}>
        <Logo sx={{ mb: 3, justifyContent: "center" }} />
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, boxShadow: 1 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            ) : null}
          </Box>
          {children}
        </Paper>
      </Box>
    </Box>
  );
}
