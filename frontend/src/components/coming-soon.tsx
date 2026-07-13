import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type ComingSoonProps = {
  title: string;
};

export function ComingSoon({ title }: ComingSoonProps) {
  return (
    <Stack spacing={1} sx={{ flex: 1, alignItems: "center", justifyContent: "center", px: 2, py: 5, textAlign: "center" }}>
      <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        This page is coming soon.
      </Typography>
    </Stack>
  );
}
