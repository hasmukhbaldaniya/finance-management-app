import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CheckCircleIcon, CircleNotchIcon } from "@phosphor-icons/react";
import type { ProcessingStatus } from "@/types/claim.type";

// 023's AI Processing Pipeline — a fixed, illustrative 4-stage sequence for
// the whole batch (not a literal per-source progress bar, per that story's
// own Flow), driven by how many of the batch's sources have resolved so far.
const STAGES = ["Reading invoice", "Identifying expense types", "Filling in the details", "Checking policy compliance"];

export function AiProcessingPipeline({ status }: { status: ProcessingStatus | null }) {
  const ratio = status && status.totalSources > 0 ? status.resolvedSources / status.totalSources : 0;
  const activeStageIndex = Math.min(STAGES.length - 1, Math.floor(ratio * STAGES.length));

  return (
    <Stack spacing={4} sx={{ mx: "auto", maxWidth: 448, px: 3, py: 8, textAlign: "center" }}>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        Reading your invoices…
      </Typography>
      <Stack component="ul" spacing={1.5} sx={{ textAlign: "left", listStyle: "none", p: 0, m: 0 }}>
        {STAGES.map((stage, index) => {
          const isDone = index < activeStageIndex || (status?.isComplete && index === STAGES.length - 1);
          const isActive = index === activeStageIndex && !status?.isComplete;
          return (
            <Stack component="li" direction="row" key={stage} spacing={1.5} sx={{ alignItems: "center", fontSize: "0.875rem" }}>
              {isDone ? (
                <Box sx={{ display: "flex", color: "success.main" }}>
                  <CheckCircleIcon size={20} weight="fill" />
                </Box>
              ) : isActive ? (
                <Box sx={{ display: "flex", color: "primary.main", animation: "spin 1s linear infinite", "@keyframes spin": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } } }}>
                  <CircleNotchIcon size={20} />
                </Box>
              ) : (
                <Box sx={{ width: 20, height: 20, borderRadius: "50%", border: 1, borderColor: "divider" }} />
              )}
              <Typography variant="body2" color={isDone || isActive ? "text.primary" : "text.secondary"}>
                {stage}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
      {status ? (
        <Stack direction="row" spacing={4} sx={{ justifyContent: "center", borderTop: 1, borderColor: "divider", pt: 3 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Expenses
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {status.totalExpenses}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Amount
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              ₹{status.totalAmount}
            </Typography>
          </Box>
        </Stack>
      ) : null}
    </Stack>
  );
}
