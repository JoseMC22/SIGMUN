"use client";

import {
  Building2,
  Calendar,
  Clock3,
  DollarSign,
  FileText,
  Hash,
  Monitor,
  Ruler,
  UserRound,
} from "lucide-react";
import { ObraComplementariaRow } from "../types";

interface Props {
  data: ObraComplementariaRow[];
  onEdit: (row: ObraComplementariaRow) => void;
  onDelete: (row: ObraComplementariaRow) => void;
}

const headerClass =
  "border-b border-white/10 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white";
const cellClass = "px-3 py-2 text-[11px] text-slate-700";
const actionClass =
  "inline-flex min-h-8 items-center justify-center rounded-md border px-2.5 py-1 text-[10px] font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]";

function formatValor(value: number): string {
  return value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatFecha(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function rowLabel(row: ObraComplementariaRow): string {
  return `${row.id_instala}-${row.anno}-${row.categ?.trim() || "sin-categoría"}`;
}

export default function ObrasComplementariasGrid({
  data,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm animate-fade-in">
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[1500px] border-collapse"
          data-testid="obras-complementarias-grid"
          role="grid"
          aria-label="Obras complementarias"
        >
          <thead className="bg-sat-navy">
            <tr>
              <th scope="col" className={headerClass}>
                <span className="flex items-center gap-1.5">
                  <Hash size={11} aria-hidden="true" /> ID
                </span>
              </th>
              <th scope="col" className={headerClass}>
                <span className="flex items-center gap-1.5">
                  <Calendar size={11} aria-hidden="true" /> Año
                </span>
              </th>
              <th scope="col" className={headerClass}>Categoría</th>
              <th scope="col" className={headerClass}>
                <span className="flex items-center gap-1.5">
                  <Building2 size={11} aria-hidden="true" /> Instalación
                </span>
              </th>
              <th scope="col" className={headerClass}>
                <span className="flex items-center gap-1.5">
                  <Ruler size={11} aria-hidden="true" /> Unidad
                </span>
              </th>
              <th scope="col" className={`${headerClass} text-right`}>
                <span className="flex items-center justify-end gap-1.5">
                  <DollarSign size={11} aria-hidden="true" /> Valor
                </span>
              </th>
              <th scope="col" className={headerClass}>
                <span className="flex items-center gap-1.5">
                  <FileText size={11} aria-hidden="true" /> Descripción general
                </span>
              </th>
              <th scope="col" className={headerClass}>Estado</th>
              <th scope="col" className={headerClass}>
                <span className="flex items-center gap-1.5">
                  <UserRound size={11} aria-hidden="true" /> Usuario
                </span>
              </th>
              <th scope="col" className={headerClass}>
                <span className="flex items-center gap-1.5">
                  <Monitor size={11} aria-hidden="true" /> Estación
                </span>
              </th>
              <th scope="col" className={headerClass}>
                <span className="flex items-center gap-1.5">
                  <Clock3 size={11} aria-hidden="true" /> Fecha auditoría
                </span>
              </th>
              <th scope="col" className={`${headerClass} text-center`}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => {
              const label = rowLabel(row);
              const active = row.nestado === 1;
              return (
                <tr
                  key={`${row.id_instala}-${row.anno}-${row.categ ?? "null"}`}
                  className="bg-white transition-colors even:bg-slate-50 hover:bg-cyan-50/40"
                >
                  <td className={`${cellClass} font-mono font-medium`}>
                    {row.id_instala}
                  </td>
                  <td className={`${cellClass} font-mono tabular-nums`}>
                    {row.anno}
                  </td>
                  <td className={`${cellClass} font-mono`}>
                    {row.categ?.trim() || "—"}
                  </td>
                  <td className={`${cellClass} min-w-44 font-medium`}>
                    {row.instala}
                  </td>
                  <td className={cellClass}>{row.uni_med}</td>
                  <td className={`${cellClass} text-right font-mono tabular-nums`}>
                    {formatValor(row.valor)}
                  </td>
                  <td className={`${cellClass} min-w-56`}>
                    {row.descri_gener}
                  </td>
                  <td className={cellClass}>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                        active
                          ? "bg-emerald-50 text-emerald-800 ring-emerald-700/30"
                          : "bg-slate-100 text-slate-700 ring-slate-500/30"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          active ? "bg-emerald-700" : "bg-slate-500"
                        }`}
                        aria-hidden="true"
                      />
                      {active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className={cellClass}>{row.vusernm || "—"}</td>
                  <td className={cellClass}>{row.vhostnm || "—"}</td>
                  <td className={`${cellClass} whitespace-nowrap tabular-nums`}>
                    {formatFecha(row.ddatetm)}
                  </td>
                  <td className={`${cellClass} text-center`}>
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        aria-label={`Editar fila ${label}`}
                        className={`${actionClass} border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 focus-visible:ring-amber-600`}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(row)}
                        aria-label={`Dar de baja fila ${label}`}
                        className={`${actionClass} border-red-300 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-600`}
                      >
                        Dar de baja
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
