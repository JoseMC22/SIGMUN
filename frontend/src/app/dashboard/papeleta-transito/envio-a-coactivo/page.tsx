"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, RotateCcw, Send, Loader2, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { consultarInfractorCoacAction, FiltrosEnvioCoactivo } from "@/actions/papeleta-transito/envio-coactivo";
import EnvioCoactivoModal from "./envio-coactivo-modal";

interface RowCoactivo {
  idtraplac: string;
  infraccion: string;
  placa: string;
  propietario: string;
  conductor: string;
  tipovehi: string;
  estado: string;
  ninfrac: string;
  codigo: string;
  est_impresion: string;
  est_impresion1: string;
  codinfra: string;
  fecha: string;
  monto: number | string;
  idrecibo: string;
}

export default function EnvioACoactivoPage() {
  const currentYear = new Date().getFullYear().toString();

  const [filtros, setFiltros] = useState<FiltrosEnvioCoactivo>({
    placa: "",
    propie: "",
    infrac: "",
    infracanio: currentYear,
    conductor: "",
    dniconduc: "",
    page: 1,
    limit: 15,
  });

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RowCoactivo[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedNinfrac, setSelectedNinfrac] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchDatos = useCallback(async (params: FiltrosEnvioCoactivo) => {
    setLoading(true);
    setError(null);
    try {
      console.log("🚀 [Client UI] Llamando a consultarInfractorCoacAction con params:", params);
      const res = await consultarInfractorCoacAction(params);
      console.log("📌 [Client UI] Resultado recibido de action:", res);
      if (res.success && res.data) {
        setRows(res.data.rows || []);
        setTotal(res.data.total || 0);
      } else {
        setError(res.error || "No se pudieron obtener las infracciones.");
        setRows([]);
        setTotal(0);
      }
    } catch (err: any) {
      console.error("💥 [Client UI] Excepción atrapada:", err);
      setError("Error de conexión con el servidor.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDatos(filtros);
  }, [fetchDatos, filtros.page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFiltros((prev) => ({ ...prev, page: 1 }));
    fetchDatos({ ...filtros, page: 1 });
  };

  const handleReset = () => {
    const defaultFiltros: FiltrosEnvioCoactivo = {
      placa: "",
      propie: "",
      infrac: "",
      infracanio: currentYear,
      conductor: "",
      dniconduc: "",
      page: 1,
      limit: 15,
    };
    setFiltros(defaultFiltros);
    fetchDatos(defaultFiltros);
  };

  const openCoactivoModal = (ninfrac: string) => {
    setSelectedNinfrac(ninfrac);
    setModalOpen(true);
  };

  const totalPages = Math.ceil(total / (filtros.limit || 15)) || 1;

  const renderBadgeEstado = (estado: string) => {
    const estUpper = (estado || "").toUpperCase();
    if (estUpper.includes("CANCELADA") || estUpper.includes("ANULADA")) {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">{estado}</span>;
    }
    if (estUpper.includes("PENDIENTE")) {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">{estado}</span>;
    }
    if (estUpper.includes("COAC") || estUpper.includes("CAPTURA")) {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">{estado}</span>;
    }
    if (estUpper.includes("EMIT. R. SANCION")) {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">{estado}</span>;
    }
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{estado}</span>;
  };

  return (
    <div className="p-3 space-y-3 max-w-[1600px] mx-auto animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, rgb(255, 255, 255) 0.5px, transparent 0.5px)", backgroundSize: "16px 16px" }}></div>
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl"></div>
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <Send className="w-[18px] h-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">Envío a Coactivo</h1>
            <p className="text-xs text-white/50 font-inter">Papeleta Tránsito — Registro, filtro y remisión de papeletas a coactivo</p>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="p-2.5 bg-white rounded-lg shadow-sm border border-slate-200/80">
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-2">
              <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Placa</label>
              <input
                placeholder="Ej: ABC-123"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 font-medium placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none uppercase"
                type="text"
                value={filtros.placa}
                onChange={(e) => setFiltros({ ...filtros, placa: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Propietario</label>
              <input
                placeholder="Nombre"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 font-medium placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                type="text"
                value={filtros.propie}
                onChange={(e) => setFiltros({ ...filtros, propie: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Conductor</label>
              <input
                placeholder="Nombre"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 font-medium placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                type="text"
                value={filtros.conductor}
                onChange={(e) => setFiltros({ ...filtros, conductor: e.target.value })}
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">DNI</label>
              <input
                placeholder="DNI"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 font-medium placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                type="text"
                value={filtros.dniconduc}
                onChange={(e) => setFiltros({ ...filtros, dniconduc: e.target.value })}
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Año</label>
              <input
                placeholder="Año"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 font-medium placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                type="text"
                value={filtros.infracanio}
                onChange={(e) => setFiltros({ ...filtros, infracanio: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">N° Papeleta</label>
              <input
                placeholder="N° Papeleta"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 font-medium placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                type="text"
                value={filtros.infrac}
                onChange={(e) => setFiltros({ ...filtros, infrac: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                Buscar
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300/40 active:scale-[0.98]"
              >
                Limpiar
              </button>
              <span className="text-[9px] text-slate-400 leading-none">
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[8px] text-slate-500">↵</kbd>
              </span>
            </div>
          </div>
        </form>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 overflow-hidden space-y-0">
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/80 border-b border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
            Maestro de Placas ({total} registros encontrados)
          </span>
        </div>

        {error && (
          <div className="p-2 bg-red-50 text-red-700 text-[10px] border-b border-red-100">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-100/80 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-2 py-1 text-center w-7">N°</th>
                <th className="px-2 py-1">Infracción</th>
                <th className="px-2 py-1">Placa</th>
                <th className="px-2 py-1">Monto</th>
                <th className="px-2 py-1">Fecha Apl.</th>
                <th className="px-2 py-1">Código</th>
                <th className="px-2 py-1">Conductor</th>
                <th className="px-2 py-1">Tipo Veh.</th>
                <th className="px-2 py-1">Propietario</th>
                <th className="px-2 py-1">Estado</th>
                <th className="px-2 py-1 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-slate-400">
                    <Loader2 className="animate-spin inline-block text-indigo-600 mb-1" size={18} />
                    <p className="text-[10px] font-medium">Cargando infracciones...</p>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-slate-400">
                    No se encontraron papeletas pendientes para envío a coactivo.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.ninfrac || idx} className="hover:bg-indigo-50/40 transition-colors group">
                    <td className="px-2 py-1 text-center font-mono text-slate-400">
                      {((filtros.page || 1) - 1) * (filtros.limit || 15) + idx + 1}
                    </td>
                    <td className="px-2 py-1 font-mono font-medium text-slate-900">{row.infraccion}</td>
                    <td className="px-2 py-1 font-mono font-semibold text-slate-800">{row.placa}</td>
                    <td className="px-2 py-1 font-mono font-semibold text-slate-900">
                      S/ {Number(row.monto || 0).toFixed(2)}
                    </td>
                    <td className="px-2 py-1 text-slate-600 whitespace-nowrap">{row.fecha}</td>
                    <td className="px-2 py-1 font-mono text-slate-600">{row.codigo}</td>
                    <td className="px-2 py-1 font-medium text-slate-800 uppercase max-w-[140px] truncate" title={row.conductor}>{row.conductor}</td>
                    <td className="px-2 py-1 text-slate-600">{row.tipovehi}</td>
                    <td className="px-2 py-1 font-medium text-slate-800 uppercase max-w-[170px] truncate" title={row.propietario}>{row.propietario}</td>
                    <td className="px-2 py-1">{renderBadgeEstado(row.estado)}</td>
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => openCoactivoModal(row.ninfrac)}
                        title="Enviar a Coactivo"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-medium text-[10px] transition-colors border border-indigo-200"
                      >
                        <Send size={10} />
                        Enviar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-2.5 py-1 bg-slate-50/80 border-t border-slate-200 text-[10px] text-slate-500">
          <span>
            Mostrando {rows.length} de {total} registros
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={(filtros.page || 1) <= 1 || loading}
              onClick={() => setFiltros((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
              className="p-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="font-semibold text-slate-700">
              Página {filtros.page || 1} de {totalPages}
            </span>
            <button
              type="button"
              disabled={(filtros.page || 1) >= totalPages || loading}
              onClick={() => setFiltros((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
              className="p-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Envío a Coactivo */}
      <EnvioCoactivoModal
        isOpen={modalOpen}
        ninfrac={selectedNinfrac}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          if (selectedNinfrac) {
            setRows((prev) => prev.filter((r) => r.ninfrac !== selectedNinfrac));
            setTotal((prev) => Math.max(0, prev - 1));
          }
          fetchDatos(filtros);
        }}
      />
    </div>
  );
}
