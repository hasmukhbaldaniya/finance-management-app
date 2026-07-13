"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CaretLeftIcon, XIcon } from "@phosphor-icons/react";
import { getSplitRequestDetail, rejectSplitRequest } from "@/apis/split-request";
import { SplitRequestRespondDialog } from "@/components/claim/split-request-respond-dialog";
import { SplitRequestStatusBadge } from "@/components/claim/split-request-status-badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/contexts/SessionContext";
import { formatDateTime, formatInr } from "@/utils/helpers/format.helper";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import type { SplitRequestDetail } from "@/types/split-request.type";

// 025's Split Details page — one Expense List row per this simplified
// schema's "one request = one expense" (see backend's own migration
// comment), with "View & Accept"/reject actions both row-level and
// page-level, since with one row those two levels collapse to the same
// action.
export default function SplitRequestDetailsPage() {
  const params = useParams<{ id: string }>();
  const { user } = useSession();
  const requestId = Number(params.id);

  const [request, setRequest] = useState<SplitRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [isRespondOpen, setIsRespondOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  function load(): void {
    setIsLoading(true);
    setLoadError(undefined);
    getSplitRequestDetail(requestId)
      .then((response) => setRequest(response.request))
      .catch((error: unknown) => setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  async function handleQuickReject(): Promise<void> {
    setIsRejecting(true);
    try {
      await rejectSplitRequest(requestId);
      load();
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsRejecting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (loadError || !request) {
    return <p className="py-16 text-center text-sm text-destructive">{loadError ?? "Split request not found."}</p>;
  }

  const myMember = request.members.find((member) => member.employeeId === user.id);
  const canRespond = myMember?.status === "pending";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link href={ROUTES.CLAIMS} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <CaretLeftIcon size={14} /> Back
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Split Request #{request.id}</h1>
          <p className="text-sm text-muted-foreground">Requested by: {request.requestedBy}</p>
        </div>
        {canRespond ? (
          <div className="flex items-center gap-2">
            <Button type="button" variant="destructive" onClick={handleQuickReject} disabled={isRejecting}>
              {isRejecting ? <Spinner /> : null}
              Reject
            </Button>
            <Button type="button" onClick={() => setIsRespondOpen(true)}>
              Accept
            </Button>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Expense Amount</th>
              <th className="px-4 py-3 font-medium">Your Share</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="px-4 py-3">{request.expense.categoryName}</td>
              <td className="px-4 py-3">₹{formatInr(request.expense.amount)}</td>
              <td className="px-4 py-3">{myMember ? `₹${formatInr(myMember.amount)} (${myMember.percentage}%)` : "—"}</td>
              <td className="px-4 py-3">
                <SplitRequestStatusBadge status={myMember?.status ?? "pending"} />
              </td>
              <td className="px-4 py-3">
                {canRespond ? (
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsRespondOpen(true)}>
                      View &amp; Accept
                    </Button>
                    <button
                      type="button"
                      aria-label="Reject split request"
                      onClick={handleQuickReject}
                      disabled={isRejecting}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Responded {request.requestedOn ? formatDateTime(request.requestedOn) : ""}</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <SplitRequestRespondDialog request={isRespondOpen ? request : null} onOpenChange={setIsRespondOpen} onResponded={load} />
    </div>
  );
}
