"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarRange,
  RotateCcw,
  ScrollText,
  SearchX,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────

// Contrato S3 (congelado): GET /api/mantenimiento-tablas/ordenanzas →
// { data: OrdenanzaRow[] }. Fechas ISO datetime en passthrough; el front
// formatea.
interface OrdenanzaRow {
  idordenanza: number;
  criterio: string;
  descripcion: string;
  fec_desde: string;
  fec_hasta: string;
  observacion: string;
  estado: string;
  operador: string;
  estacion: string;
  fech_ing: string;
}

// ─── Helpers ───────────────────────────────────────────────

// ISO datetime → DD/MM/YYYY (es-PE). Determinístico: toma los primeros 10
// chars del ISO ("YYYY-MM-DD") y los ancla al mediodía local, sin depender
// de la zona horaria del runtime.
const formatFecha = (iso: string) => {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// ─── Skeleton ──────────────────────────────────────────────

// Espejo pulsante del card de resultados: barra de encabezado + filas.
function TablaSkeleton() {
  return (
    <div
      data-testid="loading-skeleton"
      className="animate-pulse overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-2.5">
        <div className="h-2.5 w-44 rounded bg-slate-200" />
      </div>
      <div className="divide-y divide-slate-100">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-3 py-2.5">
            <div className="h-3 w-8 rounded bg-slate-200" />
            <div className="h-3 w-10 rounded bg-slate-100" />
            <div className="h-3 w-36 rounded bg-slate-200" />
            <div className="h-3 w-28 rounded bg-slate-100" />
            <div className="h-3 flex-1 rounded bg-slate-100" />
            <div className="h-4 w-10 rounded-full bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function OrdenanzasPage() {
  const [data, setData] = useState<OrdenanzaRow[]>([]);
  // Arranca cargando: la auto-consulta al montar muestra el skeleton inmediato.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrdenanzas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mantenimiento-tablas/ordenanzas");
      if (!res.ok) throw new Error("Error al consultar");
      const json = await res.json();
      setData(json.data ?? []);
    } catch {
      setError("Error de conexión");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-consulta al montar (convención de la sección mantenimiento-tablas).
  useEffect(() => {
    loadOrdenanzas();
  }, [loadOrdenanzas]);

  // ── Results table ────────────────────────────────────────

  const renderGrid = () => (
    <div className="animate-fade-in overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Encabezado del card: etiqueta de sección + contador de registros */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Listado de ordenanzas
          </span>
        </div>
        <span className="text-[11px] font-medium tabular-nums text-slate-600">
          {`${data.length} ${data.length === 1 ? "registro" : "registros"}`}
        </span>
      </div>
      <table
        className="w-full table-fixed border-collapse"
        data-testid="ordenanzas-grid"
        role="grid"
      >
        <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
          <tr>
            <th className="border-b border-white/5 px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-white/90 w-[7%]">
              ID
            </th>
            <th className="border-b border-white/5 px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-white/90 w-[8%]">
              Criterio
            </th>
            <th className="border-b border-white/5 px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-white/90 w-[24%]">
              Descripción
            </th>
            <th className="border-b border-white/5 px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-white/90 w-[20%]">
              <div className="flex items-center gap-1.5">
                <CalendarRange size={11} className="text-white/50" />
                Vigencia
              </div>
            </th>
            <th className="border-b border-white/5 px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-white/90 w-[31%]">
              Observación
            </th>
            <th className="border-b border-white/5 px-3 py-2.5 text-center text-[11px] font-semibold uppercase text-white/90 w-[10%]">
              Estado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, idx) => (
            <tr
              key={`${row.idordenanza}-${idx}`}
              className={`transition hover:bg-slate-50 ${
                idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
              }`}
            >
              <td className="px-3 py-2 font-mono text-[11px] font-medium tabular-nums text-slate-700">
                {row.idordenanza}
              </td>
              <td className="px-3 py-2 font-mono text-[11px] tabular-nums text-slate-600">
                {row.criterio}
              </td>
              <td className="px-3 py-2 text-[11px] font-medium text-slate-700">
                {row.descripcion}
              </td>
              <td className="px-3 py-2 text-[11px] tabular-nums text-slate-600">
                {`${formatFecha(row.fec_desde)} – ${formatFecha(row.fec_hasta)}`}
              </td>
              <td className="px-3 py-2 text-[11px] text-slate-600">
                {row.observacion}
              </td>
              <td className="px-3 py-2 text-center">
                {/* Iteración 1: valor crudo del dominio en badge sutil,
                    sin semántica inventada hasta confirmar el dominio. */}
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                  {row.estado}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Empty state ──────────────────────────────────────────

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <SearchX size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        No se encontraron ordenanzas
      </p>
      <p className="mt-1 text-xs text-slate-400">
        No hay registros de ordenanzas de caja para mostrar
      </p>
    </div>
  );

  // ── Error state ──────────────────────────────────────────

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-red-100 p-3">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <p className="text-sm font-medium text-red-600">{error}</p>
      <button
        type="button"
        onClick={loadOrdenanzas}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40"
      >
        <RotateCcw size={13} />
        Reintentar
      </button>
    </div>
  );

  // ── Main render ──────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        {/* Dot pattern overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 0.5px, transparent 0.5px)", backgroundSize: "16px 16px" }}
        />
        {/* Gloss flare */}
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <ScrollText size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="font-outfit text-lg font-bold tracking-tight text-white">
              Ordenanzas
            </h1>
            <p className="font-inter text-xs text-white/50">
              Registro de ordenanzas de caja: criterios y períodos de vigencia
            </p>
          </div>
        </div>
      </div>

      {/* Skeleton (primera carga) */}
      {loading && <TablaSkeleton />}

      {/* Error state */}
      {!loading && error && renderErrorState()}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && renderEmptyState()}

      {/* Populated grid */}
      {!loading && !error && data.length > 0 && renderGrid()}
    </div>
  );
}
