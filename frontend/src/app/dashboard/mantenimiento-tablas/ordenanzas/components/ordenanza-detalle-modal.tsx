"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Download, Pencil, Plus, RotateCcw, SearchX, X } from "lucide-react";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";
import EditarDetalleModal from "./editar-detalle-modal";
import NuevoDetalleModal from "./nuevo-detalle-modal";

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
// (iteración 4 + llaves T3): el service llama caja.sp_ordenanzas @msquery=4
// RE-MODELADO (re-verificado en vivo 13/10 ~16:32) — SELECT con JOIN a
// CAJA.TIPO_INGRESOS_DET y `WHERE CIDORDENANZA = @idordenanza`: el SP ya
// filtra server-side (volumen real: idordenanza=1 → 115 filas; 2 → 5) y el
// modal solo renderiza las columnas nuevas. idDetalle = PK del detalle
// (WHERE del modo 8), cidordenanza = master de la fila. T7: tipo/
// observacion/estado preservados del GET (el modal de edición los devuelve
// tal cual, NO editables, sin columnas visibles nuevas).
interface OrdenanzaDetalleRow {
  idDetalle: number;
  cidordenanza: number;
  anno: string;
  tipoRec: string;
  concepto: string;
  impInsol: number;
  impReaj: number;
  mora: number;
  costoEmis: number;
  tipo: string;
  observacion: string;
  estado: string;
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

  // Exportar a Excel en curso (T3): deshabilita el botón Exportar.
  const [exporting, setExporting] = useState(false);

  // Ordenamiento por columna de monto (T1): click alterna asc/desc.
  const [sort, setSort] = useState<{
    key: MontoKey;
    dir: "asc" | "desc";
  } | null>(null);

  // Edición de fila del detalle (T4): fila seleccionada para el modal hijo
  // + feedback sutil de guardado exitoso (patrón page.tsx).
  const [editingRow, setEditingRow] = useState<OrdenanzaDetalleRow | null>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);
  // Alta de fila del detalle (ordenanzas-detalle-alta): apertura del modal
  // hijo de alta + feedback propio de registro exitoso.
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [createdFeedback, setCreatedFeedback] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Caché en memoria por idordenanza (T3, Map): evita re-consultar al
  // cerrar y reabrir el mismo master o al volver a él. Instancia-local
  // (useRef) para no filtrar datos entre masters ni entre montajes.
  const cacheRef = useRef(new Map<number, OrdenanzaDetalleRow[]>());
  // Controlador del request en vuelo (T3): se aborta al cerrar, al cambiar
  // de master, al reintentar o al desmontar; las respuestas tardías se
  // ignoran vía guards con signal.aborted (race del master anterior).
  // Nota: el signal NO se adjunta al fetch para mantener la llamada GET de
  // un solo argumento que afirma page.test.tsx (fuera del alcance
  // autorizado); la cancelación es lógica vía los guards.
  const abortRef = useRef<AbortController | null>(null);

  const loadDetalle = useCallback(
    async (idordenanza: number, opts?: { invalidate?: boolean }) => {
      // Toda carga nueva cancela la anterior en vuelo.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      setDetalle(null);
      // Apertura o re-consulta (Reintentar) → siempre vuelve a la página 1
      // y limpia los filtros (el master nuevo trae otro universo de datos).
      setPage(1);
      setFiltroAnno("todos");
      setFiltroTipo("todos");
      setBusqueda("");
      // Caché en memoria por idordenanza; Reintentar la invalida.
      if (!opts?.invalidate && cacheRef.current.has(idordenanza)) {
        setDetalle(cacheRef.current.get(idordenanza) ?? []);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/mantenimiento-tablas/ordenanzas/detalle?idordenanza=${idordenanza}`,
        );
        // Respuesta tardía de un master anterior → se ignora (race).
        if (controller.signal.aborted) return;
        if (!res.ok) throw new Error("Error al consultar el detalle");
        const json = await res.json();
        if (controller.signal.aborted) return;
        const data = (json.data ?? []) as OrdenanzaDetalleRow[];
        cacheRef.current.set(idordenanza, data);
        setDetalle(data);
      } catch {
        if (controller.signal.aborted) return;
        setError("Error al consultar el detalle");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [],
  );

  // Al abrir (o cambiar el master): reset + consulta del detalle. Al
  // cerrar, cambiar de master o desmontar: aborta el request en vuelo.
  useEffect(() => {
    if (!isOpen || !ordenanza) return;
    loadDetalle(ordenanza.idordenanza);
    return () => abortRef.current?.abort();
  }, [isOpen, ordenanza, loadDetalle]);

  // Limpieza del timer del feedback al desmontar.
  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  // Éxito del modal de edición del detalle (T4): cerrar el hijo + feedback
  // sutil + invalidar la caché T3 del master + re-consultar (patrón
  // handleEditarOrdenanzaSaved de page.tsx).
  const handleEditarDetalleSaved = useCallback(() => {
    if (!ordenanza) return;
    setEditingRow(null);
    setSavedFeedback(true);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setSavedFeedback(false), 4000);
    cacheRef.current.delete(ordenanza.idordenanza);
    loadDetalle(ordenanza.idordenanza);
  }, [ordenanza, loadDetalle]);

  // Éxito del modal de alta del detalle (ordenanzas-detalle-alta): mismo
  // patrón que la edición (el hijo NO se auto-cierra: el padre cierra +
  // feedback propio + invalida la caché T3 del master + re-consulta).
  const handleNuevoDetalleSaved = useCallback(() => {
    if (!ordenanza) return;
    setNuevoOpen(false);
    setCreatedFeedback(true);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setCreatedFeedback(false), 4000);
    cacheRef.current.delete(ordenanza.idordenanza);
    loadDetalle(ordenanza.idordenanza);
  }, [ordenanza, loadDetalle]);

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
  // montos con click como override → T5 (REVERTIDA el 2026-10-15, pedido
  // del usuario): el front YA NO re-ordena cuando no hay click en un monto;
  // se conserva el orden que devuelve el SP (ORDER BY IDORDENANZA = orden
  // de carga). Todo aplicado ANTES de paginar; totales sobre las filas
  // filtradas completas (no solo la página visible).
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
      ? // Sin click en una columna: passthrough del orden del SP.
        // `filtered` ya es un array nuevo (viene de .filter), así que
        // reutilizarlo no muta `rows`.
        filtered
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

  // Exportar a Excel del detalle FILTRADO (T3): mismo patrón que page.tsx
  // (dynamic import de xlsx, json_to_sheet con encabezados en español,
  // writeFile). Función simple (no hook) porque usa `sorted`, calculado
  // tras el early return de isOpen.
  const exportDetalle = async () => {
    if (!ordenanza || sorted.length === 0 || exporting) return;
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(
        sorted.map((r) => ({
          "Año": r.anno,
          "Tipo rec.": r.tipoRec,
          "Concepto": r.concepto,
          "Imp. insol.": r.impInsol,
          "Imp. reaj.": r.impReaj,
          "Mora": r.mora,
          "Costo emis.": r.costoEmis,
        })),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Detalle");
      XLSX.writeFile(
        wb,
        `ordenanza-${ordenanza.idordenanza}-detalle-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } finally {
      setExporting(false);
    }
  };

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
          {/* Feedback sutil de edición exitosa (T4, patrón page.tsx) */}
          {savedFeedback && (
            <div
              data-testid="detalle-saved-feedback"
              className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
            >
              <span className="text-xs font-medium text-emerald-700">
                Detalle de ordenanza actualizado exitosamente
              </span>
            </div>
          )}
          {/* Feedback sutil de alta exitosa (ordenanzas-detalle-alta,
              mismo patrón que la edición con mensaje propio). */}
          {createdFeedback && (
            <div
              data-testid="detalle-created-feedback"
              className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
            >
              <span className="text-xs font-medium text-emerald-700">
                Detalle de ordenanza registrado exitosamente
              </span>
            </div>
          )}
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
                  ordenanza &&
                  loadDetalle(ordenanza.idordenanza, { invalidate: true })
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
                  <th className="border-b border-slate-100 px-2 py-1.5 w-[30%]">
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
                  {/* Editar por fila (T4): abre el modal hijo con la fila
                      (idDetalle+cidordenanza). Columna al final para no
                      mover los índices de las celdas de montos. */}
                  <th className="border-b border-slate-100 px-2 py-1.5 w-[6%] text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageData.map((row, idx) => (
                  <tr
                    key={row.idDetalle ?? `${row.anno}-${row.tipoRec}-${idx}`}
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
                    <td className="px-2 py-1 text-right">
                      <button
                        type="button"
                        onClick={() => setEditingRow(row)}
                        aria-label={`Editar detalle ${row.idDetalle}`}
                        title="Editar"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40"
                      >
                        <Pencil size={11} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot data-testid="detalle-totales">
                <tr className="bg-slate-50 font-semibold">
                  <td
                    colSpan={5}
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

          <div className="flex items-center gap-2">
            {/* Alta de fila del detalle (ordenanzas-detalle-alta): acción
                primaria del footer junto a Exportar/Cerrar (no en la barra
                de filtros, zona densa de control); visible también con el
                detalle vacío, cuando el alta más se necesita. */}
            <button
              type="button"
              onClick={() => setNuevoOpen(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={13} />
              Nuevo
            </button>
            <button
              type="button"
              onClick={exportDetalle}
              disabled={loading || exporting || sorted.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Download size={13} />
              {exporting ? "Exportando…" : "Exportar"}
            </button>
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

      {/* Modal hijo de edición del detalle (T4): al guardar invalida la
          caché T3 del master + re-consulta + feedback (sin auto-cerrar en
          el hijo: el padre cierra). */}
      <EditarDetalleModal
        isOpen={editingRow !== null}
        detalle={editingRow}
        onClose={() => setEditingRow(null)}
        onSuccess={handleEditarDetalleSaved}
      />

      {/* Modal hijo de alta del detalle (ordenanzas-detalle-alta): master
          fijo por contexto (solo lectura) + al guardar invalida la caché
          T3 del master + re-consulta + feedback (sin auto-cerrar en el
          hijo: el padre cierra). */}
      <NuevoDetalleModal
        isOpen={nuevoOpen}
        master={
          ordenanza
            ? {
                cidordenanza: ordenanza.idordenanza,
                descripcion: ordenanza.descripcion,
              }
            : null
        }
        onClose={() => setNuevoOpen(false)}
        onSuccess={handleNuevoDetalleSaved}
      />
    </div>
  );
}
