"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  FileSpreadsheet,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Receipt,
  SearchX,
  AlertCircle,
  Building2,
} from "lucide-react";
import {
  getAniosReporteDeudaUsoAction,
  getUsosReporteDeudaUsoAction,
  searchReporteDeudaUsoAction,
  exportReporteDeudaUsoAction,
  type ReporteDeudaUsoRow,
  type AnnoOption,
  type UsoOption,
} from "@/actions/administracion-tributaria/reporte-deuda-uso";
import { exportReporteDeudaUsoExcel } from "./export-excel";

export default function ReporteDeudaUsoPage() {
  // Filtros
  const [anios, setAnios] = useState<AnnoOption[]>([]);
  const [usos, setUsos] = useState<UsoOption[]>([]);
  const [anno, setAnno] = useState<string>("");
  const [idUso, setIdUso] = useState<string>("");
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

  // Ref para disparar auto-búsqueda solo una vez al cargar los combos
  const autoSearchFired = useRef(false);

  // Cargar combos iniciales
  useEffect(() => {
    Promise.all([
      getAniosReporteDeudaUsoAction(),
      getUsosReporteDeudaUsoAction(),
    ]).then(([aniosRes, usosRes]) => {
      let resolvedAnno = "";
      let resolvedUso = "";

      if (aniosRes.success && aniosRes.data.length > 0) {
        setAnios(aniosRes.data);
        resolvedAnno = aniosRes.data[0].anno;
        setAnno(resolvedAnno);
      }
      if (usosRes.success && usosRes.data.length > 0) {
        setUsos(usosRes.data);
        resolvedUso = usosRes.data[0].id_uso;
        setIdUso(resolvedUso);
      }

      // Auto-búsqueda con los valores recién cargados, sin depender del estado
      if (resolvedAnno && !autoSearchFired.current) {
        autoSearchFired.current = true;
        void (async () => {
          setLoading(true);
          setError(null);
          try {
            const res = await searchReporteDeudaUsoAction({
              anno: resolvedAnno,
              id_uso: resolvedUso,
              page: 1,
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
        })();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Búsqueda manual (botón o paginación)
  const handleSearch = async (pageToLoad: number = 1) => {
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
  };

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

  return (
    <div className="space-y-4">
      {/* Header Banner */}
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
              Reporte De Deuda X Uso
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Administración Tributaria — Consulta y exportación de deuda según uso de predios
            </p>
          </div>
        </div>
      </div>

      {/* Formulario de Filtros */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
          <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Filtros de búsqueda
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Año */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Año
            </label>
            <select
              value={anno}
              onChange={(e) => setAnno(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              {anios.map((a) => (
                <option key={a.anno} value={a.anno}>
                  {a.anno}
                </option>
              ))}
            </select>
          </div>

          {/* Uso */}
          <div className="md:col-span-5">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Uso
            </label>
            <select
              value={idUso}
              onChange={(e) => setIdUso(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none truncate"
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
          <div className="md:col-span-2">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Tipo
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              <option value="1">Todos</option>
              <option value="2">Inafectos</option>
              <option value="3">Afectos</option>
            </select>
          </div>

          {/* Botones */}
          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSearch(1)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-navy hover:bg-sat-navy/90 text-white px-4 py-1.5 text-xs font-medium shadow-sm transition disabled:opacity-50 active:scale-[0.98]"
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
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-medium shadow-sm transition disabled:opacity-50 active:scale-[0.98]"
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
          <div className="mt-3 flex items-center gap-2 rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      {/* Resultados y Tabla */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
          <span className="text-xs text-slate-500 font-medium">
            Se encontraron <strong className="text-slate-800">{total.toLocaleString()}</strong> predios con deuda
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050] text-white/90">
              <tr>
                <th className="px-3 py-2.5 text-center w-12 font-semibold">#</th>
                <th className="px-3 py-2.5 text-center w-24 font-semibold">Código</th>
                <th className="px-3 py-2.5 text-left font-semibold">Contribuyente</th>
                <th className="px-3 py-2.5 text-center w-16 font-semibold">Año</th>
                <th className="px-3 py-2.5 text-center w-24 font-semibold">Cód. Pred.</th>
                <th className="px-3 py-2.5 text-center w-28 font-semibold">Anexo/Sub</th>
                <th className="px-3 py-2.5 text-left w-36 font-semibold">Uso</th>
                <th className="px-3 py-2.5 text-left w-64 font-semibold">Dirección</th>
                <th className="px-3 py-2.5 text-right w-24 font-semibold">Área Terr.</th>
                <th className="px-3 py-2.5 text-right w-24 font-semibold">Área Const.</th>
                <th className="px-3 py-2.5 text-center w-16 font-semibold">Sector</th>
                <th className="px-3 py-2.5 text-right w-28 font-semibold">Deuda IP</th>
                <th className="px-3 py-2.5 text-right w-28 font-semibold">Deuda Arb.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-slate-400">
                    <Loader2 size={20} className="animate-spin inline mr-2 text-sat-cyan" />
                    Consultando deudas por uso...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-slate-400 italic">
                    <SearchX size={28} className="inline mr-2 text-slate-300" />
                    No se encontraron registros para los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                data.map((r, idx) => (
                  <tr
                    key={`${r.codigo}-${r.cod_pred}-${r.anexo}-${idx}`}
                    className={`transition hover:bg-sky-50/50 ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`}
                  >
                    <td className="px-3 py-2 text-center text-slate-500 font-mono text-[11px]">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-medium text-slate-700">
                      {r.codigo}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800 uppercase truncate max-w-[220px]" title={r.nombre}>
                      {r.nombre}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-slate-600">
                      {r.anno}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-slate-600">
                      {r.cod_pred}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-slate-600">
                      {r.anexo} - {r.sub_anexo}
                    </td>
                    <td className="px-3 py-2 text-slate-600 truncate max-w-[150px]" title={r.uso_predio}>
                      {r.uso_predio}
                    </td>
                    <td className="px-3 py-2 text-slate-600 truncate max-w-[240px]" title={r.direccion}>
                      {r.direccion}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">
                      {r.area_terreno}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">
                      {r.area_construccion}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-slate-600">
                      {r.sector}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-sat-navy">
                      {r.insoluto_ip}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-sat-navy">
                      {r.insoluto_arb}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2.5 text-xs">
            <span className="text-slate-500">
              Página <strong className="text-slate-800">{page}</strong> de{" "}
              <strong className="text-slate-800">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => handleSearch(page - 1)}
                className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft size={13} /> Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => handleSearch(page + 1)}
                className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Siguiente <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
