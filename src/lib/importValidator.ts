/**
 * TNEA CSV Import Validator
 * Validates rows parsed by PapaParse before batch insert into Supabase.
 */

export const REQUIRED_COLUMNS = [
  "college_code",
  "college_name",
  "branch_code",
  "branch_name",
  "year",
  "category",
  "cutoff",
] as const;

// Preserve official category labels exactly; MBC and MBC/DNC are distinct
// source values and must never be silently normalized into one another.
export const VALID_CATEGORIES = ["OC", "BC", "BCM", "MBC", "MBC/DNC", "SC", "SCA", "ST"] as const;

export interface RawRow { [key: string]: string }

export interface ValidatedRow {
  college_code: string;
  college_name: string;
  branch_code: string;
  branch_name: string;
  year: number;
  category: string;
  round: number;
  cutoff: number;
  annual_fees: number | null;
  district: string | null;
  college_type: string | null;
}

export interface ValidationResult {
  valid: ValidatedRow[];
  errors: { row: number; field: string; message: string; raw: string }[];
}

export const MASTER_REQUIRED_COLUMNS = [
  "college_code",
  "college_name",
  "branch_code",
  "branch_name",
  "source_year",
] as const;

export interface ValidatedMasterRow {
  college_code: string;
  college_name: string;
  official_name: string | null;
  college_type: string | null;
  university_affiliation: string | null;
  autonomous_status: string | null;
  district: string | null;
  city: string | null;
  address: string | null;
  pincode: string | null;
  branch_code: string;
  branch_name: string;
  short_name: string | null;
  degree: string | null;
  department: string | null;
  annual_intake: number | null;
  active: boolean;
  source_year: number;
}

export interface MasterValidationResult {
  valid: ValidatedMasterRow[];
  errors: ValidationResult["errors"];
  duplicateCount: number;
}

const OFFICIAL_TNEA_HOSTS = [
  "tneaonline.org",
  "static.tneaonline.org",
  "cutoff.tneaonline.org",
  "dte.tn.gov.in",
] as const;

export function validateOfficialSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "Source URL must use HTTPS.";
    const official = OFFICIAL_TNEA_HOSTS.some(
      host => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
    return official ? null : "Source must be an official TNEA or Tamil Nadu DTE domain.";
  } catch {
    return "Enter a valid official source URL.";
  }
}

export function validateMasterRows(rows: RawRow[]): MasterValidationResult {
  const valid: ValidatedMasterRow[] = [];
  const errors: ValidationResult["errors"] = [];
  const fingerprints = new Set<string>();
  let duplicateCount = 0;

  rows.forEach((raw, idx) => {
    const row = Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key.trim().toLowerCase(), String(value ?? "").trim()]),
    ) as RawRow;
    const rowNum = idx + 2;

    for (const column of MASTER_REQUIRED_COLUMNS) {
      if (!row[column]) {
        errors.push({ row: rowNum, field: column, message: `"${column}" is required`, raw: JSON.stringify(raw) });
      }
    }
    if (MASTER_REQUIRED_COLUMNS.some(column => !row[column])) return;

    const sourceYear = Number.parseInt(row.source_year, 10);
    if (!Number.isInteger(sourceYear) || sourceYear < 1990 || sourceYear > 2100) {
      errors.push({ row: rowNum, field: "source_year", message: `Source year "${row.source_year}" is invalid`, raw: row.source_year });
      return;
    }

    const annualIntake = row.annual_intake ? Number.parseInt(row.annual_intake, 10) : null;
    if (annualIntake !== null && (!Number.isInteger(annualIntake) || annualIntake < 0)) {
      errors.push({ row: rowNum, field: "annual_intake", message: "Annual intake must be a non-negative integer", raw: row.annual_intake });
      return;
    }

    const fingerprint = `${row.college_code.toUpperCase()}|${row.branch_code.toUpperCase()}|${sourceYear}`;
    if (fingerprints.has(fingerprint)) {
      duplicateCount += 1;
      errors.push({ row: rowNum, field: "duplicate", message: "Duplicate college/branch/year record", raw: fingerprint });
      return;
    }
    fingerprints.add(fingerprint);

    valid.push({
      college_code: row.college_code,
      college_name: row.college_name,
      official_name: row.official_name || null,
      college_type: row.college_type || null,
      university_affiliation: row.university_affiliation || null,
      autonomous_status: row.autonomous_status || null,
      district: row.district || null,
      city: row.city || null,
      address: row.address || null,
      pincode: row.pincode || null,
      branch_code: row.branch_code.toUpperCase(),
      branch_name: row.branch_name,
      short_name: row.short_name || null,
      degree: row.degree || null,
      department: row.department || null,
      annual_intake: annualIntake,
      active: !["false", "0", "no", "inactive"].includes(row.active?.toLowerCase()),
      source_year: sourceYear,
    });
  });

  return { valid, errors, duplicateCount };
}

export function validateImportRows(rows: RawRow[]): ValidationResult {
  const valid: ValidatedRow[] = [];
  const errors: ValidationResult["errors"] = [];

  rows.forEach((raw, idx) => {
    const rowNum = idx + 2; // 1-based, accounting for header
    const rowErrors: typeof errors = [];

    // Required columns
    for (const col of REQUIRED_COLUMNS) {
      if (!raw[col] || raw[col].trim() === "") {
        rowErrors.push({ row: rowNum, field: col, message: `"${col}" is required`, raw: JSON.stringify(raw) });
      }
    }
    if (rowErrors.length) { errors.push(...rowErrors); return; }

    const year = parseInt(raw.year, 10);
    if (isNaN(year) || year < 2010 || year > 2099) {
      errors.push({ row: rowNum, field: "year", message: `Year "${raw.year}" is invalid`, raw: raw.year });
      return;
    }

    const cutoff = parseFloat(raw.cutoff);
    if (isNaN(cutoff) || cutoff < 77.5 || cutoff > 200) {
      errors.push({ row: rowNum, field: "cutoff", message: `Cutoff "${raw.cutoff}" must be 77.50–200.00`, raw: raw.cutoff });
      return;
    }

    const category = raw.category.trim().toUpperCase();
    if (!(VALID_CATEGORIES as readonly string[]).includes(category)) {
      errors.push({ row: rowNum, field: "category", message: `Unknown category "${category}"`, raw: raw.category });
      return;
    }

    const round = raw.round ? parseInt(raw.round, 10) : 1;
    const annual_fees = raw.annual_fees ? parseInt(raw.annual_fees, 10) : null;

    valid.push({
      college_code: raw.college_code.trim(),
      college_name: raw.college_name.trim(),
      branch_code: raw.branch_code.trim().toUpperCase(),
      branch_name: raw.branch_name.trim(),
      year,
      category,
      round: isNaN(round) ? 1 : round,
      cutoff,
      annual_fees: annual_fees && !isNaN(annual_fees) ? annual_fees : null,
      district: raw.district?.trim() || null,
      college_type: raw.college_type?.trim() || null,
    });
  });

  return { valid, errors };
}

export const CSV_TEMPLATE_HEADERS = [
  "college_code",
  "college_name",
  "district",
  "college_type",
  "branch_code",
  "branch_name",
  "annual_fees",
  "year",
  "category",
  "round",
  "cutoff",
].join(",");

export const CSV_TEMPLATE_EXAMPLE = [
  CSV_TEMPLATE_HEADERS,
  "1234,Anna University Chennai,Chennai,Government,CS,Computer Science & Engineering,50000,2023,OC,1,198.5",
  "1234,Anna University Chennai,Chennai,Government,CS,Computer Science & Engineering,50000,2023,BC,1,194.0",
  "1234,Anna University Chennai,Chennai,Government,EC,Electronics & Communication,50000,2023,OC,1,195.0",
].join("\n");

export function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE_EXAMPLE], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "tnea_cutoff_template.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export const MASTER_CSV_TEMPLATE = [
  [
    "college_code", "college_name", "official_name", "college_type",
    "university_affiliation", "autonomous_status", "district", "city",
    "address", "pincode", "branch_code", "branch_name", "short_name",
    "degree", "department", "annual_intake", "active", "source_year",
  ].join(","),
  // No example data is included: official identifiers must never be invented.
].join("\n");

export function downloadMasterTemplate() {
  const blob = new Blob([MASTER_CSV_TEMPLATE], { type: "text/csv" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = "tnea_college_branch_master_template.csv";
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}
