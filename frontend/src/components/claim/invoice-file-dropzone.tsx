"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileIcon, UploadSimpleIcon, XIcon } from "@phosphor-icons/react";
import { ALLOWED_INVOICE_FILE_EXTENSIONS, MAX_INVOICE_FILE_COUNT, MAX_INVOICE_FILE_SIZE_MB } from "@/utils/constants/claim.constant";

type InvoiceFileDropzoneProps = {
  files: File[];
  onChange: (files: File[]) => void;
};

function hasAllowedExtension(fileName: string): boolean {
  return ALLOWED_INVOICE_FILE_EXTENSIONS.some((extension) => fileName.toLowerCase().endsWith(extension));
}

// 023's Upload Invoices — drag-and-drop or click-to-upload, up to 10 files,
// PDF/JPG/JPEG/PNG, 10MB each. Files are only staged client-side here; the
// actual upload happens once the claim shell exists (Save & Next).
export function InvoiceFileDropzone({ files, onChange }: InvoiceFileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | undefined>();

  function addFiles(selected: File[]): void {
    setError(undefined);
    const invalidType = selected.find((file) => !hasAllowedExtension(file.name));
    if (invalidType) {
      setError("Only PDF, JPG, JPEG, and PNG files are supported.");
      return;
    }
    const tooLarge = selected.find((file) => file.size > MAX_INVOICE_FILE_SIZE_MB * 1024 * 1024);
    if (tooLarge) {
      setError(`Each file must be ${MAX_INVOICE_FILE_SIZE_MB}MB or smaller.`);
      return;
    }
    const combined = [...files, ...selected];
    if (combined.length > MAX_INVOICE_FILE_COUNT) {
      setError(`You can upload up to ${MAX_INVOICE_FILE_COUNT} files.`);
      return;
    }
    onChange(combined);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center text-sm transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-input text-muted-foreground hover:bg-muted/50"
        }`}
      >
        <UploadSimpleIcon size={24} />
        <p>Drag and drop invoices here, or click to browse</p>
        <p className="text-xs">PDF, JPG, JPEG, PNG · up to {MAX_INVOICE_FILE_SIZE_MB}MB each · up to {MAX_INVOICE_FILE_COUNT} files</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_INVOICE_FILE_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {files.length > 0 ? (
        <ul className="space-y-1">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <FileIcon size={16} className="shrink-0 text-muted-foreground" />
                <span className="truncate">{file.name}</span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}
                className="text-muted-foreground hover:text-destructive"
              >
                <XIcon size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
