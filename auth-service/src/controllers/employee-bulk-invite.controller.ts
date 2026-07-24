import type { NextFunction, Request, RequestHandler, Response } from "express";
import multer, { MulterError } from "multer";
import { Op } from "sequelize";
import type { OwnerRequest } from "../middleware/require-owner";
import { BulkUpload, BulkUploadError, Department, Employee, Grade, Organization, Project, Role } from "../models";
import {
  BULK_COLUMNS,
  BULK_ROW_MESSAGES,
  BULK_UPLOAD_STAGING_TTL_MS,
  MAX_BULK_FILE_SIZE_BYTES,
  MAX_BULK_ROWS,
  type BulkColumnKey,
} from "../utils/constants/bulk-invite.constant";
import { buildErrorReportBuffer, buildSampleTemplateBuffer, parseUploadedWorkbook } from "../utils/employee-bulk-file";
import { calculateAge, isEmail, isValidContactNumber, isValidEmployeeName } from "../utils/validation";
import { EmployeeCompanyAccess, EmployeeProject } from "../models";

const TITLES = ["Mr", "Mrs", "Ms"] as const;
const GENDERS = ["Male", "Female", "Other"] as const;
const MINIMUM_AGE = 18;
const MAX_EMPLOYEE_CODE_LENGTH = 30;
const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const UPLOAD_NOT_FOUND_MESSAGE = "This validation session has expired or wasn't found. Please re-upload your file.";
const NO_FILE_MESSAGE = "Please select a file.";
const UNSUPPORTED_TYPE_MESSAGE = "Only CSV and XLSX files are supported.";
const TOO_LARGE_MESSAGE = "Maximum allowed size is 10 MB.";
const EMPTY_FILE_MESSAGE = "Uploaded file contains no records.";
const TOO_MANY_ROWS_MESSAGE = `Uploaded file exceeds the maximum of ${MAX_BULK_ROWS.toLocaleString()} rows.`;

type PendingRow = {
  rowNumber: number;
  action: "create" | "update";
  matchedEmployeeId: number | null;
  title: (typeof TITLES)[number];
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  contactNumber: string;
  dob: string | null;
  gender: (typeof GENDERS)[number];
  employeeCode: string | null;
  roleId: number;
  departmentId: number;
  gradeId: number;
  projectIds: number[];
};

type RowError = { row: number; employeeName: string; employeeEmail: string; message: string };

type StagedUpload = { organizationId: number; rows: PendingRow[]; expiresAt: number };

// Parsed-but-unconfirmed rows are held here, not in a table — see 010's Data
// Model note ("held server-side keyed by uploadId... not persisted as
// Employee rows until /import is called"). A single-process in-memory Map is
// the simplest thing that satisfies that at this app's current scale (no
// Redis/queue exists anywhere else in this codebase); it would need a real
// store to survive a restart or to run behind more than one instance.
const stagedUploads = new Map<number, StagedUpload>();

function takeStagedUpload(uploadId: number, organizationId: number): PendingRow[] | null {
  const staged = stagedUploads.get(uploadId);
  if (!staged || staged.organizationId !== organizationId || staged.expiresAt < Date.now()) {
    stagedUploads.delete(uploadId);
    return null;
  }
  return staged.rows;
}

// ---- multer (multipart file) setup ----

// 010's own Security section requires both extension and MIME type checked,
// not extension alone, to reduce spoofing risk.
const ACCEPTED_MIME_TYPES = new Set([
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BULK_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!/\.(csv|xlsx)$/i.test(file.originalname) || !ACCEPTED_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("UNSUPPORTED_TYPE"));
      return;
    }
    callback(null, true);
  },
});

// multer reports file-size/type problems by calling next(err) itself rather
// than letting the route handler run — wrapping it here translates those
// into the same { error } JSON shape every other 400 in this codebase uses,
// instead of falling through to the generic error handler.
export function bulkUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  const handler: RequestHandler = multerUpload.single("file");
  handler(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: TOO_LARGE_MESSAGE });
      return;
    }
    res.status(400).json({ error: UNSUPPORTED_TYPE_MESSAGE });
  });
}

export async function downloadBulkTemplate(_req: Request, res: Response): Promise<void> {
  const buffer = await buildSampleTemplateBuffer();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="Employee_Template.xlsx"');
  res.send(buffer);
}

// ---- row parsing/validation ----

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

function mapHeaderRow(headerRow: string[]): { columnIndexByKey: Partial<Record<BulkColumnKey, number>>; error?: string } {
  const headerToKey = new Map(BULK_COLUMNS.map((column) => [normalizeHeader(column.header), column.key]));
  const columnIndexByKey: Partial<Record<BulkColumnKey, number>> = {};
  const seenKeys = new Set<BulkColumnKey>();
  const duplicateHeaders = new Set<string>();

  headerRow.forEach((rawHeader, index) => {
    const key = headerToKey.get(normalizeHeader(rawHeader));
    if (!key) return;
    if (seenKeys.has(key)) {
      duplicateHeaders.add(rawHeader.trim());
      return;
    }
    seenKeys.add(key);
    columnIndexByKey[key] = index;
  });

  if (duplicateHeaders.size > 0) {
    return { columnIndexByKey, error: `Uploaded file has duplicate column headers: ${Array.from(duplicateHeaders).join(", ")}.` };
  }

  const missingRequired = BULK_COLUMNS.filter((column) => column.required && columnIndexByKey[column.key] === undefined);
  if (missingRequired.length > 0) {
    return {
      columnIndexByKey,
      error: `Uploaded file is missing required column(s): ${missingRequired.map((column) => column.header).join(", ")}.`,
    };
  }

  return { columnIndexByKey };
}

function cellValue(row: string[], columnIndexByKey: Partial<Record<BulkColumnKey, number>>, key: BulkColumnKey): string {
  const index = columnIndexByKey[key];
  return index === undefined ? "" : (row[index] ?? "").trim();
}

function displayName(firstName: string, lastName: string, email: string, rowNumber: number): string {
  const name = `${firstName} ${lastName}`.trim();
  return name || email || `Row ${rowNumber}`;
}

type RawRow = Record<BulkColumnKey, string> & { rowNumber: number };

function readRawRows(dataRows: string[][], columnIndexByKey: Partial<Record<BulkColumnKey, number>>): RawRow[] {
  return dataRows
    .map((row, index) => ({ row, rowNumber: index + 2 })) // +2: 1-indexed, plus the header row itself
    .filter(({ row }) => row.some((cell) => cell.trim().length > 0))
    .map(({ row, rowNumber }) => {
      const raw = { rowNumber } as RawRow;
      BULK_COLUMNS.forEach((column) => {
        raw[column.key] = cellValue(row, columnIndexByKey, column.key);
      });
      return raw;
    });
}

type Candidate = {
  raw: RawRow;
  action: "create" | "update";
  matchedEmployeeId: number | null;
  roleId: number;
  departmentId: number;
  gradeId: number;
  projectIds: number[];
};

async function validateRows(
  rawRows: RawRow[],
  organizationId: number,
  organizationName: string
): Promise<{ pending: PendingRow[]; errors: RowError[] }> {
  const [orgEmployees, roles, departments, grades, projects] = await Promise.all([
    Employee.findAll({ where: { organizationId } }),
    Role.findAll({ where: { organizationId, isActive: true } }),
    Department.findAll({ where: { organizationId, isActive: true } }),
    Grade.findAll({ where: { organizationId, isActive: true } }),
    Project.findAll({ where: { organizationId, isActive: true } }),
  ]);

  const employeeByEmail = new Map(orgEmployees.map((employee) => [employee.email.toLowerCase(), employee]));
  const employeeByContact = new Map(
    orgEmployees
      .filter((employee) => employee.countryCode && employee.contactNumber)
      .map((employee) => [`${employee.countryCode}|${employee.contactNumber}`, employee])
  );
  const employeeByCode = new Map(
    orgEmployees.filter((employee) => employee.employeeCode).map((employee) => [employee.employeeCode as string, employee])
  );
  const roleIdByName = new Map(roles.map((role) => [role.name.toLowerCase(), role.id]));
  const departmentIdByName = new Map(departments.map((department) => [department.name.toLowerCase(), department.id]));
  const gradeIdByName = new Map(grades.map((grade) => [grade.name.toLowerCase(), grade.id]));
  const projectIdByDeptAndName = new Map<string, number>();
  projects.forEach((project) => {
    projectIdByDeptAndName.set(`${project.departmentId}|${project.name.toLowerCase()}`, project.id);
  });

  const errors: RowError[] = [];
  const candidates: Candidate[] = [];
  const seenEmails = new Set<string>();
  const seenContacts = new Set<string>();
  const seenCodes = new Set<string>();

  function reject(raw: RawRow, message: string): void {
    errors.push({ row: raw.rowNumber, employeeName: displayName(raw.firstName, raw.lastName, raw.email, raw.rowNumber), employeeEmail: raw.email, message });
  }

  for (const raw of rawRows) {
    const email = raw.email.toLowerCase();
    const countryCode = raw.countryCode;
    const contactNumber = raw.contactNumber;
    const contactKey = `${countryCode}|${contactNumber}`;
    const employeeCode = raw.employeeCode || null;

    const missingFields = BULK_COLUMNS.filter((column) => column.required && !raw[column.key]).map((column) => column.header);
    const isDuplicateEmail = seenEmails.has(email);
    const isDuplicateContact = seenContacts.has(contactKey);
    const isDuplicateCode = Boolean(employeeCode) && seenCodes.has(employeeCode as string);
    seenEmails.add(email);
    seenContacts.add(contactKey);
    if (employeeCode) seenCodes.add(employeeCode);

    if (missingFields.length > 0) {
      reject(raw, `Missing required field(s): ${missingFields.join(", ")}.`);
      continue;
    }
    if (!(TITLES as readonly string[]).includes(raw.title)) {
      reject(raw, BULK_ROW_MESSAGES.invalidTitle);
      continue;
    }
    if (!(GENDERS as readonly string[]).includes(raw.gender)) {
      reject(raw, BULK_ROW_MESSAGES.invalidGender);
      continue;
    }
    if (!isEmail(email)) {
      reject(raw, BULK_ROW_MESSAGES.invalidEmail);
      continue;
    }
    if (isDuplicateEmail) {
      reject(raw, BULK_ROW_MESSAGES.duplicateEmail);
      continue;
    }
    if (!isValidContactNumber(contactNumber)) {
      reject(raw, BULK_ROW_MESSAGES.invalidContactNumber);
      continue;
    }
    if (isDuplicateContact) {
      reject(raw, BULK_ROW_MESSAGES.duplicateContactNumber);
      continue;
    }
    if (employeeCode && employeeCode.length > MAX_EMPLOYEE_CODE_LENGTH) {
      reject(raw, BULK_ROW_MESSAGES.employeeCodeTooLong);
      continue;
    }
    if (isDuplicateCode) {
      reject(raw, BULK_ROW_MESSAGES.duplicateEmployeeCode);
      continue;
    }
    if (!isValidEmployeeName(raw.firstName) || !isValidEmployeeName(raw.lastName)) {
      reject(raw, "Invalid First Name or Last Name.");
      continue;
    }
    if (raw.dob) {
      const dobDate = new Date(raw.dob);
      const today = new Date();
      if (Number.isNaN(dobDate.getTime()) || dobDate.getTime() > today.getTime()) {
        reject(raw, BULK_ROW_MESSAGES.dobFuture);
        continue;
      }
      if (calculateAge(dobDate, today) < MINIMUM_AGE) {
        reject(raw, BULK_ROW_MESSAGES.underage);
        continue;
      }
    }
    if (raw.company.toLowerCase() !== organizationName.toLowerCase()) {
      reject(raw, BULK_ROW_MESSAGES.companyNotFound);
      continue;
    }

    const roleId = roleIdByName.get(raw.role.toLowerCase());
    if (!roleId) {
      reject(raw, BULK_ROW_MESSAGES.roleNotFound);
      continue;
    }
    const departmentId = departmentIdByName.get(raw.department.toLowerCase());
    if (!departmentId) {
      reject(raw, BULK_ROW_MESSAGES.departmentNotFound);
      continue;
    }
    const gradeId = gradeIdByName.get(raw.grade.toLowerCase());
    if (!gradeId) {
      reject(raw, BULK_ROW_MESSAGES.gradeNotFound);
      continue;
    }

    let projectIds: number[] = [];
    if (raw.projects) {
      const requestedNames = raw.projects
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
      const resolvedIds: number[] = [];
      let unresolvedProject = false;
      for (const name of requestedNames) {
        const projectId = projectIdByDeptAndName.get(`${departmentId}|${name.toLowerCase()}`);
        if (!projectId) {
          unresolvedProject = true;
          break;
        }
        resolvedIds.push(projectId);
      }
      if (unresolvedProject) {
        reject(raw, BULK_ROW_MESSAGES.projectNotFound);
        continue;
      }
      projectIds = resolvedIds;
    }

    // Matching priority: Email, then Country Code + Contact Number, then
    // Employee ID — the first of these that matches an existing employee in
    // this organization means "update," otherwise "create." Scoped to this
    // organization only; a global match against a *different* org's
    // employee is a conflict, not an update target (see below).
    const matched = employeeByEmail.get(email) ?? employeeByContact.get(contactKey) ?? (employeeCode ? employeeByCode.get(employeeCode) : undefined) ?? null;

    if (matched) {
      const conflictingEmail = employeeByEmail.get(email);
      const conflictingContact = employeeByContact.get(contactKey);
      if (conflictingEmail && conflictingEmail.id !== matched.id) {
        reject(raw, "This email is already in use by a different employee.");
        continue;
      }
      if (conflictingContact && conflictingContact.id !== matched.id) {
        reject(raw, "This contact number is already in use by a different employee.");
        continue;
      }
    }

    candidates.push({ raw, action: matched ? "update" : "create", matchedEmployeeId: matched?.id ?? null, roleId, departmentId, gradeId, projectIds });
  }

  // Second pass: candidates heading for a *create* (no in-org match) must
  // not collide with a *different* organization's employee — Employee.email
  // and Employee.(countryCode,contactNumber) are globally unique now that
  // Employee is the login entity (see backend/CLAUDE.md's User → Employee
  // merge), a constraint this story's "matching priority" section predates.
  const createCandidates = candidates.filter((candidate) => candidate.action === "create");
  const candidateEmails = createCandidates.map((candidate) => candidate.raw.email.toLowerCase());
  const candidateContacts = createCandidates.map((candidate) => candidate.raw.contactNumber);

  const crossOrgConflicts =
    createCandidates.length > 0
      ? await Employee.findAll({
          where: {
            organizationId: { [Op.ne]: organizationId },
            [Op.or]: [{ email: { [Op.in]: candidateEmails } }, { contactNumber: { [Op.in]: candidateContacts } }],
          },
        })
      : [];
  const takenEmailsElsewhere = new Set(crossOrgConflicts.map((employee) => employee.email.toLowerCase()));
  const takenContactsElsewhere = new Set(
    crossOrgConflicts.filter((employee) => employee.contactNumber).map((employee) => `${employee.countryCode}|${employee.contactNumber}`)
  );

  const pending: PendingRow[] = [];
  for (const candidate of candidates) {
    const { raw } = candidate;
    if (candidate.action === "create") {
      const email = raw.email.toLowerCase();
      const contactKey = `${raw.countryCode}|${raw.contactNumber}`;
      if (takenEmailsElsewhere.has(email)) {
        reject(raw, BULK_ROW_MESSAGES.emailTakenByAnotherOrg);
        continue;
      }
      if (takenContactsElsewhere.has(contactKey)) {
        reject(raw, BULK_ROW_MESSAGES.contactNumberTakenByAnotherOrg);
        continue;
      }
    }

    pending.push({
      rowNumber: raw.rowNumber,
      action: candidate.action,
      matchedEmployeeId: candidate.matchedEmployeeId,
      title: raw.title as (typeof TITLES)[number],
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email.toLowerCase(),
      countryCode: raw.countryCode,
      contactNumber: raw.contactNumber,
      dob: raw.dob || null,
      gender: raw.gender as (typeof GENDERS)[number],
      employeeCode: raw.employeeCode || null,
      roleId: candidate.roleId,
      departmentId: candidate.departmentId,
      gradeId: candidate.gradeId,
      projectIds: candidate.projectIds,
    });
  }

  errors.sort((a, b) => a.row - b.row);
  pending.sort((a, b) => a.rowNumber - b.rowNumber);

  return { pending, errors };
}

export async function uploadBulkImport(req: OwnerRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }
  if (!req.file || req.file.buffer.length === 0) {
    res.status(400).json({ error: NO_FILE_MESSAGE });
    return;
  }

  const organization = await Organization.findByPk(organizationId);
  if (!organization) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const sheetRows = await parseUploadedWorkbook(req.file.buffer, req.file.originalname);
  if (sheetRows.length === 0) {
    res.status(400).json({ error: EMPTY_FILE_MESSAGE });
    return;
  }

  const [headerRow, ...dataRows] = sheetRows;
  const { columnIndexByKey, error: headerError } = mapHeaderRow(headerRow);
  if (headerError) {
    res.status(400).json({ error: headerError });
    return;
  }

  const rawRows = readRawRows(dataRows, columnIndexByKey);
  if (rawRows.length === 0) {
    res.status(400).json({ error: EMPTY_FILE_MESSAGE });
    return;
  }
  if (rawRows.length > MAX_BULK_ROWS) {
    res.status(400).json({ error: TOO_MANY_ROWS_MESSAGE });
    return;
  }

  const { pending, errors } = await validateRows(rawRows, organizationId, organization.name);
  const createdCount = pending.filter((row) => row.action === "create").length;
  const updatedCount = pending.length - createdCount;

  const bulkUpload = await BulkUpload.create({
    organizationId,
    uploadedBy: req.userId,
    fileName: req.file.originalname,
    status: "validated",
    totalRows: rawRows.length,
    successRows: pending.length,
    failedRows: errors.length,
    newRows: createdCount,
    updatedRows: updatedCount,
  });

  if (errors.length > 0) {
    await BulkUploadError.bulkCreate(
      errors.map((rowError) => ({
        uploadId: bulkUpload.id,
        rowNumber: rowError.row,
        employeeEmail: rowError.employeeEmail || null,
        employeeName: rowError.employeeName || null,
        errorMessage: rowError.message,
      }))
    );
  }

  stagedUploads.set(bulkUpload.id, { organizationId, rows: pending, expiresAt: Date.now() + BULK_UPLOAD_STAGING_TTL_MS });

  res.status(200).json({
    uploadId: bulkUpload.id,
    total: rawRows.length,
    created: createdCount,
    updated: updatedCount,
    failed: errors.length,
    errors,
  });
}

export async function downloadBulkImportErrors(req: OwnerRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const uploadId = Number(req.params.uploadId);
  const bulkUpload = await BulkUpload.findOne({ where: { id: uploadId, organizationId } });
  if (!bulkUpload) {
    res.status(404).json({ error: UPLOAD_NOT_FOUND_MESSAGE });
    return;
  }

  const errorRows = await BulkUploadError.findAll({ where: { uploadId }, order: [["rowNumber", "ASC"]] });
  const buffer = await buildErrorReportBuffer(
    errorRows.map((row) => ({
      row: row.rowNumber,
      employeeName: row.employeeName ?? "",
      employeeEmail: row.employeeEmail ?? "",
      message: row.errorMessage,
    }))
  );

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="Bulk_Invite_Errors_${uploadId}.xlsx"`);
  res.send(buffer);
}

export async function confirmBulkImport(req: OwnerRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const uploadId = Number(req.body?.uploadId);
  const rows = takeStagedUpload(uploadId, organizationId);
  if (!rows) {
    res.status(404).json({ error: UPLOAD_NOT_FOUND_MESSAGE });
    return;
  }
  if (rows.length === 0) {
    res.status(400).json({ error: "There are no valid rows to import." });
    return;
  }

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      let employeeId = row.matchedEmployeeId;

      if (row.action === "create") {
        const employee = await Employee.create({
          organizationId,
          title: row.title,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          countryCode: row.countryCode,
          contactNumber: row.contactNumber,
          dob: row.dob,
          gender: row.gender,
          employeeCode: row.employeeCode,
          createdBy: req.userId,
          updatedBy: req.userId,
        });
        employeeId = employee.id;
        created += 1;
      } else if (employeeId) {
        // Existing employee is updated in place; invitationStatus/status are
        // deliberately not touched here — a bulk update never re-pends a
        // registered employee, and never reactivates/suspends anyone (see
        // 010's Business Rules).
        await Employee.update(
          {
            title: row.title,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            countryCode: row.countryCode,
            contactNumber: row.contactNumber,
            dob: row.dob,
            gender: row.gender,
            employeeCode: row.employeeCode,
            updatedBy: req.userId,
          },
          { where: { id: employeeId } }
        );
        updated += 1;
      } else {
        failed += 1;
        continue;
      }

      const [access] = await EmployeeCompanyAccess.findOrCreate({
        where: { employeeId },
        defaults: { employeeId, organizationId, roleId: row.roleId, departmentId: row.departmentId, gradeId: row.gradeId },
      });
      access.roleId = row.roleId;
      access.departmentId = row.departmentId;
      access.gradeId = row.gradeId;
      await access.save();

      await EmployeeProject.destroy({ where: { employeeId } });
      if (row.projectIds.length > 0) {
        await EmployeeProject.bulkCreate(row.projectIds.map((projectId) => ({ employeeId: employeeId as number, projectId })));
      }
    } catch {
      failed += 1;
    }
  }

  await BulkUpload.update({ status: "imported" }, { where: { id: uploadId, organizationId } });

  res.status(200).json({ total: rows.length, created, updated, failed });
}
