"use client";

import {
  Calendar,
  MapPin,
  Hash,
  DollarSign,
  UserRound,
  Monitor,
  Clock3,
} from "lucide-react";
import { ValorUnitarioRow } from "../types";

interface Props {
  data: ValorUnitarioRow[];
  onEdit: (row: ValorUnitarioRow) => void;
  onDelete: (row: ValorUnitarioRow) => void;
}

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

export default function ValoresUnitariosGrid({ data, onEdit, onDelete }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <div className="overflow-x-auto">
        <table
          className="w-full table-fixed border-collapse"
          data-testid="valores-unitarios-grid"
          role="grid"
        >
          <thead className="bg-gradient-to-r from-sat-navy to-sat-navy/90">
            <tr>
              <th className="w-[8%] border-b border-white/5 px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-white/90">
                <span className="flex items-center gap-1.5">
                  <Calendar size={11} className="text-white/50" /> Año
                </span>
              </th>
              <th className="w-[8%] border-b border-white/5 px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-white/90">
                <span className="flex items-center gap-1.5">
                  <MapPin size={11} className="text-white/50" /> Región
                </span>
              </th>
              <th className="w-[8%] border-b border-white/5 px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-white/90">
                <span className="flex items-center gap-1.5">
                  <Hash size={11} className="text-white/50" /> Código
                </span>
              </th>
              <th className="w-[12%] border-b border-white/5 px-3 py-2.5 text-right text-[11px] font-semibold uppercase text-white/90">
                <span className="flex items-center justify-end gap-1.5">
                  <DollarSign size={11} className="text-white/50" /> Valor
                </span>
              </th>
              <th className="w-[15%] border-b border-white/5 px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-white/90">
                <span className="flex items-center gap-1.5">
                  <UserRound size={11} className="text-white/50" /> Operador
                </span>
              </th>
              <th className="w-[15%] border-b border-white/5 px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-white/90">
                <span className="flex items-center gap-1.5">
                  <Monitor size={11} className="text-white/50" /> Estación
                </span>
              </th>
              <th className="w-[16%] border-b border-white/5 px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-white/90">
                <span className="flex items-center gap-1.5">
                  <Clock3 size={11} className="text-white/50" /> Fecha ing.
                </span>
              </th>
              <th className="w-[18%] border-b border-white/5 px-3 py-2.5 text-center text-[11px] font-semibold uppercase text-white/90">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, index) => (
              <tr
                key={`${row.region}-${row.anno}-${row.codi}-${index}`}
                className={`transition hover:bg-slate-50 ${
                  index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                }`}
              >
                <td className="px-3 py-2 font-mono text-[11px] font-medium text-slate-700 tabular-nums">
                  {row.anno}
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                  {row.region}
                </td>
                <td className="px-3 py-2 font-mono text-[11px] font-medium text-slate-700">
                  {row.codi}
                </td>
                <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-700 tabular-nums">
                  {formatValor(row.valor)}
                </td>
                <td className="px-3 py-2 text-[11px] text-slate-600">
                  {row.operador || "—"}
                </td>
                <td className="px-3 py-2 text-[11px] text-slate-600">
                  {row.estacion || "—"}
                </td>
                <td className="px-3 py-2 text-[11px] text-slate-500 tabular-nums">
                  {formatFecha(row.fechor_ing)}
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      aria-label={`Editar fila ${row.anno}-${row.region}-${row.codi}`}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-1 text-[10px] font-medium text-amber-600 shadow-sm transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400/30 active:scale-[0.98]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      aria-label={`Eliminar fila ${row.anno}-${row.region}-${row.codi}`}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[10px] font-medium text-red-600 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400/30 active:scale-[0.98]"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
