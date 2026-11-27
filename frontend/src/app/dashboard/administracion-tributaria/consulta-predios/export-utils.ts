import * as XLSX from "xlsx";

export const EXPORT_FILENAME = "Reporte de predios.xls";
export const EXPORT_TITLE_PREFIX = "REPORTE DE PREDIOS - ";
const SHEET_NAME = "Reporte de predios";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTitle(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    return "REPORTE DE PREDIOS";
  }
  return `${EXPORT_TITLE_PREFIX}${value}`;
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}

function readPayload(payload: unknown): {
  title: string;
  labels: string[];
  rows: string[][];
} {
  if (!isRecord(payload)) throw new TypeError("Invalid export payload");

  if (!Array.isArray(payload.columns)) {
    throw new TypeError("Invalid export columns");
  }
  const labels: string[] = [];
  for (const column of payload.columns) {
    if (!isRecord(column) || typeof column.label !== "string") {
      throw new TypeError("Invalid export column label");
    }
    labels.push(column.label);
  }

  const rawRows =
    payload.rows === null || payload.rows === undefined ? [] : payload.rows;
  if (!Array.isArray(rawRows)) throw new TypeError("Invalid export rows");
  const rows = rawRows.map((row) =>
    Array.isArray(row) ? row.map(normalizeCell) : [],
  );

  return { title: normalizeTitle(payload.title), labels, rows };
}

/**
 * Construye el libro sin tocar el orden ni la cantidad de columnas que envía
 * el backend: la numeración `N` ya viene como primera columna (`sourceIndex: -1`).
 */
export function buildPrediosWorkbook(payload: unknown): XLSX.WorkBook {
  const { title, labels, rows } = readPayload(payload);
  const aoa: string[][] = [[title], labels, ...rows];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, SHEET_NAME);
  return workbook;
}

export function downloadPrediosWorkbook(payload: unknown): void {
  XLSX.writeFile(buildPrediosWorkbook(payload), EXPORT_FILENAME);
}
