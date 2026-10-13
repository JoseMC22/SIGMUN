"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, RotateCcw, SearchX, X } from "lucide-react";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // Fila master seleccionada en la grilla (el modal es read-only).
  ordenanza: {
    idordenanza: number;
    criterio: string;
    descripcion: string;
  } | null;
}

// Contrato del GET /api/mantenimiento-tablas/ordenanzas/detalle?idordenanza=N
// (T7): el service llama caja.sp_ordenanzas @msquery=4 y ya filtró en memoria
// por cidordenanza (el SP NO filtra server-side); el modal solo renderiza.
interface OrdenanzaDetalleRow {
  idordenanza: number;
  cidordenanza: number;
  anno: string;
  tipo: string;
  tipo_rec: string;
  imp_insol: number;
  imp_reaj: number;
  mora: number;
  costo_emis: number;
  observacion: string;
  estado: string;
  fec_venc: string;
}

// Monto es-PE con 2 decimales fijos (el SP trae decimal(18,2)).
const fmtMonto = (n: number) =>
  n.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ISO datetime → DD/MM/YYYY (es-PE), anclado al mediodía local (patrón page).
const fmtFecha = (iso: string) => {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Skeleton mientras carga el detalle (filas pulsantes del alto real).
function DetalleSkeleton() {
  return (
    <div data-testid="detalle-skeleton" className="animate-pulse px-1">
      <div className="divide-y divide-slate-100">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-1.5">
            <div className="h-3 w-10 rounded bg-slate-200" />
            <div className="h-3 w-14 rounded bg-slate-100" />
            <div className="h-3 w-14 rounded bg-slate-100" />
            <div className="h-3 flex-1 rounded bg-slate-100" />
            <div className="h-3 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Modal READ-ONLY de detalle de una ordenanza (T8, iteración 3): lista las
 * filas de CAJA.DORDENANZAS del master seleccionado (msquery=4 a través del
 * endpoint GET /detalle?idordenanza=N).
 *
 * Estados: skeleton (cargando) / "Sin detalle" (vacío) / error con
 * Reintentar / tabla de datos.
 */
export default function OrdenanzaDetalleModal({
  isOpen,
  onClose,
  ordenanza,
}: Props) {
  const [detalle, setDetalle] = useState<OrdenanzaDetalleRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape cierra SOLO este modal si es el tope de la pila (convención del
  // proyecto: nunca click en el backdrop).
  const modalId = useModalStack(isOpen);

  const loadDetalle = useCallback(async (idordenanza: number) => {
    setLoading(true);
    setError(null);
    setDetalle(null);
    try {
      const res = await fetch(
        `/api/mantenimiento-tablas/ordenanzas/detalle?idordenanza=${idordenanza}`,
      );
      if (!res.ok) throw new Error("Error al consultar el detalle");
      const json = await res.json();
      setDetalle(json.data ?? []);
    } catch {
      setError("Error al consultar el detalle");
    } finally {
      setLoading(false);
    }
  }, []);

  // Al abrir (o cambiar el master): reset + consulta del detalle.
  useEffect(() => {
    if (!isOpen || !ordenanza) return;
    loadDetalle(ordenanza.idordenanza);
  }, [isOpen, ordenanza, loadDetalle]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopModal(modalId)) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, modalId, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="ordenanza-detalle-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Detalle de la ordenanza
            </h2>
            {ordenanza && (
              <p className="mt-0.5 text-xs text-slate-400">
                {`#${ordenanza.idordenanza} · Criterio ${ordenanza.criterio} · ${ordenanza.descripcion}`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-5">
          {loading && <DetalleSkeleton />}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="mb-3 rounded-full bg-red-100 p-3">
                <AlertCircle size={22} className="text-red-400" />
              </div>
              <p className="text-sm font-medium text-red-600">{error}</p>
              <button
                type="button"
                onClick={() =>
                  ordenanza && loadDetalle(ordenanza.idordenanza)
                }
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40"
              >
                <RotateCcw size={13} />
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && detalle !== null && detalle.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="mb-3 rounded-full bg-slate-100 p-3">
                <SearchX size={22} className="text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">Sin detalle</p>
              <p className="mt-1 text-xs text-slate-400">
                La ordenanza no cuenta con filas en el detalle (DOrdenanzas)
              </p>
            </div>
          )}

          {!loading && !error && detalle !== null && detalle.length > 0 && (
            <table
              data-testid="detalle-table"
              className="w-full border-collapse text-[11px]"
            >
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="border-b border-slate-100 px-2 py-1.5">
                    ID
                  </th>
                  <th className="border-b border-slate-100 px-2 py-1.5">
                    Año
                  </th>
                  <th className="border-b border-slate-100 px-2 py-1.5">
                    Tipo
                  </th>
                  <th className="border-b border-slate-100 px-2 py-1.5">
                    Tipo rec.
                  </th>
                  <th className="border-b border-slate-100 px-2 py-1.5 text-right">
                    Imp. insol.
                  </th>
                  <th className="border-b border-slate-100 px-2 py-1.5 text-right">
                    Imp. reaj.
                  </th>
                  <th className="border-b border-slate-100 px-2 py-1.5 text-right">
                    Mora
                  </th>
                  <th className="border-b border-slate-100 px-2 py-1.5 text-right">
                    Costo emis.
                  </th>
                  <th className="border-b border-slate-100 px-2 py-1.5 text-center">
                    Estado
                  </th>
                  <th className="border-b border-slate-100 px-2 py-1.5">
                    Fec. venc.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detalle.map((row, idx) => (
                  <tr
                    key={`${row.idordenanza}-${idx}`}
                    className={`transition hover:bg-slate-50 ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`}
                  >
                    <td className="px-2 py-1 font-mono font-medium tabular-nums text-slate-700">
                      {row.idordenanza}
                    </td>
                    <td className="px-2 py-1 font-mono tabular-nums text-slate-600">
                      {row.anno}
                    </td>
                    <td className="px-2 py-1 font-mono tabular-nums text-slate-600">
                      {row.tipo}
                    </td>
                    <td className="px-2 py-1 font-mono tabular-nums text-slate-600">
                      {row.tipo_rec}
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums text-slate-700">
                      {fmtMonto(row.imp_insol)}
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums text-slate-700">
                      {fmtMonto(row.imp_reaj)}
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums text-slate-700">
                      {fmtMonto(row.mora)}
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums text-slate-700">
                      {fmtMonto(row.costo_emis)}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                        {row.estado}
                      </span>
                    </td>
                    <td className="px-2 py-1 tabular-nums text-slate-600">
                      {fmtFecha(row.fec_venc)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
          <span className="text-[10px] text-slate-400">
            Lectura del SP caja.sp_ordenanzas @msquery=4 (filtrado por
            cidordenanza)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
