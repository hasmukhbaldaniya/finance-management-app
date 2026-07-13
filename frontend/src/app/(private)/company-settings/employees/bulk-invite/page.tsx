"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
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
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
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
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Bulk Invite Employees</h1>
      <p className="mt-1 text-sm text-muted-foreground">Upload a CSV or XLSX file to create or update multiple employees at once.</p>

      <div className="mt-6 space-y-6 rounded-lg border border-border bg-background p-6">
        <Button type="button" variant="outline" onClick={handleDownloadTemplate}>
          <DownloadSimpleIcon data-icon="inline-start" />
          Download Sample File
        </Button>

        <p className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
          Employees will not receive invite emails immediately. Existing employees will be updated. New employees will be created. Use Invite or
          Resend Invite from Employee Listing.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="bulk-file">Upload File</Label>
          <input
            ref={fileInputRef}
            id="bulk-file"
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileChange}
            disabled={isUploading}
            className="block w-full text-sm text-foreground file:mr-4 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent disabled:pointer-events-none disabled:opacity-50"
          />
          {selectedFileName ? <p className="text-xs text-muted-foreground">Selected: {selectedFileName}</p> : null}
          {isUploading ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Spinner size={14} />
              Validating…
            </p>
          ) : null}
        </div>

        {summary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <SummaryStat label="Total Records" value={summary.total} />
              <SummaryStat
                label="Success"
                value={summary.created + summary.updated}
                icon={<CheckCircleIcon className="size-4 text-green-600" />}
              />
              <SummaryStat
                label="Failed"
                value={summary.failed}
                icon={summary.failed > 0 ? <WarningCircleIcon className="size-4 text-destructive" /> : undefined}
              />
              <SummaryStat label="Updated" value={summary.updated} />
              <SummaryStat label="New Employees" value={summary.created} />
            </div>

            {summary.failed > 0 ? (
              <Button type="button" variant="outline" size="sm" disabled={isDownloadingErrors} onClick={handleDownloadErrors}>
                {isDownloadingErrors ? <Spinner /> : null}
                Download Error Report
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button component={Link} href={ROUTES.COMPANY_SETTINGS.EMPLOYEES} variant="outline">
            Cancel
          </Button>
          <Button type="button" disabled={!canInvite || isConfirming} onClick={handleInvite}>
            {isUploading || isConfirming ? <Spinner /> : null}
            {isUploading ? "Uploading…" : "Invite"}
          </Button>
        </div>
      </div>
    </div>
  );
}
