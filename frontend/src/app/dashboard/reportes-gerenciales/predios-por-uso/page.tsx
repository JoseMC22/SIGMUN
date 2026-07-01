"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  SearchX,
  AlertCircle,
  RotateCcw,
  FolderSearch,
  LayoutGrid,
  ExternalLink,
  X,
} from "lucide-react";
import { searchPrediosUsoAction, getDetallePredioUsoAction, getUsoOptionsAction } from "@/actions/reportes-gerenciales/predios-uso";
import type { PredioUsoRow, UsoOption } from "@/actions/reportes-gerenciales/predios-uso";

// ── Year range ────────────────────────────────────────────

const YEAR_START = 2016;
const YEAR_END = new Date().getFullYear(); // 2026
const YEARS: number[] = [];
for (let y = YEAR_END; y >= YEAR_START; y--) {
  YEARS.push(y);
}

// ── Loading skeleton ─────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden" data-testid="loading-spinner">
      <div className="animate-pulse">
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2.5">
          <div className="grid grid-cols-7 gap-4">
            {[...Array(7)].map((_, i) => (
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
            <div className="grid grid-cols-7 gap-4">
              {[...Array(7)].map((_, j) => (
                <div
                  key={j}
                  className="h-3.5 bg-slate-100 rounded"
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

// ── Main Page ────────────────────────────────────────────

export default function PrediosUsoPage() {
  // ── Filters ──────────────────────────────────────────────

  const [filters, setFilters] = useState({
    codigo: "",
    anno: String(new Date().getFullYear()),
    uso: "",
  });

  // ── Data ─────────────────────────────────────────────────

  const [data, setData] = useState<PredioUsoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // ── Uso options (combo) ───────────────────────────────────

  const [usoOptions, setUsoOptions] = useState<UsoOption[]>([]);
  const [usoOptionsLoading, setUsoOptionsLoading] = useState(true);

  // ── Detail modal ─────────────────────────────────────────

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailData, setDetailData] = useState<Record<string, any>[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const DETAIL_PAGE_SIZE = 15;

  const handleDetalle = useCallback(async (row: PredioUsoRow) => {
    setDetailTitle(`Detalle — ${row.tipo}: ${row.uso}`);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData([]);
    try {
      const result = await getDetallePredioUsoAction({
        codigo: "",
        anno: row.anno,
        id_uso: row.id_uso,
        flag: "U",
      });
      if (result.success) {
        setDetailData(result.data);
        setDetailPage(1);
      } else {
        setDetailError(result.error);
      }
    } catch {
      setDetailError("Error de conexión");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailData([]);
    setDetailError(null);
  }, []);

  // ── Export helpers ───────────────────────────────────────

  const exportDetailExcel = useCallback(async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(detailData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle');
    XLSX.writeFile(wb, `predios-detalle-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [detailData]);

  const exportDetailPdf = useCallback(async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape' });
    const keys = detailData.length > 0 ? Object.keys(detailData[0]) : [];

    doc.setFontSize(10);
    doc.text('Detalle - Predios por Uso', 14, 12);

    autoTable(doc, {
      head: [keys],
      body: detailData.map((row) => keys.map((k) => row[k] ?? '')),
      styles: { fontSize: 7 },
      startY: 18,
      margin: { top: 18 },
    });

    doc.save(`predios-detalle-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [detailData]);

  // ── Main export helpers ───────────────────────────────────

  const mainExportData = useCallback(() => {
    return data.map((row) => ({
      Tipo: tipoLabel(row.tipo),
      Uso: row.uso,
      Año: row.anno,
      Predios: row.predios,
      Condición: row.condicion,
    }));
  }, [data]);

  const exportMainExcel = useCallback(async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(mainExportData());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Predios por Uso');
    XLSX.writeFile(wb, `predios-por-uso-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [mainExportData]);

  const exportMainPdf = useCallback(async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape' });
    const rows = mainExportData();
    const keys = rows.length > 0 ? Object.keys(rows[0]) : [];

    doc.setFontSize(10);
    doc.text('Predios por Uso', 14, 12);

    autoTable(doc, {
      head: [keys],
      body: rows.map((r) => keys.map((k) => r[k as keyof typeof r] ?? '')),
      styles: { fontSize: 7 },
      startY: 18,
      margin: { top: 18 },
    });

    doc.save(`predios-por-uso-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [mainExportData]);

  // ── executeSearch ────────────────────────────────────────

  const executeSearch = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchPrediosUsoAction(
          {
            codigo: filters.codigo || undefined,
            anno: filters.anno ? Number(filters.anno) : undefined,
            uso: filters.uso || undefined,
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
          setError(result.error);
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

  // ── Load uso options ──────────────────────────────────────

  useEffect(() => {
    (async () => {
      const result = await getUsoOptionsAction();
      if (result.success) {
        setUsoOptions(result.options);
      }
      setUsoOptionsLoading(false);
    })();
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
          {/* Código */}
          <div className="md:col-span-3">
            <label htmlFor="codigo" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Código</label>
            <input id="codigo" type="text" placeholder="Código del predio"
              value={filters.codigo}
              onChange={(e) => handleFilterChange("codigo", e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Año */}
          <div className="md:col-span-3">
            <label htmlFor="anno" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Año</label>
            <select id="anno" aria-label="Año" value={filters.anno}
              onChange={(e) => handleFilterChange("anno", e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              <option value="">Todos</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Uso */}
          <div className="md:col-span-3">
            <label htmlFor="uso" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Uso</label>
            <select id="uso" aria-label="Uso" value={filters.uso}
              onChange={(e) => handleFilterChange("uso", e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              <option value="">{usoOptionsLoading ? "Cargando..." : "Todos"}</option>
              {usoOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Buscar button */}
          <div className="md:col-span-3 flex items-center gap-2">
            <button type="button" onClick={handleSearch}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
            >
              <Search size={12} />
              Buscar
            </button>
            <span className="text-[9px] text-slate-400 leading-none">
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[8px] text-slate-500">↵</kbd>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Table ───────────────────────────────────────────────

  const renderTableHeader = () => (
    <colgroup>
      <col className="w-[11%]" />
      <col className="w-[24%]" />
      <col className="w-[8%]" />
      <col className="w-[12%]" />
      <col className="w-[33%]" />
      <col className="w-[12%]" />
    </colgroup>
  );

  const tipoLabel = (val: string) => {
    if (val === 'U' || val === 'u') return 'Único';
    if (val === 'C' || val === 'c') return 'Copropietario';
    return val;
  };

  const renderTableBody = () => (
    <tbody className="divide-y divide-slate-100">
      {data.map((row, idx) => (
        <tr
          key={`${row.tipo}-${row.uso}-${row.anno}`}
          className={`transition hover:bg-slate-50 ${
            idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
          }`}
        >
          <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">
            {tipoLabel(row.tipo)}
          </td>
          <td className="px-2 py-1.5 text-[11px] font-medium text-slate-800 truncate">
            {row.uso}
          </td>
          <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate text-center">
            {row.anno}
          </td>
          <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate text-right">
            {row.predios.toLocaleString()}
          </td>
          <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">
            {row.condicion}
          </td>
          <td className="px-2 py-1.5 text-center">
            <button
              type="button"
              onClick={() => handleDetalle(row)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:border-sat-cyan hover:text-sat-cyan focus:outline-none focus:ring-2 focus:ring-sat-cyan/20 active:scale-[0.97]"
              title="Ver detalle"
            >
              <ExternalLink size={11} />
              Detalle
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  );

  const renderGrid = () => (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <table
        className="w-full table-fixed border-collapse"
        data-testid="predios-grid"
        role="grid"
      >
        {renderTableHeader()}
        <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
          <tr>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Tipo</th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Uso</th>
            <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Año</th>
            <th className="text-right text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Predios</th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Condición</th>
            <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Acción</th>
          </tr>
        </thead>
        {renderTableBody()}
      </table>
    </div>
  );

  const renderResultsBar = () => {
    const totalPredios = data.reduce((sum, row) => sum + row.predios, 0);

    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <FolderSearch size={13} className="text-slate-400" />
            <span>
              <span className="font-semibold text-slate-700">{total}</span>{" "}
              {total === 1 ? "resultado" : "resultados"}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 4-6"/></svg>
            <span>
              <span className="font-semibold text-slate-700">{totalPredios.toLocaleString()}</span>{" "}
              predios
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportMainExcel}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-medium text-emerald-600 transition hover:bg-emerald-50 hover:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200/40 active:scale-[0.97]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M12 13h2"/><path d="M12 17h2"/></svg>
            Excel
          </button>
          <button
            type="button"
            onClick={exportMainPdf}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-medium text-red-600 transition hover:bg-red-50 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-200/40 active:scale-[0.97]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 12v4"/><path d="M10 14h4"/></svg>
            PDF
          </button>
        </div>
      </div>
    );
  };

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
        No se encontraron resultados
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

  // ── Detail Modal ────────────────────────────────────────

  const renderDetailModal = () => {
    if (!detailOpen) return null;

    const keys = detailData.length > 0 ? Object.keys(detailData[0]) : [];
    const detailTotalPages = Math.ceil(detailData.length / DETAIL_PAGE_SIZE);
    const detailStart = (detailPage - 1) * DETAIL_PAGE_SIZE;
    const paginatedDetail = detailData.slice(detailStart, detailStart + DETAIL_PAGE_SIZE);
    const detailFrom = detailStart + 1;
    const detailTo = Math.min(detailStart + DETAIL_PAGE_SIZE, detailData.length);
    const detailPages: number[] = [];
    const detailStartPage = Math.max(1, detailPage - 2);
    const detailEndPage = Math.min(detailTotalPages, detailPage + 2);
    for (let i = detailStartPage; i <= detailEndPage; i++) detailPages.push(i);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={closeDetail}>
        <div className="relative max-h-[80vh] w-full max-w-7xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-sat-cyan rounded-full" />
              <h2 className="text-sm font-semibold text-slate-700 font-outfit">
                {detailTitle}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {!detailLoading && detailData.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={exportDetailExcel}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-medium text-emerald-600 transition hover:bg-emerald-50 hover:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200/40 active:scale-[0.97]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M12 13h2"/><path d="M12 17h2"/></svg>
                    Excel
                  </button>
                  <button
                    type="button"
                    onClick={exportDetailPdf}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-medium text-red-600 transition hover:bg-red-50 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-200/40 active:scale-[0.97]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 12v4"/><path d="M10 14h4"/></svg>
                    PDF
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:border-slate-300 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20"
                aria-label="Cerrar"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-auto p-5" style={{ maxHeight: "calc(80vh - 60px)" }}>
            {detailLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-sat-cyan border-t-transparent" />
                  <span className="text-xs font-medium text-slate-500">Cargando detalle...</span>
                </div>
              </div>
            )}

            {detailError && !detailLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="mb-3 rounded-full bg-red-100 p-3">
                  <AlertCircle size={24} className="text-red-400" />
                </div>
                <p className="text-sm font-medium text-red-600">{detailError}</p>
              </div>
            )}

            {!detailLoading && !detailError && detailData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="mb-3 rounded-full bg-slate-100 p-3">
                  <SearchX size={24} className="text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">Sin datos de detalle</p>
              </div>
            )}

            {!detailLoading && !detailError && detailData.length > 0 && (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {keys.map((key) => (
                          <th
                            key={key}
                            className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedDetail.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                          {keys.map((key) => (
                            <td key={key} className="px-3 py-1.5 text-slate-700 whitespace-nowrap">
                              {row[key] ?? <span className="text-slate-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {detailTotalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Mostrando <span className="font-semibold text-slate-500">{detailFrom}</span>
                      {" – "}
                      <span className="font-semibold text-slate-500">{detailTo}</span> de{" "}
                      <span className="font-semibold text-slate-500">{detailData.length}</span> registros
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={detailPage <= 1}
                        onClick={() => setDetailPage(detailPage - 1)}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        aria-label="Anterior"
                      >
                        <ChevronLeft size={11} />
                        Anterior
                      </button>

                      {detailPages.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setDetailPage(p)}
                          className={`min-w-[24px] rounded px-1.5 py-1 text-[10px] font-medium transition ${
                            p === detailPage
                              ? "bg-sat-cyan text-white shadow-sm"
                              : "border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                          }`}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={detailPage >= detailTotalPages}
                        onClick={() => setDetailPage(detailPage + 1)}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        aria-label="Siguiente"
                      >
                        Siguiente
                        <ChevronRight size={11} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Main render ─────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 0.5px, transparent 0.5px)", backgroundSize: "16px 16px" }}
        />
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <LayoutGrid size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Predios por Uso
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Consulta de predios agrupados por tipo de uso
            </p>
          </div>
        </div>
      </div>

      {renderSearchForm()}

      {/* Results info */}
      {!loading && !error && !initialLoading && data.length > 0 && (
        renderResultsBar()
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
      {!loading && !error && data.length === 0 && !initialLoading && (
        renderEmptyState()
      )}

      {/* Populated grid */}
      {!loading && !error && data.length > 0 && (
        <>
          {renderGrid()}
          {renderPagination()}
        </>
      )}

      {renderDetailModal()}
    </div>
  );
}
