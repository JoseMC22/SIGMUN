"use client";

import { Eye, Printer, Trash2, Plus, Loader2 } from "lucide-react";
import type { AlcabalaItem } from "@/actions/alcabala/determinar-alcabala";

// ─── Types ─────────────────────────────────────────────────

interface Props {
  data: AlcabalaItem[];
  loading: boolean;
  onViewDetail?: (alcabala: AlcabalaItem) => void;
  onNuevo?: () => void;
}

// ─── Helpers ───────────────────────────────────────────────

function mapEstado(estado: string): string {
  const num = Number(estado);
  switch (num) {
    case 1:
      return "Activo";
    case 2:
      return "Anulado";
    case 0:
      return "Inactivo";
    default:
      return estado || "Sin estado";
  }
}

// ─── Component ─────────────────────────────────────────────

export default function AlcabalasTable({ data, loading, onViewDetail, onNuevo }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-sat-cyan" />
        <span className="ml-2 text-xs text-slate-500">Cargando alcabalas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {data.length} {data.length === 1 ? "registro" : "registros"}
        </span>
        <button
          type="button"
          onClick={onNuevo}
          className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
          title="Nueva Alcabala"
        >
          <Plus size={14} />
          Nuevo
        </button>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full table-fixed border-collapse">
          <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
            <tr>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[10%]">
                ID Alcabala
              </th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[14%]">
                Fecha Registro
              </th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[14%]">
                Monto Alcabala
              </th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[12%]">
                Cód. Predio
              </th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[10%]">
                Año Predio
              </th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[12%]">
                Cód. Venta
              </th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[10%]">
                Estado
              </th>
              <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[18%]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-xs text-slate-400">
                  No hay registros para mostrar
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr
                  key={`${item.idAlcabala}-${idx}`}
                  className={`transition hover:bg-slate-50 ${
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  }`}
                >
                  <td className="px-3 py-2 text-[11px] font-mono text-slate-700 truncate">
                    {item.idAlcabala}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                    {item.fechaRegistro}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                    {item.montoAlcabala.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-[11px] font-mono text-slate-600 truncate">
                    {item.codPred}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                    {item.anioPred}
                  </td>
                  <td className="px-3 py-2 text-[11px] font-mono text-slate-600 truncate">
                    {item.codigoVenta}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                    {mapEstado(item.estado)}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="group relative">
                        <button
                          type="button"
                          onClick={() => onViewDetail?.(item)}
                          className="inline-flex items-center justify-center rounded p-1 text-sky-600 transition hover:bg-sky-50 active:scale-95"
                          title="Ver Detalle"
                        >
                          <Eye size={13} />
                        </button>
                        <span className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                          Ver Detalle
                        </span>
                      </span>
                      <span className="group relative">
                        <button
                          type="button"
                          disabled
                          onClick={() => console.log("Imprimir", item.idAlcabala)}
                          className="inline-flex items-center justify-center rounded p-1 text-blue-600 transition hover:bg-blue-50 active:scale-95 disabled:text-slate-300 disabled:cursor-not-allowed"
                          title="Por desarrollar"
                        >
                          <Printer size={13} />
                        </button>
                        <span className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                          Imprimir Formato
                        </span>
                      </span>
                      <span className="group relative">
                        <button
                          type="button"
                          disabled
                          onClick={() => console.log("Eliminar", item.idAlcabala)}
                          className="inline-flex items-center justify-center rounded p-1 text-red-500 transition hover:bg-red-50 active:scale-95 disabled:text-slate-300 disabled:cursor-not-allowed"
                          title="Por desarrollar"
                        >
                          <Trash2 size={13} />
                        </button>
                        <span className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                          Eliminar
                        </span>
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}