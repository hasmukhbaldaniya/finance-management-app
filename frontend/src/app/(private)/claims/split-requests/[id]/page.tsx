"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";
import { CaretLeftIcon, XIcon } from "@phosphor-icons/react";
import { getSplitRequestDetail, rejectSplitRequest } from "@/apis/split-request";
import { SplitRequestRespondDialog } from "@/components/claim/split-request-respond-dialog";
import { SplitRequestStatusBadge } from "@/components/claim/split-request-status-badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <Spinner size={24} />
      </Box>
    );
  }

  if (loadError || !request) {
    return (
      <Typography variant="body2" color="error" sx={{ py: 8, textAlign: "center" }}>
        {loadError ?? "Split request not found."}
      </Typography>
    );
  }

  const myMember = request.members.find((member) => member.employeeId === user.id);
  const canRespond = myMember?.status === "pending";

  return (
    <Stack spacing={3} sx={{ mx: "auto", maxWidth: 896, p: 3 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <Stack spacing={0.5}>
          <MuiLink
            component={Link}
            href={ROUTES.CLAIMS}
            color="text.secondary"
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: "0.875rem", "&:hover": { color: "text.primary" } }}
          >
            <CaretLeftIcon size={14} /> Back
          </MuiLink>
          <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
            Split Request #{request.id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Requested by: {request.requestedBy}
          </Typography>
        </Stack>
        {canRespond ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Button type="button" variant="destructive" onClick={handleQuickReject} disabled={isRejecting}>
              {isRejecting ? <Spinner /> : null}
              Reject
            </Button>
            <Button type="button" onClick={() => setIsRespondOpen(true)}>
              Accept
            </Button>
          </Stack>
        ) : null}
      </Stack>

      <Box sx={{ borderRadius: 2, border: 1, borderColor: "divider", overflow: "hidden" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Expense Amount</TableHead>
              <TableHead>Your Share</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>{request.expense.categoryName}</TableCell>
              <TableCell>₹{formatInr(request.expense.amount)}</TableCell>
              <TableCell>{myMember ? `₹${formatInr(myMember.amount)} (${myMember.percentage}%)` : "—"}</TableCell>
              <TableCell>
                <SplitRequestStatusBadge status={myMember?.status ?? "pending"} />
              </TableCell>
              <TableCell>
                {canRespond ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsRespondOpen(true)}>
                      View &amp; Accept
                    </Button>
                    <Box
                      component="button"
                      type="button"
                      aria-label="Reject split request"
                      onClick={handleQuickReject}
                      disabled={isRejecting}
                      sx={{
                        display: "flex",
                        width: 28,
                        height: 28,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 1.5,
                        color: "text.secondary",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        "&:hover": { bgcolor: "error.main", color: "error.contrastText", opacity: 0.9 },
                      }}
                    >
                      <XIcon size={14} />
                    </Box>
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Responded {request.requestedOn ? formatDateTime(request.requestedOn) : ""}
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>

      <SplitRequestRespondDialog request={isRespondOpen ? request : null} onOpenChange={setIsRespondOpen} onResponded={load} />
    </Stack>
  );
}
