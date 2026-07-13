import type { ReactNode } from "react";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

type SectionCardProps = {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function SectionCard({ id, title, description, children }: SectionCardProps) {
  return (
    <Paper id={id} variant="outlined" sx={{ scrollMarginTop: 96, borderRadius: 2, p: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      ) : null}
      <Box sx={{ mt: 2 }}>{children}</Box>
    </Paper>
  );
}
