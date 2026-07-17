"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  SearchX,
  AlertCircle,
  RotateCcw,
  Receipt,
  FileDown,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Printer,
} from "lucide-react";
import {
  searchConsultaRDAction,
} from "@/actions/alcabala/consulta-rd";
import type { ConsultaRDRow } from "@/actions/alcabala/consulta-rd";

// ── Status badge ─────────────────────────────────────────

function StatusBadge({ estado }: { estado: string }) {
  const isActivo = estado === "ACTIVO" || estado === "PENDIENTE";
  const isPagado = estado === "PAGADO" || estado === "CANCELADO";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
        isPagado
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300/40"
          : isActivo
            ? "bg-amber-50 text-amber-700 ring-1 ring-amber-300/40"
            : "bg-red-50 text-red-700 ring-1 ring-red-300/40"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isPagado
            ? "bg-emerald-500"
            : isActivo
              ? "bg-amber-400"
              : "bg-red-400"
        }`}
      />
      {estado}
    </span>
  );
}

// ── Currency formatter ────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

// ── Loading skeleton ─────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="animate-pulse">
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2.5">
          <div className="grid grid-cols-10 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-3 bg-slate-200 rounded w-3/4" />
            ))}
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`px-3 py-3 border-b border-slate-100 ${
              i === 4 ? "border-b-0" : ""
            }`}
          >
            <div className="grid grid-cols-10 gap-4">
              {[...Array(10)].map((_, j) => (
                <div
                  key={j}
                  className="h-3.5 bg-slate-100 rounded"
                  style={{
                    width:
                      j === 0
                        ? "50%"
                        : j === 1
                          ? "40%"
                          : j === 6
                            ? "35%"
                            : "65%",
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────

export default function ConsultaRDPage() {
  // ── Filters ──────────────────────────────────────────────

  const [filters, setFilters] = useState({
    codigo: "",
    contribuyente: "",
    estado: "",
  });

  // ── Data ─────────────────────────────────────────────────

  const [data, setData] = useState<ConsultaRDRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // ── Helpers ──────────────────────────────────────────────

  /** Formatea código a 7 dígitos con ceros a la izquierda */
  const formatCodigo = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 7);
    return digits.padStart(7, "0");
  };

  // ── executeSearch ────────────────────────────────────────

  const executeSearch = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchConsultaRDAction(
          {
            codigo: filters.codigo ? formatCodigo(filters.codigo) : undefined,
            contribuyente: filters.contribuyente || undefined,
            estado: filters.estado || undefined,
          },
          pageNum,
          pageSize,
        );
        if (result.success) {
          setData(result.data);
          setTotal(result.total);
          setPage(result.page);
          setTotalPages(result.totalPages);
        } else {
          setError(result.error ?? "Error desconocido");
          setData([]);
        }
      } catch {
        setError("Error de conexión");
        setData([]);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [filters, pageSize],
  );

  // ── Initial load ─────────────────────────────────────────

  useEffect(() => {
    executeSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filter handlers ──────────────────────────────────────

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    executeSearch(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    executeSearch(newPage);
  };

  // ── Export helpers ───────────────────────────────────────

  const fetchAllRecords = useCallback(async (): Promise<ConsultaRDRow[]> => {
    const result = await searchConsultaRDAction(
      {
        codigo: filters.codigo ? formatCodigo(filters.codigo) : undefined,
        contribuyente: filters.contribuyente || undefined,
        estado: filters.estado || undefined,
      },
      1,
      99999,
    );
    if (result.success) return result.data;
    throw new Error(result.error);
  }, [filters]);

  const exportToExcel = useCallback(async () => {
    setExporting(true);
    try {
      const allData = await fetchAllRecords();
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(
        allData.map((r) => ({
          "#": r.ROW,
          Código: r.codigo,
          Nombre: r.nombre,
          RD: `${r.nomb_val} ${r.num_val}-${r.ano_val}`,
          "Monto S/.": r.MontoTotal,
          "Fec. Emisión": r.fec_val,
          Estado: r.estado,
          "F. Pago": r.fpago,
          Recibo: r.recibo,
        })),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Consulta RD");
      XLSX.writeFile(wb, `consulta-rd-alcabala.xlsx`);
    } catch {
      setError("Error al exportar Excel");
    } finally {
      setExporting(false);
    }
  }, [fetchAllRecords]);

  const exportToPdf = useCallback(async () => {
    setExporting(true);
    try {
      const allData = await fetchAllRecords();
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "landscape" });
      doc.text("Consulta RD - Alcabala", 14, 10);
      autoTable(doc, {
        startY: 16,
        head: [
          [
            "#",
            "Código",
            "Nombre",
            "RD",
            "Monto S/.",
            "Fec. Emisión",
            "Estado",
            "F. Pago",
            "Recibo",
          ],
        ],
        body: allData.map((r) => [
          String(r.ROW),
          r.codigo,
          r.nombre,
          `${r.nomb_val} ${r.num_val}-${r.ano_val}`,
          String(r.MontoTotal.toFixed(2)),
          r.fec_val,
          r.estado,
          r.fpago,
          r.recibo,
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [30, 48, 80] },
      });
      doc.save("consulta-rd-alcabala.pdf");
    } catch {
      setError("Error al exportar PDF");
    } finally {
      setExporting(false);
    }
  }, [fetchAllRecords]);

  // ── Search Form ──────────────────────────────────────────

  const renderSearchForm = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Filtros de búsqueda
        </span>
      </div>

      <div className="p-2.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          {/* Código Contribuyente */}
          <div className="md:col-span-2">
            <label
              htmlFor="codigo"
              className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
            >
              Código Contribuyente
            </label>
            <input
              id="codigo"
              type="text"
              inputMode="numeric"
              placeholder="Código"
              value={filters.codigo}
              onChange={(e) =>
                handleFilterChange("codigo", e.target.value.replace(/\D/g, "").slice(0, 7))
              }
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Contribuyente */}
          <div className="md:col-span-3">
            <label
              htmlFor="contribuyente"
              className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
            >
              Contribuyente
            </label>
            <input
              id="contribuyente"
              type="text"
              placeholder="NOMBRE DEL CONTRIBUYENTE"
              value={filters.contribuyente}
              onChange={(e) =>
                handleFilterChange("contribuyente", e.target.value.toUpperCase())
              }
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 uppercase transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Estado */}
          <div className="md:col-span-2">
            <label
              htmlFor="estado"
              className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
            >
              Estado
            </label>
            <select
              id="estado"
              aria-label="Estado"
              value={filters.estado}
              onChange={(e) => handleFilterChange("estado", e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="ACTIVO">Activo</option>
              <option value="PAGADO">Pagado</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="VENCIDO">Vencido</option>
            </select>
          </div>

          {/* Buscar button */}
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
            >
              <Search size={12} />
              Buscar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Table ───────────────────────────────────────────────

  const renderTableHeader = () => (
    <colgroup>{/* #, Código, Nombre, RD, Monto, Fec.Emisión, Estado, F.Pago, Recibo, Acciones */}
      <col className="w-[4%]" /><col className="w-[7%]" /><col className="w-[18%]" /><col className="w-[18%]" /><col className="w-[10%]" /><col className="w-[9%]" /><col className="w-[9%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[9%]" />
    </colgroup>
  );

  const renderTableBody = () => (
    <tbody className="divide-y divide-slate-100">
      {data.map((row, idx) => (
        <tr
          key={row.ROW || `rd-${idx}`}
          className={`transition hover:bg-slate-50 ${
            idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
          }`}
        >
          <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate text-center">
            {row.ROW}
          </td>
          <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">
            {row.codigo}
          </td>
          <td className="px-2 py-1.5 text-[11px] font-medium text-slate-800 truncate">
            {row.nombre}
          </td>
          <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">
            {row.nomb_val} {row.num_val}-{row.ano_val}
          </td>
          <td className="px-2 py-1.5 text-[11px] font-mono text-slate-700 truncate text-right font-semibold">
            {formatCurrency(row.MontoTotal)}
          </td>
          <td className="px-2 py-1.5 text-[11px] text-slate-500 truncate">
            {row.fec_val}
          </td>
          <td className="px-2 py-1.5">
            <StatusBadge estado={row.estado} />
          </td>
          <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">
            {row.fpago}
          </td>
          <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">
            {row.recibo}
          </td>
          <td className="px-2 py-1.5">
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                className="rounded p-1 text-slate-400 transition hover:bg-sat-cyan/10 hover:text-sat-cyan"
                aria-label="Ver detalle"
                title="Ver detalle"
              >
                <Search size={12} />
              </button>
              <button
                type="button"
                className="rounded p-1 text-slate-400 transition hover:bg-amber-100 hover:text-amber-600"
                aria-label="Ver ruta"
                title="Ver ruta"
              >
                <MapPin size={12} />
              </button>
              <button
                type="button"
                className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Imprimir"
                title="Imprimir"
              >
                <Printer size={12} />
              </button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  );

  const renderGrid = () => (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <table
        className="w-full table-fixed border-collapse"
        data-testid="consulta-rd-grid"
        role="grid"
      >
        {renderTableHeader()}
        <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
          <tr>
            <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">
              #
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">
              Código
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">
              Nombre
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">
              RD
            </th>
            <th className="text-right text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">
              Monto S/.
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">
              Fec. Emisión
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">
              Estado
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">
              F. Pago
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">
              Recibo
            </th>
            <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">
              Acciones
            </th>
          </tr>
        </thead>
        {renderTableBody()}
      </table>
    </div>
  );

  const renderResultsBar = () => (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Receipt size={13} className="text-slate-400" />
      <span>
        Se encontraron{" "}
        <span className="font-semibold text-slate-700">{total}</span>{" "}
        {total === 1 ? "registro" : "registros"} de deuda
      </span>
    </div>
  );

  // ── Pagination ──────────────────────────────────────────

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    const pages: number[] = [];
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <span className="text-xs text-slate-500">
          Mostrando{" "}
          <span className="font-semibold text-slate-700">{from}</span>
          {" – "}
          <span className="font-semibold text-slate-700">{to}</span> de{" "}
          <span className="font-semibold text-slate-700">{total}</span>{" "}
          resultados
        </span>

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
        No se encontraron registros de deuda
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Intente ajustar los filtros de búsqueda
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
        onClick={handleSearch}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40"
      >
        <RotateCcw size={13} />
        Reintentar
      </button>
    </div>
  );

  // ── Main render ─────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 0.5px, transparent 0.5px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <Receipt
              size={18}
              className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Consulta RD
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Consulta de Registro de Deuda - Alcabala
            </p>
          </div>
        </div>
      </div>

      {renderSearchForm()}

      {/* Results info */}
      {!loading && !error && !initialLoading && data.length > 0 && (
        <div className="flex items-center justify-between">
          {renderResultsBar()}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportToExcel}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-sat-navy focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={13} />
              )}
              {exporting ? "Exportando..." : "Excel"}
            </button>
            <button
              type="button"
              onClick={exportToPdf}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileDown size={13} />
              )}
              {exporting ? "Exportando..." : "PDF"}
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && initialLoading && <TableSkeleton />}

      {/* Loading overlay for subsequent searches */}
      {loading && !initialLoading && (
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-sat-cyan border-t-transparent" />
              <span className="text-xs font-medium text-slate-500">
                Buscando...
              </span>
            </div>
          </div>
          {renderGrid()}
          {renderPagination()}
        </div>
      )}

      {/* Error state */}
      {!loading && error && renderErrorState()}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && !initialLoading &&
        renderEmptyState()}

      {/* Populated grid */}
      {!loading && !error && data.length > 0 && (
        <>
          {renderGrid()}
          {renderPagination()}
        </>
      )}
    </div>
  );
}