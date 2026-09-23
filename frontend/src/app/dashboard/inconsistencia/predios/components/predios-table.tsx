"use client";

import { AlertCircle, FolderSearch, RotateCcw, SearchX } from "lucide-react";
import type { PredioInconsistenciaRow } from "@/actions/inconsistencia/predios";

// ── Skeleton de carga ────────────────────────────────────

export function TableSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      data-testid="loading-spinner"
    >
      <div className="animate-pulse">
        <div className="border-b border-slate-200 bg-slate-100 px-3 py-2.5">
          <div className="grid grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-3 w-3/4 rounded bg-slate-200" />
            ))}
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`border-b border-slate-100 px-3 py-3 ${
              i === 4 ? "border-b-0" : ""
            }`}
          >
            <div className="grid grid-cols-6 gap-4">
              {[...Array(6)].map((_, j) => (
                <div
                  key={j}
                  className="h-3.5 rounded bg-slate-100"
                  style={{ width: j === 1 ? "60%" : j === 3 ? "40%" : "80%" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Barra de resultados ──────────────────────────────────

export function PrediosResultsBar({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <FolderSearch size={13} className="text-slate-400" />
      <span>
        Se encontraron <span className="font-semibold text-slate-700">
          {total}
        </span>{" "}
        {total === 1 ? "resultado" : "resultados"}
      </span>
    </div>
  );
}

// ── Grilla de resultados (13 columnas, incluida `direcion`) ──

const COLUMNS: {
  key: keyof PredioInconsistenciaRow;
  label: string;
  align?: "right";
}[] = [
  { key: "codigo", label: "Código" },
  { key: "nombre", label: "Nombre" },
  { key: "cod_pred", label: "Cód. Pred" },
  { key: "anexo", label: "Anexo" },
  { key: "sub_anexo", label: "Sub Anexo" },
  { key: "direcion", label: "Dirección" },
  { key: "uso", label: "Uso" },
  { key: "area_terreno", label: "Área Terreno", align: "right" },
  { key: "porcen_propiedad", label: "% Propiedad", align: "right" },
  { key: "val_total_terreno", label: "Val. Terreno", align: "right" },
  { key: "val_total_constru", label: "Val. Constru.", align: "right" },
  { key: "total_autoavaluo", label: "Total Autoavalúo", align: "right" },
  { key: "ROW", label: "ROW", align: "right" },
];

export function PrediosGrid({ data }: { data: PredioInconsistenciaRow[] }) {
  return (
    <div className="animate-fade-in overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
      <table
        className="w-full min-w-[1100px] border-collapse"
        data-testid="inconsistencia-predios-grid"
        role="grid"
      >
        <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                className={`border-b border-white/5 px-3 py-2.5 text-[11px] font-semibold uppercase text-white/90 ${
                  c.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, idx) => (
            <tr
              key={`${row.codigo}-${row.cod_pred}-${row.ROW}`}
              className={`transition hover:bg-slate-50 ${
                idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
              }`}
            >
              {COLUMNS.map((c) => {
                const value = row[c.key];
                return (
                  <td
                    key={c.key}
                    className={`px-3 py-1.5 text-[11px] text-slate-600 ${
                      c.align === "right" ? "text-right font-mono" : ""
                    }`}
                  >
                    {typeof value === "number"
                      ? value.toLocaleString()
                      : String(value ?? "")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Estado vacío ─────────────────────────────────────────

export function PrediosEmptyState() {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <SearchX size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        No se encontraron resultados
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Intente ajustar los filtros de búsqueda
      </p>
    </div>
  );
}

// ── Estado de error ──────────────────────────────────────

export function PrediosErrorState({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-16">
      <div className="mb-3 rounded-full bg-red-100 p-3">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <p className="text-sm font-medium text-red-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40"
      >
        <RotateCcw size={13} />
        Reintentar
      </button>
    </div>
  );
}
