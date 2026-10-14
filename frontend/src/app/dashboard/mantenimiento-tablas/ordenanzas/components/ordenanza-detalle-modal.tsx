"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, RotateCcw, SearchX, X } from "lucide-react";
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
// (iteración 4): el service llama caja.sp_ordenanzas @msquery=4 RE-MODELADO
// (re-verificado en vivo 13/10 ~16:32) — SELECT con JOIN a
// CAJA.TIPO_INGRESOS_DET y `WHERE CIDORDENANZA = @idordenanza`: el SP ya
// filtra server-side (volumen real: idordenanza=1 → 115 filas; 2 → 5) y el
// modal solo renderiza las 7 columnas nuevas.
interface OrdenanzaDetalleRow {
  anno: string;
  tipoRec: string;
  concepto: string;
  impInsol: number;
  impReaj: number;
  mora: number;
  costoEmis: number;
}

// Paginación en memoria DENTRO del modal (T10): 10 por página client-side
// sobre el volumen completo que ya filtró el SP; el listado mantiene su
// propio paginador de 15 (page.tsx, sin cambios).
const PAGE_SIZE = 10;

// Claves de monto ordenables (T1: click en encabezado asc/desc).
type MontoKey = "impInsol" | "impReaj" | "mora" | "costoEmis";

const MONTO_COLS: { key: MontoKey; label: string }[] = [
  { key: "impInsol", label: "Imp. insol." },
  { key: "impReaj", label: "Imp. reaj." },
  { key: "mora", label: "Mora" },
  { key: "costoEmis", label: "Costo emis." },
];

// Monto es-PE con 2 decimales fijos (el SP trae decimal(18,2)).
const fmtMonto = (n: number) =>
  n.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
 * Modal READ-ONLY de detalle de una ordenanza (T10, iteración 4): lista el
 * detalle RE-MODELADO del SP (msquery=4, JOIN a TIPO_INGRESOS_DET) a través
 * del endpoint GET /detalle?idordenanza=N, con paginador de 10 en memoria.
 *
 * Estados: skeleton (cargando) / "Sin detalle" (vacío) / error con
 * Reintentar / tabla de datos + footer de paginación.
 */
export default function OrdenanzaDetalleModal({
  isOpen,
  onClose,
  ordenanza,
}: Props) {
  const [detalle, setDetalle] = useState<OrdenanzaDetalleRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paginación en memoria dentro del modal.
  const [page, setPage] = useState(1);

  // Ordenamiento por columna de monto (T1): click alterna asc/desc.
  const [sort, setSort] = useState<{
    key: MontoKey;
    dir: "asc" | "desc";
  } | null>(null);

  const toggleSort = (key: MontoKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  };

  // Filtros client-side sobre el detalle (T2): selects derivados de los
  // datos + búsqueda de concepto. Cualquier cambio vuelve a página 1.
  const [filtroAnno, setFiltroAnno] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const limpiarFiltros = () => {
    setFiltroAnno("todos");
    setFiltroTipo("todos");
    setBusqueda("");
    setPage(1);
  };

  // Escape cierra SOLO este modal si es el tope de la pila (convención del
  // proyecto: nunca click en el backdrop).
  const modalId = useModalStack(isOpen);

  const loadDetalle = useCallback(async (idordenanza: number) => {
    setLoading(true);
    setError(null);
    setDetalle(null);
    // Apertura o re-consulta (Reintentar) → siempre vuelve a la página 1
    // y limpia los filtros (el master nuevo trae otro universo de datos).
    setPage(1);
    setFiltroAnno("todos");
    setFiltroTipo("todos");
    setBusqueda("");
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

  // Paginación en memoria sobre el detalle completo (el endpoint ya trae
  // SOLO las filas del master pedido; el SP filtra server-side).
  // T2: filtros client-side (año/tipoRec/concepto) → T1: ordenamiento por
  // montos aplicado ANTES de paginar; totales sobre las filas filtradas
  // completas (no solo la página visible).
  const rows = detalle ?? [];
  const annos = [...new Set(rows.map((r) => r.anno))].sort();
  const tipos = [...new Set(rows.map((r) => r.tipoRec))].sort();
  const q = busqueda.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (filtroAnno === "todos" || r.anno === filtroAnno) &&
      (filtroTipo === "todos" || r.tipoRec === filtroTipo) &&
      (q === "" || r.concepto.toLowerCase().includes(q)),
  );
  const sorted =
    sort === null
      ? filtered
      : [...filtered].sort((a, b) =>
          sort.dir === "asc"
            ? a[sort.key] - b[sort.key]
            : b[sort.key] - a[sort.key],
        );
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totales = sorted.reduce(
    (acc, r) => ({
      impInsol: acc.impInsol + r.impInsol,
      impReaj: acc.impReaj + r.impReaj,
      mora: acc.mora + r.mora,
      costoEmis: acc.costoEmis + r.costoEmis,
    }),
    { impInsol: 0, impReaj: 0, mora: 0, costoEmis: 0 },
  );

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  // Números de página: ventana centrada en la actual (patrón page.tsx).
  const pages: number[] = [];
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div
      data-testid="ordenanza-detalle-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
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

          {!loading &&
            !error &&
            detalle !== null &&
            detalle.length > 0 &&
            sorted.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="mb-3 rounded-full bg-slate-100 p-3">
                  <SearchX size={22} className="text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  Sin resultados para los filtros aplicados
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Ajuste los filtros o límpielos para ver todo el detalle
                </p>
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="mt-4 rounded-md border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Limpiar filtros
                </button>
              </div>
            )}

          {!loading && !error && detalle !== null && sorted.length > 0 && (
            <>
              {/* Barra de filtros client-side (T2): selects derivados de los
                  datos + búsqueda de concepto; todo cambio vuelve a página 1. */}
              <div className="mb-3 flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Filtrar por año
                  <select
                    aria-label="Filtrar por año"
                    value={filtroAnno}
                    onChange={(e) => {
                      setFiltroAnno(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-normal normal-case tracking-normal text-slate-700 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40"
                  >
                    <option value="todos">Todos</option>
                    {annos.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Filtrar por tipo
                  <select
                    aria-label="Filtrar por tipo de recurso"
                    value={filtroTipo}
                    onChange={(e) => {
                      setFiltroTipo(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-normal normal-case tracking-normal text-slate-700 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40"
                  >
                    <option value="todos">Todos</option>
                    {tipos.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Buscar concepto
                  <input
                    type="text"
                    aria-label="Buscar concepto"
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Concepto…"
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-normal normal-case tracking-normal text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40"
                  />
                </label>
              </div>
              <table
                data-testid="detalle-table"
                className="w-full table-fixed border-collapse text-[11px]"
              >
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="border-b border-slate-100 px-2 py-1.5 w-[6%]">
                    N°
                  </th>
                  <th className="border-b border-slate-100 px-2 py-1.5 w-[8%]">
                    Año
                  </th>
                  <th className="border-b border-slate-100 px-2 py-1.5 w-[11%]">
                    Tipo rec.
                  </th>
                  <th className="border-b border-slate-100 px-2 py-1.5 w-[36%]">
                    Concepto
                  </th>
                  {MONTO_COLS.map((col) => (
                    <th
                      key={col.key}
                      aria-sort={
                        sort?.key === col.key
                          ? sort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      className="border-b border-slate-100 px-2 py-1.5 text-right"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        aria-label={`Ordenar por ${col.label}`}
                        className="inline-flex items-center gap-1 uppercase tracking-wider transition hover:text-slate-600 focus:outline-none focus:underline"
                      >
                        {col.label}
                        <span aria-hidden="true" className="text-[9px]">
                          {sort?.key === col.key
                            ? sort.dir === "asc"
                              ? "▲"
                              : "▼"
                            : "⇅"}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageData.map((row, idx) => (
                  <tr
                    key={`${row.anno}-${row.tipoRec}-${idx}`}
                    className={`align-top transition hover:bg-slate-50 ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`}
                  >
                    {/* N° global del detalle (1-based, continúa entre páginas) */}
                    <td className="px-2 py-1 font-mono font-medium tabular-nums text-slate-700">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-2 py-1 font-mono tabular-nums text-slate-600">
                      {row.anno}
                    </td>
                    <td className="px-2 py-1 font-mono tabular-nums text-slate-600">
                      {row.tipoRec}
                    </td>
                    {/* Concepto (JOIN a TIPO_INGRESOS_DET): columna más ancha,
                        con wrap (varchar largo real, p.ej. "IMPUESTO AL
                        PATRIMONIO PREDIAL"). */}
                    <td className="px-2 py-1 whitespace-normal break-words text-slate-600">
                      {row.concepto}
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums text-slate-700">
                      {fmtMonto(row.impInsol)}
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums text-slate-700">
                      {fmtMonto(row.impReaj)}
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums text-slate-700">
                      {fmtMonto(row.mora)}
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums text-slate-700">
                      {fmtMonto(row.costoEmis)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot data-testid="detalle-totales">
                <tr className="bg-slate-50 font-semibold">
                  <td
                    colSpan={4}
                    className="border-t border-slate-200 px-2 py-1.5 text-right text-[10px] uppercase tracking-wider text-slate-500"
                  >
                    Totales ({sorted.length})
                  </td>
                  <td className="border-t border-slate-200 px-2 py-1.5 text-right font-mono tabular-nums text-slate-700">
                    {fmtMonto(totales.impInsol)}
                  </td>
                  <td className="border-t border-slate-200 px-2 py-1.5 text-right font-mono tabular-nums text-slate-700">
                    {fmtMonto(totales.impReaj)}
                  </td>
                  <td className="border-t border-slate-200 px-2 py-1.5 text-right font-mono tabular-nums text-slate-700">
                    {fmtMonto(totales.mora)}
                  </td>
                  <td className="border-t border-slate-200 px-2 py-1.5 text-right font-mono tabular-nums text-slate-700">
                    {fmtMonto(totales.costoEmis)}
                  </td>
                </tr>
              </tfoot>
              </table>
            </>
          )}
        </div>

        {/* Footer: paginador de 10 dentro del modal (patrón page.tsx) +
            Cerrar. Con datos → Mostrando X–Y de N + controles; sin datos el
            paginador no aparece (solo Cerrar). */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
          {detalle !== null && sorted.length > 0 && (
            <div
              data-testid="detalle-footer"
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/40 px-3 py-1.5"
            >
              <span className="text-xs text-slate-500">
                Mostrando{" "}
                <span className="font-semibold text-slate-700">
                  {(page - 1) * PAGE_SIZE + 1}
                </span>
                {" – "}
                <span className="font-semibold text-slate-700">
                  {Math.min(page * PAGE_SIZE, sorted.length)}
                </span>
                {" de "}
                <span className="font-semibold text-slate-700">
                  {sorted.length}
                </span>
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
          )}

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
