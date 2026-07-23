"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { CheckCircleIcon, DownloadSimpleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { confirmBulkImport, downloadBulkImportErrors, downloadBulkTemplate, uploadBulkImport } from "@/apis/employee";
import type { BulkUploadSummary } from "@/types/employee.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".csv", ".xlsx"];

type FileSignature = { name: string; size: number; lastModified: number };

function hasValidExtension(fileName: string): boolean {
  return ALLOWED_EXTENSIONS.some((extension) => fileName.toLowerCase().endsWith(extension));
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

type SummaryStatProps = {
  label: string;
  value: number;
  icon?: ReactNode;
};

function SummaryStat({ label, value, icon }: SummaryStatProps) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
        {icon}
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </Stack>
      <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 600 }}>
        {value}
      </Typography>
    </Paper>
  );
}

export default function BulkInviteEmployeesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastUploadedFileRef = useRef<FileSignature | null>(null);

  const [selectedFileName, setSelectedFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDownloadingErrors, setIsDownloadingErrors] = useState(false);
  const [summary, setSummary] = useState<BulkUploadSummary | null>(null);

  function resetFileInput(): void {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDownloadTemplate(): Promise<void> {
    try {
      const blob = await downloadBulkTemplate();
      triggerBlobDownload(blob, "Employee_Template.xlsx");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!hasValidExtension(file.name)) {
      toast.error("Only CSV and XLSX files are supported.");
      resetFileInput();
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("Maximum allowed size is 10 MB.");
      resetFileInput();
      return;
    }
    if (file.size === 0) {
      toast.error("Uploaded file contains no records.");
      resetFileInput();
      return;
    }

    const signature: FileSignature = { name: file.name, size: file.size, lastModified: file.lastModified };
    const previous = lastUploadedFileRef.current;
    if (previous && previous.name === signature.name && previous.size === signature.size && previous.lastModified === signature.lastModified) {
      toast.error("This file has already been uploaded. Refresh the page to upload it again.");
      resetFileInput();
      return;
    }

    setSelectedFileName(file.name);
    setSummary(null);
    setIsUploading(true);
    try {
      const result = await uploadBulkImport(file);
      lastUploadedFileRef.current = signature;
      setSummary(result);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      resetFileInput();
      setSelectedFileName("");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownloadErrors(): Promise<void> {
    if (!summary) return;
    setIsDownloadingErrors(true);
    try {
      const blob = await downloadBulkImportErrors(summary.uploadId);
      triggerBlobDownload(blob, `Bulk_Invite_Errors_${summary.uploadId}.xlsx`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsDownloadingErrors(false);
    }
  }

  async function handleInvite(): Promise<void> {
    if (!summary) return;
    setIsConfirming(true);
    try {
      await confirmBulkImport(summary.uploadId);
      toast.success("Employees imported successfully.");
      router.push(ROUTES.COMPANY_SETTINGS.EMPLOYEES);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsConfirming(false);
    }
  }

  const canInvite = summary !== null && summary.created + summary.updated > 0 && !isUploading;

  return (
    <Box sx={{ mx: "auto", width: "100%", maxWidth: 768, flex: 1, px: 2, py: 5 }}>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        Bulk Invite Employees
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Upload a CSV or XLSX file to create or update multiple employees at once.
      </Typography>

      <Paper variant="outlined" sx={{ mt: 3, borderRadius: 2, p: 3 }}>
        <Stack spacing={3}>
          <Button type="button" variant="outline" onClick={handleDownloadTemplate} sx={{ alignSelf: "flex-start" }}>
            <DownloadSimpleIcon size={16} />
            Download Sample File
          </Button>

          <Typography variant="body2" color="text.secondary" sx={{ bgcolor: "action.hover", borderRadius: 1.5, p: 2 }}>
            Employees will not receive invite emails immediately. Existing employees will be updated. New employees will be created. Use Invite or Resend Invite from Employee Listing.
          </Typography>

          <Stack spacing={0.75}>
            <Label htmlFor="bulk-file">Upload File</Label>
            <Box
              component="input"
              ref={fileInputRef}
              id="bulk-file"
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              disabled={isUploading}
              sx={{
                display: "block",
                width: "100%",
                fontSize: "0.875rem",
                color: "text.primary",
                "&:disabled": { pointerEvents: "none", opacity: 0.5 },
                "&::file-selector-button": {
                  mr: 2,
                  borderRadius: 1.5,
                  border: 1,
                  borderColor: "divider",
                  bgcolor: "transparent",
                  px: 1.5,
                  py: 0.75,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                },
                "&:hover::file-selector-button": { bgcolor: "action.hover" },
              }}
            />
            {selectedFileName ? (
              <Typography variant="caption" color="text.secondary">
                Selected: {selectedFileName}
              </Typography>
            ) : null}
            {isUploading ? (
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <Spinner size={14} />
                <Typography variant="caption" color="text.secondary">
                  Validating…
                </Typography>
              </Stack>
            ) : null}
          </Stack>

          {summary ? (
            <Stack spacing={2}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(5, 1fr)" }, gap: 1.5 }}>
                <SummaryStat label="Total Records" value={summary.total} />
                <SummaryStat
                  label="Success"
                  value={summary.created + summary.updated}
                  icon={
                    <Box component="span" sx={{ display: "inline-flex", color: "success.main" }}>
                      <CheckCircleIcon size={16} />
                    </Box>
                  }
                />
                <SummaryStat
                  label="Failed"
                  value={summary.failed}
                  icon={
                    summary.failed > 0 ? (
                      <Box component="span" sx={{ display: "inline-flex", color: "error.main" }}>
                        <WarningCircleIcon size={16} />
                      </Box>
                    ) : undefined
                  }
                />
                <SummaryStat label="Updated" value={summary.updated} />
                <SummaryStat label="New Employees" value={summary.created} />
              </Box>

              {summary.failed > 0 ? (
                <Button type="button" variant="outline" size="sm" disabled={isDownloadingErrors} onClick={handleDownloadErrors} sx={{ alignSelf: "flex-start" }}>
                  {isDownloadingErrors ? <Spinner /> : null}
                  Download Error Report
                </Button>
              ) : null}
            </Stack>
          ) : null}

          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", pt: 1 }}>
            <Button component={Link} href={ROUTES.COMPANY_SETTINGS.EMPLOYEES} variant="outline">
              Cancel
            </Button>
            <Button type="button" disabled={!canInvite || isConfirming} onClick={handleInvite}>
              {isUploading || isConfirming ? <Spinner /> : null}
              {isUploading ? "Uploading…" : "Invite"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
