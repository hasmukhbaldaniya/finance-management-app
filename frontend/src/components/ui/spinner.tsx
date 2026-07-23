import CircularProgress from "@mui/material/CircularProgress";

type SpinnerProps = {
  size?: number;
  className?: string;
};

// 026's MUI Migration — a px `size` replaces the old Tailwind `className`
// sizing utility (`size-4`, `size-6`, etc.), since CircularProgress sets
// width/height via inline style, which a Tailwind utility class can't
// override. 16 matches the old default (`size-4` = 1rem = 16px).
const DEFAULT_SIZE = 16;

function Spinner({ size = DEFAULT_SIZE, className }: SpinnerProps) {
  return <CircularProgress role="status" aria-label="Loading" size={size} className={className} />;
}

export { Spinner };
