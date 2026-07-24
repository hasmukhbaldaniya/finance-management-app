import ExcelJS from "exceljs";
import { parse as parseCsv } from "csv-parse/sync";
import { BULK_COLUMNS } from "./constants/bulk-invite.constant";

export type BulkErrorReportRow = {
  row: number;
  employeeName: string;
  employeeEmail: string;
  message: string;
};

const TEMPLATE_SHEET_NAME = "Template";
const INSTRUCTIONS_SHEET_NAME = "Instructions";

// Every cell beginning with =, +, -, or @ is a potential CSV/Excel formula
// injection payload once it round-trips into a spreadsheet a human later
// opens (the generated error report, or this same value being echoed back
// into that report) — see 010's Security section. Prefixing a single quote
// neutralizes it in both Excel and Google Sheets without changing what the
// cell displays as text.
export function sanitizeCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((segment) => segment.text).join("");
    }
    if ("result" in value) {
      return cellToString(value.result as ExcelJS.CellValue);
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
    return "";
  }
  return String(value).trim();
}

// Parses an uploaded .csv or .xlsx buffer into a plain string[][] (header
// row + data rows), sanitizing every cell on the way in — the earliest point
// a formula-injection payload could otherwise flow into stored data or a
// downloaded error report.
export async function parseUploadedWorkbook(buffer: Buffer, originalName: string): Promise<string[][]> {
  const isCsv = /\.csv$/i.test(originalName);

  if (isCsv) {
    const records = parseCsv(buffer.toString("utf-8"), {
      skip_empty_lines: true,
      relax_column_count: true,
    }) as string[][];
    return records.map((row) => row.map((cell) => sanitizeCell((cell ?? "").trim())));
  }

  const workbook = new ExcelJS.Workbook();
  // exceljs's own index.d.ts globally merges `declare interface Buffer
  // extends ArrayBuffer {}` — a known upstream defect that corrupts the
  // ambient Buffer type for this whole compilation, so a real Buffer no
  // longer structurally satisfies it. skipLibCheck doesn't help here since
  // the merge itself isn't an error inside exceljs's .d.ts.
  // @ts-expect-error — see comment above; this is a valid Buffer at runtime.
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rows: string[][] = [];
  worksheet.eachRow((row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(sanitizeCell(cellToString(cell.value)));
    });
    rows.push(cells);
  });
  return rows;
}

export async function buildSampleTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const templateSheet = workbook.addWorksheet(TEMPLATE_SHEET_NAME);
  templateSheet.addRow(BULK_COLUMNS.map((column) => column.header));
  templateSheet.getRow(1).font = { bold: true };
  templateSheet.addRow([
    "Mr",
    "John",
    "Doe",
    "john.doe@example.com",
    "+91",
    "9876543210",
    "1990-01-15",
    "Male",
    "EMP-1001",
    "Acme Corp",
    "Company Admin",
    "Engineering",
    "Associate",
    "Website Revamp",
  ]);
  templateSheet.columns.forEach((column) => {
    column.width = 18;
  });

  const instructionsSheet = workbook.addWorksheet(INSTRUCTIONS_SHEET_NAME);
  instructionsSheet.getColumn(1).width = 100;
  const requiredColumnNames = BULK_COLUMNS.filter((column) => column.required)
    .map((column) => column.header)
    .join(", ");
  [
    "Bulk Invite Employees — Instructions",
    "",
    `Required columns: ${requiredColumnNames}.`,
    "DOB, Employee ID, and Projects are optional.",
    "Company must match your organization's name exactly.",
    "Role, Department, and Grade must already exist in Company Settings and be spelled exactly as they appear there.",
    "Projects (optional) can list more than one project name separated by commas; each must belong to the row's Department.",
    "A row whose Email, Country Code + Contact Number, or Employee ID matches an existing employee updates that employee instead of creating a new one.",
    "Do not rename, remove, or reorder the columns on the Template sheet — extra columns are ignored, but missing required columns will reject the whole file.",
  ].forEach((line) => instructionsSheet.addRow([line]));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildErrorReportBuffer(rows: BulkErrorReportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Errors");
  sheet.addRow(["Row", "Employee", "Email", "Error"]);
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => {
    sheet.addRow([row.row, sanitizeCell(row.employeeName), sanitizeCell(row.employeeEmail), row.message]);
  });
  sheet.columns.forEach((column) => {
    column.width = 24;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
