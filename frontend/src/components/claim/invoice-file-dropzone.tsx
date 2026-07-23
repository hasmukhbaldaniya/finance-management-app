"use client";

import { useRef, useState, type DragEvent } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
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
    <Stack spacing={1}>
      <Stack
        spacing={1}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        sx={{
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 2,
          border: 2,
          borderStyle: "dashed",
          p: 4,
          textAlign: "center",
          fontSize: "0.875rem",
          cursor: "pointer",
          transition: "background-color 0.15s",
          borderColor: isDragging ? "primary.main" : "divider",
          bgcolor: isDragging ? (theme) => alpha(theme.palette.primary.main, 0.05) : "transparent",
          color: isDragging ? "text.primary" : "text.secondary",
          "&:hover": isDragging ? undefined : { bgcolor: "action.hover" },
        }}
      >
        <UploadSimpleIcon size={24} />
        <Typography variant="body2">Drag and drop invoices here, or click to browse</Typography>
        <Typography variant="caption">
          PDF, JPG, JPEG, PNG · up to {MAX_INVOICE_FILE_SIZE_MB}MB each · up to {MAX_INVOICE_FILE_COUNT} files
        </Typography>
        <Box
          component="input"
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_INVOICE_FILE_EXTENSIONS.join(",")}
          sx={{ display: "none" }}
          onChange={(event) => {
            addFiles(Array.from((event.target as HTMLInputElement).files ?? []));
            (event.target as HTMLInputElement).value = "";
          }}
        />
      </Stack>
      {error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : null}
      {files.length > 0 ? (
        <Stack component="ul" spacing={0.5} sx={{ listStyle: "none", p: 0, m: 0 }}>
          {files.map((file, index) => (
            <Stack
              component="li"
              direction="row"
              key={`${file.name}-${index}`}
              spacing={1}
              sx={{ alignItems: "center", justifyContent: "space-between", borderRadius: 1.5, border: 1, borderColor: "divider", px: 1.5, py: 1, fontSize: "0.875rem" }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                <Box sx={{ flexShrink: 0, color: "text.secondary", display: "flex" }}>
                  <FileIcon size={16} />
                </Box>
                <Typography variant="body2" noWrap>
                  {file.name}
                </Typography>
              </Stack>
              <Box
                component="button"
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}
                sx={{ color: "text.secondary", background: "none", border: "none", cursor: "pointer", display: "flex", "&:hover": { color: "error.main" } }}
              >
                <XIcon size={14} />
              </Box>
            </Stack>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
