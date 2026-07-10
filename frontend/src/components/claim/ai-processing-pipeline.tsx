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
    <div className="mx-auto max-w-md space-y-8 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">Reading your invoices…</h1>
      <ul className="space-y-3 text-left">
        {STAGES.map((stage, index) => {
          const isDone = index < activeStageIndex || (status?.isComplete && index === STAGES.length - 1);
          const isActive = index === activeStageIndex && !status?.isComplete;
          return (
            <li key={stage} className="flex items-center gap-3 text-sm">
              {isDone ? (
                <CheckCircleIcon size={20} weight="fill" className="text-green-600" />
              ) : isActive ? (
                <CircleNotchIcon size={20} className="animate-spin text-primary" />
              ) : (
                <span className="size-5 rounded-full border border-border" />
              )}
              <span className={isDone || isActive ? "text-foreground" : "text-muted-foreground"}>{stage}</span>
            </li>
          );
        })}
      </ul>
      {status ? (
        <div className="flex justify-center gap-8 border-t border-border pt-6">
          <div>
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-lg font-semibold">{status.totalExpenses}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="text-lg font-semibold">₹{status.totalAmount}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
