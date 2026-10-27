"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Search,
  FileSpreadsheet,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Receipt,
  SearchX,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";
import {
  getAniosReporteDeudaUsoAction,
  getUsosReporteDeudaUsoAction,
  searchReporteDeudaUsoAction,
  exportReporteDeudaUsoAction,
  type ReporteDeudaUsoRow,
  type AnnoOption,
  type UsoOption,
} from "@/actions/administracion-tributaria/reporte-deuda-uso";
import { exportReporteDeudaUsoExcel } from "../reporte-deuda-uso/export-excel";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialAnno?: string;
  initialUso?: string;
}

export default function ReporteDeudaUsoModal({
  isOpen,
  onClose,
  initialAnno,
  initialUso,
}: Props) {
  const modalId = useModalStack(isOpen);
  const topModal = isTopModal(modalId);

  // Filtros
  const [anios, setAnios] = useState<AnnoOption[]>([]);
  const [usos, setUsos] = useState<UsoOption[]>([]);
  const [anno, setAnno] = useState<string>(initialAnno || "");
  const [idUso, setIdUso] = useState<string>(initialUso || "");
  const [tipo, setTipo] = useState<string>("1");

  // Grid
  const [data, setData] = useState<ReporteDeudaUsoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar combos iniciales
  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    Promise.all([
      getAniosReporteDeudaUsoAction(),
      getUsosReporteDeudaUsoAction(),
    ]).then(([aniosRes, usosRes]) => {
      if (aniosRes.success && aniosRes.data.length > 0) {
        setAnios(aniosRes.data);
        if (!initialAnno) setAnno(aniosRes.data[0].anno);
      }
      if (usosRes.success && usosRes.data.length > 0) {
        setUsos(usosRes.data);
        if (!initialUso) setIdUso(usosRes.data[0].id_uso);
      }
    });
  }, [isOpen, initialAnno, initialUso]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen || !topModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, topModal, onClose]);

  // Búsqueda
  const handleSearch = useCallback(
    async (pageToLoad: number = 1) => {
      if (!anno) {
        setError("Por favor, seleccione un año.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await searchReporteDeudaUsoAction({
          anno,
          id_uso: idUso,
          page: pageToLoad,
          pageSize,
        });
        if (res.success) {
          setData(res.data);
          setTotal(res.total);
          setPage(res.page);
          setTotalPages(res.totalPages);
        } else {
          setError(res.error);
          setData([]);
          setTotal(0);
          setTotalPages(0);
        }
      } catch {
        setError("Error de conexión al consultar el reporte.");
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [anno, idUso, pageSize]
  );

  // Auto-búsqueda al seleccionar año inicial
  useEffect(() => {
    if (isOpen && anno && idUso && data.length === 0 && !loading) {
      handleSearch(1);
    }
  }, [isOpen, anno, idUso, data.length, loading, handleSearch]);

  // Exportar a Excel
  const handleExportExcel = async () => {
    if (!anno || exporting) return;
    setExporting(true);
    setError(null);
    try {
      const res = await exportReporteDeudaUsoAction(anno, idUso);
      if (!res.success) {
        setError(res.error);
        return;
      }
      const usoNombre = usos.find((u) => u.id_uso === idUso)?.uso || "Todos";
      const tipoLabels: Record<string, string> = {
        "1": "Todos",
        "2": "Inafectos",
        "3": "Afectos",
      };
      await exportReporteDeudaUsoExcel({
        data: res.data,
        anno,
        usoNombre,
        tipoLabel: tipoLabels[tipo] || "Todos",
      });
    } catch {
      setError("Error al exportar los datos a Excel.");
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-3 animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-lg bg-white shadow-2xl border border-slate-300 overflow-hidden text-slate-800">
        {/* Cabecera */}
        <div className="bg-sat-navy px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-sat-cyan" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Reporte De Deuda X Uso
            </h2>
            <span className="text-[10px] text-white/60 font-mono">
              [Rentas.Reporte_recaudacion]
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Barra de Filtros */}
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 shrink-0">
          <div className="flex flex-wrap items-end gap-3 text-xs">
            {/* Año */}
            <div className="w-32">
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                Año:
              </label>
              <select
                value={anno}
                onChange={(e) => setAnno(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs focus:ring-1 focus:ring-sat-cyan focus:outline-none"
              >
                {anios.map((a) => (
                  <option key={a.anno} value={a.anno}>
                    {a.anno}
                  </option>
                ))}
              </select>
            </div>

            {/* Uso */}
            <div className="w-72">
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                Uso:
              </label>
              <select
                value={idUso}
                onChange={(e) => setIdUso(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs truncate focus:ring-1 focus:ring-sat-cyan focus:outline-none"
              >
                <option value="">— TODOS LOS USOS —</option>
                {usos.map((u) => (
                  <option key={u.id_uso} value={u.id_uso}>
                    {u.id_uso} - {u.uso}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo */}
            <div className="w-28">
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                Tipo:
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs focus:ring-1 focus:ring-sat-cyan focus:outline-none"
              >
                <option value="1">Todos</option>
                <option value="2">Inafectos</option>
                <option value="3">Afectos</option>
              </select>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => handleSearch(1)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded bg-sat-navy hover:bg-sat-navy/90 text-white px-3.5 py-1 text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Search size={13} />
                )}
                Buscar
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting || data.length === 0}
                className="inline-flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1 text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={13} />
                )}
                Exportar Excel
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-2 flex items-center gap-2 rounded bg-red-50 border border-red-200 px-3 py-1.5 text-xs text-red-600">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Tabla de Resultados */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <tr>
                  <th className="px-2.5 py-2 text-center w-10">#</th>
                  <th className="px-2.5 py-2 text-center w-20">Código</th>
                  <th className="px-2.5 py-2 text-left">Contribuyente</th>
                  <th className="px-2.5 py-2 text-center w-16">Año</th>
                  <th className="px-2.5 py-2 text-center w-24">Cód. Pred.</th>
                  <th className="px-2.5 py-2 text-center w-24">Anexo/Sub</th>
                  <th className="px-2.5 py-2 text-left w-36">Uso</th>
                  <th className="px-2.5 py-2 text-left w-48">Dirección</th>
                  <th className="px-2.5 py-2 text-right w-20">Área Terr.</th>
                  <th className="px-2.5 py-2 text-right w-20">Área Const.</th>
                  <th className="px-2.5 py-2 text-center w-16">Sector</th>
                  <th className="px-2.5 py-2 text-right w-24">Deuda IP</th>
                  <th className="px-2.5 py-2 text-right w-24">Deuda Arb.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400">
                      <Loader2 size={18} className="animate-spin inline mr-2 text-sat-cyan" />
                      Cargando datos del reporte...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400 italic">
                      <SearchX size={24} className="inline mr-2 text-slate-300" />
                      No se encontraron registros de deudas para los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  data.map((r, idx) => (
                    <tr
                      key={`${r.codigo}-${r.cod_pred}-${r.anexo}-${idx}`}
                      className="hover:bg-sky-50/50 transition-colors"
                    >
                      <td className="px-2.5 py-1.5 text-center text-slate-500 font-mono text-[11px]">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-2.5 py-1.5 text-center font-mono font-medium text-slate-700">
                        {r.codigo}
                      </td>
                      <td className="px-2.5 py-1.5 font-medium text-slate-800 uppercase truncate max-w-[200px]" title={r.nombre}>
                        {r.nombre}
                      </td>
                      <td className="px-2.5 py-1.5 text-center font-mono text-slate-600">
                        {r.anno}
                      </td>
                      <td className="px-2.5 py-1.5 text-center font-mono text-slate-600">
                        {r.cod_pred}
                      </td>
                      <td className="px-2.5 py-1.5 text-center font-mono text-slate-600">
                        {r.anexo} - {r.sub_anexo}
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-600 truncate max-w-[150px]" title={r.uso_predio}>
                        {r.uso_predio}
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-600 truncate max-w-[200px]" title={r.direccion}>
                        {r.direccion}
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-mono text-slate-600">
                        {r.area_terreno}
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-mono text-slate-600">
                        {r.area_construccion}
                      </td>
                      <td className="px-2.5 py-1.5 text-center font-mono text-slate-600">
                        {r.sector}
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-mono font-semibold text-sat-navy">
                        {r.insoluto_ip}
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-mono font-semibold text-sat-navy">
                        {r.insoluto_arb}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación y Pie */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2.5 text-xs shrink-0">
          <div className="text-slate-500 font-medium">
            Total registros: <span className="text-slate-800 font-bold">{total.toLocaleString()}</span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => handleSearch(page - 1)}
                className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft size={13} /> Anterior
              </button>
              <span className="text-slate-600 px-2 font-mono">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => handleSearch(page + 1)}
                className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Siguiente <ChevronRight size={13} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 bg-white hover:bg-slate-100 px-3 py-1 font-semibold text-slate-700 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
