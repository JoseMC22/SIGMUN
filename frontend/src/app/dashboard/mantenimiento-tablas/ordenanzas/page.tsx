"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarRange,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileDown,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  ScrollText,
  SearchX,
} from "lucide-react";

import NuevaOrdenanzaModal from "./components/nueva-ordenanza-modal";
import EditarOrdenanzaModal from "./components/editar-ordenanza-modal";
import OrdenanzaDetalleModal from "./components/ordenanza-detalle-modal";

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

// ─── Paginación en memoria (L5/T5) ───────────────────────────

// El GET devuelve la lista completa (S3); el footer pagina de a 15 en
// memoria (patrón mantenimiento-ingresos).
const PAGE_SIZE = 15;

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

// Dominio de estado CORREGIDO por el usuario: '1' = Activo,
// '0' = No activo. Cualquier otro valor crudo se muestra tal cual
// (defensivo: sin semántica inventada).
const estadoLabel = (estado: string) =>
  estado === "1" ? "Activo" : estado === "0" ? "No activo" : estado;

// ─── Skeleton ──────────────────────────────────────────────

// Espejo pulsante del card de resultados: barra de encabezado + filas.
function TablaSkeleton() {
  return (
    <div
      data-testid="loading-skeleton"
      className="animate-pulse overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5">
        <div className="h-2.5 w-44 rounded bg-slate-200" />
      </div>
      <div className="divide-y divide-slate-100">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-3 py-1.5">
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

  // Paginación en memoria.
  const [page, setPage] = useState(1);

  // Exportar a Excel (re-consulta completa; guard anti-carrera exportSeq).
  const [exporting, setExporting] = useState(false);
  const exportSeq = useRef(0);

  // Alta de ordenanza (T5): modal + feedback sutil de éxito.
  const [showNuevaModal, setShowNuevaModal] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edición de ordenanza (T6): master seleccionado; null = modal cerrado.
  const [editarOrdenanza, setEditarOrdenanza] = useState<OrdenanzaRow | null>(
    null,
  );

  // Detalle de ordenanza (T8): master seleccionado; null = modal cerrado.
  const [detalleOrdenanza, setDetalleOrdenanza] = useState<OrdenanzaRow | null>(
    null,
  );

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pageData = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const loadOrdenanzas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mantenimiento-tablas/ordenanzas");
      if (!res.ok) throw new Error("Error al consultar");
      const json = await res.json();
      setData(json.data ?? []);
      // Nueva consulta → siempre vuelve a la primera página.
      setPage(1);
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

  // Limpieza del timer del feedback al desmontar.
  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  // ── Paginación en memoria ────────────────────────────────

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  // ── Exportar a Excel: re-consulta el listado COMPLETO (no la página visible) ──

  const exportToExcel = useCallback(async () => {
    const token = ++exportSeq.current;
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/mantenimiento-tablas/ordenanzas");
      if (!res.ok) throw new Error("Error al exportar Excel");
      const json = await res.json();
      const rows = (json.data ?? []) as OrdenanzaRow[];
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          "ID": r.idordenanza,
          "Criterio": r.criterio,
          "Descripción": r.descripcion,
          "Vigencia Desde": formatFecha(r.fec_desde),
          "Vigencia Hasta": formatFecha(r.fec_hasta),
          "Observación": r.observacion,
          "Estado": estadoLabel(r.estado),
        })),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ordenanzas");
      XLSX.writeFile(
        wb,
        `ordenanzas-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch {
      if (token === exportSeq.current) setError("Error al exportar Excel");
    } finally {
      if (token === exportSeq.current) setExporting(false);
    }
  }, []);

  // ── Alta de ordenanza (T5) ────────────────────────────

  // Éxito del modal: cerrar + feedback sutil + re-consultar la lista.
  const handleNuevaOrdenanzaSaved = useCallback(() => {
    setShowNuevaModal(false);
    setSuccessMessage("Ordenanza creada exitosamente");
    setSuccessFeedback(true);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setSuccessFeedback(false), 4000);
    loadOrdenanzas();
  }, [loadOrdenanzas]);

  // ── Edición de ordenanza (T6) ────────────────────────────

  // Éxito del modal de edición: cerrar + feedback sutil + re-consultar.
  const handleEditarOrdenanzaSaved = useCallback(() => {
    setEditarOrdenanza(null);
    setSuccessMessage("Ordenanza actualizada exitosamente");
    setSuccessFeedback(true);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setSuccessFeedback(false), 4000);
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
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium tabular-nums text-slate-600">
            {`${data.length} ${data.length === 1 ? "registro" : "registros"}`}
          </span>

          {/* Exportar a Excel: re-consulta completa + xlsx dynamic import
              (patrón mantenimiento-ingresos). Solo con datos. */}
          <button
            type="button"
            onClick={exportToExcel}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <FileDown size={13} className="text-sat-cyan" />
                Exportar a Excel
              </>
            )}
          </button>

          {/* Ver detalle (T8) + alta (T5) + editar (T6: UPDATE vía PATCH
              @msquery=7). Eliminar sigue fuera ("Diferir ambos"). */}
          <button
            type="button"
            onClick={() => setShowNuevaModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
          >
            <Plus size={13} />
            Nueva ordenanza
          </button>
        </div>
      </div>
      <table
        className="w-full table-fixed border-collapse"
        data-testid="ordenanzas-grid"
        role="grid"
      >
        <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
          <tr>
            <th className="border-b border-white/5 px-3 py-1.5 text-left text-[11px] font-semibold uppercase text-white/90 w-[7%]">
              ID
            </th>
            <th className="border-b border-white/5 px-3 py-1.5 text-left text-[11px] font-semibold uppercase text-white/90 w-[8%]">
              Criterio
            </th>
            <th className="border-b border-white/5 px-3 py-1.5 text-left text-[11px] font-semibold uppercase text-white/90 w-[22%]">
              Descripción
            </th>
            <th className="border-b border-white/5 px-3 py-1.5 text-left text-[11px] font-semibold uppercase text-white/90 w-[18%]">
              <div className="flex items-center gap-1.5">
                <CalendarRange size={11} className="text-white/50" />
                Vigencia
              </div>
            </th>
            <th className="border-b border-white/5 px-3 py-1.5 text-left text-[11px] font-semibold uppercase text-white/90 w-[25%]">
              Observación
            </th>
            <th className="border-b border-white/5 px-3 py-1.5 text-center text-[11px] font-semibold uppercase text-white/90 w-[8%]">
              Estado
            </th>
            <th className="border-b border-white/5 px-2 py-1.5 text-center text-[11px] font-semibold uppercase text-white/90 w-[12%]">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pageData.map((row, idx) => (
            <tr
              key={`${row.idordenanza}-${idx}`}
              className={`transition hover:bg-slate-50 ${
                idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
              }`}
            >
              <td className="px-3 py-1 font-mono text-[11px] font-medium tabular-nums text-slate-700">
                {row.idordenanza}
              </td>
              <td className="px-3 py-1 font-mono text-[11px] tabular-nums text-slate-600">
                {row.criterio}
              </td>
              <td className="px-3 py-1 text-[11px] font-medium text-slate-700">
                {row.descripcion}
              </td>
              <td className="px-3 py-1 text-[11px] tabular-nums text-slate-600">
                {`${formatFecha(row.fec_desde)} – ${formatFecha(row.fec_hasta)}`}
              </td>
              <td className="px-3 py-1 text-[11px] text-slate-600">
                {row.observacion}
              </td>
              <td className="px-3 py-1 text-center">
                {/* T4: etiqueta del dominio confirmado — Activo (verde)
                    vs. No activo (gris sutil); valor fuera del dominio
                    crudo en badge neutro (defensivo). */}
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                    row.estado === "1"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : row.estado === "0"
                        ? "bg-slate-100 text-slate-500 ring-slate-200"
                        : "bg-slate-100 text-slate-600 ring-slate-200"
                  }`}
                >
                  {estadoLabel(row.estado)}
                </span>
              </td>
              {/* Acciones (T8/T6): Ver detalle (msquery=4) y Editar
                  (PATCH @msquery=7, pre-cargado con la fila master).
                  Eliminar sigue fuera (decisión "Diferir ambos"). */}
              <td className="px-2 py-1">
                <div className="flex items-center justify-center gap-0.5">
                  <button
                    type="button"
                    aria-label="Ver detalle"
                    title="Ver detalle"
                    onClick={() => setDetalleOrdenanza(row)}
                    className="rounded-md p-1 text-sat-cyan transition hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label="Editar"
                    title="Editar"
                    onClick={() => setEditarOrdenanza(row)}
                    className="rounded-md p-1 text-sat-cyan transition hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Footer de paginación (patrón mantenimiento-ingresos) ──

  const renderFooter = () => {
    if (data.length === 0) return null;

    const from = (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, data.length);

    // Números de página (mostrar a lo sumo 5, ventana centrada en la actual).
    const pages: number[] = [];
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div
        data-testid="ordenanzas-footer"
        className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/40 px-4 py-2"
      >
        <span className="text-xs text-slate-500">
          Mostrando{" "}
          <span className="font-semibold text-slate-700">{from}</span>
          {" – "}
          <span className="font-semibold text-slate-700">{to}</span> de{" "}
          <span className="font-semibold text-slate-700">{data.length}</span>{" "}
          resultados
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Anterior"
            >
              <ChevronLeft size={13} />
              Anterior
            </button>

            {pages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePageChange(p)}
                className={`min-w-[28px] rounded-md px-2 py-1 text-xs font-medium transition ${
                  p === page
                    ? "bg-sat-cyan text-white shadow-sm"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Siguiente"
            >
              Siguiente
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    );
  };

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

      {/* Feedback sutil de alta/edición exitosa (T5/T6) */}
      {successFeedback && (
        <div
          data-testid="success-feedback"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 animate-fade-in"
        >
          <CheckCircle size={14} className="shrink-0 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-700">
            {successMessage}
          </span>
        </div>
      )}

      {/* Skeleton (primera carga) */}
      {loading && <TablaSkeleton />}

      {/* Error state */}
      {!loading && error && renderErrorState()}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && renderEmptyState()}

      {/* Populated grid + footer de paginación */}
      {!loading && !error && data.length > 0 && (
        <div>
          {renderGrid()}
          {renderFooter()}
        </div>
      )}

      {/* Modal de alta de ordenanza (T5) */}
      <NuevaOrdenanzaModal
        isOpen={showNuevaModal}
        onClose={() => setShowNuevaModal(false)}
        onSuccess={handleNuevaOrdenanzaSaved}
      />

      {/* Modal de edición de la ordenanza seleccionada (T6: PATCH
          /:id → @msquery=7 vía onSuccess cierra + refresca + feedback) */}
      <EditarOrdenanzaModal
        isOpen={editarOrdenanza !== null}
        ordenanza={editarOrdenanza}
        onClose={() => setEditarOrdenanza(null)}
        onSuccess={handleEditarOrdenanzaSaved}
      />

      {/* Modal de detalle de la ordenanza seleccionada (T8, read-only:
          @msquery=4 vía GET /detalle?idordenanza=N) */}
      <OrdenanzaDetalleModal
        isOpen={detalleOrdenanza !== null}
        ordenanza={detalleOrdenanza}
        onClose={() => setDetalleOrdenanza(null)}
      />
    </div>
  );
}
