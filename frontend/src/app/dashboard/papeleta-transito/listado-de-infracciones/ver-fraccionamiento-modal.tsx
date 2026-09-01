"use client";

import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, Printer, Search, FileText } from "lucide-react";
import { verFraccionamientoAction, resolucionFraccionamientoAction } from "@/actions/papeleta-transito/acciones-infraccion";

interface FraccionamientoItem {
  convenio: string;
  anio: string;
  cuotas: number;
  monto: number;
  estado: string;
  usuario: string;
  fecha: string;
}

interface FraccionamientoRealizadoItem {
  anio: string;
  convenio: string;
  estado: string;
  fecha: string;
  deudaInicial: number;
  cuotas: number;
  cuotasCanceladas: number;
  cuotasVencidas: number;
  usuario: string;
}

interface DetalleConvenioData {
  fechaConvenio: string;
  montoTotalFracc: number;
  cuotaInicial: number;
  porcentajeInicial: number;
  saldo: number;
  numCuotas: number;
  estadoConvenio: string;
  estadoConvenioCode?: string;
  nroRecibo?: string;
  cuotas: Array<{
    periodo: string;
    impInsol: number;
    reaj: number;
    fechaVencimiento: string;
    nroRecibo: string;
    total: number;
  }>;
}

interface Props {
  isOpen: boolean;
  codigo: string | null;
  propietarioNombre?: string;
  onClose: () => void;
}

export default function VerFraccionamientoModal({ isOpen, codigo, propietarioNombre, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<FraccionamientoItem[]>([]);
  const [nombreContribuyente, setNombreContribuyente] = useState("");

  // Sub-modal de Detalle de Fraccionamiento (Resolución)
  const [showDetalleConvenioModal, setShowDetalleConvenioModal] = useState(false);
  const [detalleConvenioLoading, setDetalleConvenioLoading] = useState(false);
  const [selectedConvenioCode, setSelectedConvenioCode] = useState<string | null>(null);
  const [detalleConvenioData, setDetalleConvenioData] = useState<DetalleConvenioData | null>(null);

  // Sub-modal de Reporte de Fraccionamiento
  const [showSubReporte, setShowSubReporte] = useState(false);
  const [fechaDesde, setFechaDesde] = useState(new Date().toISOString().split("T")[0]);
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split("T")[0]);
  const [usuarioSelected, setUsuarioSelected] = useState("TODOS");
  const [reporteLoading, setReporteLoading] = useState(false);
  const [reporteItems, setReporteItems] = useState<FraccionamientoRealizadoItem[]>([]);

  useEffect(() => {
    if (isOpen && codigo) {
      setLoading(true);
      setError(null);
      setItems([]);
      setNombreContribuyente(propietarioNombre ?? "");

      verFraccionamientoAction(codigo).then((res) => {
        if (res.success && res.data) {
          if (res.data.nombre) setNombreContribuyente(res.data.nombre);
          if (Array.isArray(res.data.rows)) {
            setItems(res.data.rows);
          } else {
            setItems([]);
          }
        } else {
          setError(res.error ?? "No se encontró historial de fraccionamientos.");
        }
      }).catch(() => setError("Error de conexión"))
        .finally(() => setLoading(false));
    }
  }, [isOpen, codigo, propietarioNombre]);

  const handleVerDetalleConvenio = async (convenioCode: string) => {
    if (!codigo) return;
    setSelectedConvenioCode(convenioCode);
    setShowDetalleConvenioModal(true);
    setDetalleConvenioLoading(true);
    try {
      const res = await resolucionFraccionamientoAction(codigo, convenioCode);
      if (res.success && res.data) {
        setDetalleConvenioData(res.data);
      } else {
        alert(res.error ?? "No se pudo cargar el detalle del convenio.");
      }
    } catch {
      alert("Error de conexión.");
    } finally {
      setDetalleConvenioLoading(false);
    }
  };

  const handleBuscarReporteTesoreria = async () => {
    setReporteLoading(true);
    try {
      // Simulación de búsqueda para el reporte de tesorería
      setReporteItems([]);
    } finally {
      setReporteLoading(false);
    }
  };

  const handleImprimirSubReporte = () => {
    const reportBaseUrl = process.env.NEXT_PUBLIC_REPORT_URL ?? "";
    if (!reportBaseUrl) {
      alert("URL del servidor de reportes no configurada.");
      return;
    }
    const params = `tipo=pdf&nombrereporte=rpt_fraccionamiento_tesoreria&param=PCODIGO^${codigo}|PFDESDE^${fechaDesde}|PFHASTA^${fechaHasta}|PUSUARIO^${usuarioSelected}`;
    window.open(`${reportBaseUrl}?${params}`, "_blank", "width=750,height=600,scrollbars=yes");
  };

  if (!isOpen) return null;

  const totalReporteDeuda = reporteItems.reduce((acc, curr) => acc + (curr.deudaInicial || 0), 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      tabIndex={-1}
    >
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-slate-200 animate-fade-in overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header Principal */}
        <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-3 shrink-0">
          <span className="text-xs font-bold text-white tracking-wide">Fraccionar Deuda</span>
          <button type="button" onClick={onClose} className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white transition">
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 bg-slate-50/50">

          {/* Ficha Informativa: Código y Contribuyente */}
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 w-24 shrink-0">Código:</span>
              <span className="font-mono font-bold text-sat-navy text-sm">{codigo ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 w-24 shrink-0">Contribuyente:</span>
              <span className="font-semibold text-slate-800 uppercase">{nombreContribuyente || "—"}</span>
            </div>
          </div>

          {/* Sección Fraccionamientos (DGV) */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="bg-slate-100/80 px-3 py-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700">Fraccionamientos</span>
            </div>

            <div className="overflow-x-auto min-h-[160px] max-h-[260px]">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="px-3 py-2">Convenio</th>
                    <th className="px-3 py-2">Año</th>
                    <th className="px-3 py-2 text-center">Cuotas</th>
                    <th className="px-3 py-2 text-right">Monto</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                    <th className="px-3 py-2">Usuario</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        <Loader2 size={18} className="animate-spin inline mr-2 text-sat-cyan" />
                        Cargando fraccionamientos…
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        No hay fraccionamientos registrados para este contribuyente.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="px-3 py-2 font-mono font-semibold text-slate-700">{item.convenio}</td>
                        <td className="px-3 py-2 text-slate-600">{item.anio}</td>
                        <td className="px-3 py-2 text-center text-slate-700 font-medium">{item.cuotas}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-800">S/ {item.monto.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-300/40">
                            {item.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{item.usuario}</td>
                        <td className="px-3 py-2 text-slate-500">{item.fecha}</td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              title="Imprimir Convenio"
                              onClick={() => {
                                const reportBaseUrl = process.env.NEXT_PUBLIC_REPORT_URL ?? "";
                                if (!reportBaseUrl) {
                                  alert("URL del servidor de reportes no configurada.");
                                  return;
                                }
                                const url = `${reportBaseUrl}?tipo=pdf&nombrereporte=rpt_ImprimeConvenio&param=PCODIGO^${codigo}|PCONVENIO^${item.convenio}`;
                                window.open(url, "_blank", "width=750,height=600,scrollbars=yes");
                              }}
                              className="rounded p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition"
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              type="button"
                              title="Ver Detalle de Fraccionamiento"
                              onClick={() => handleVerDetalleConvenio(item.convenio)}
                              className="rounded p-1 text-sat-navy hover:bg-slate-200 hover:text-slate-900 transition"
                            >
                              <FileText size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botonera de Acción Principal del Modal */}
          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none"
            >
              Salir
            </button>
            <button type="button" onClick={() => setShowSubReporte(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-navy px-4 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 focus:outline-none shadow-xs"
            >
              <FileText size={13} />
              Reporte
            </button>
          </div>
        </div>

        {/* ── Sub-Modal: Detalle de Fraccionamiento (Resolución) ── */}
        {showDetalleConvenioModal && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[92vh]">

              {/* Header Sub-modal */}
              <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5 shrink-0">
                <span className="text-xs font-bold text-white tracking-wide">
                  Detalle de Fraccionamiento - Convenio {selectedConvenioCode}
                </span>
                <button type="button" onClick={() => setShowDetalleConvenioModal(false)} className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white">
                  <X size={15} />
                </button>
              </div>

              {/* Sub-modal Content */}
              <div className="p-4 space-y-3 overflow-y-auto flex-1 bg-slate-50/50">
                {detalleConvenioLoading ? (
                  <div className="py-16 text-center text-slate-400">
                    <Loader2 size={22} className="animate-spin inline mr-2 text-sat-cyan" />
                    Cargando detalle del convenio...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">

                      {/* Ficha Resumen Izquierda */}
                      <div className="md:col-span-5 border border-slate-200 bg-white rounded-lg p-3 shadow-xs space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Fecha Conven:</span>
                          <input readOnly value={detalleConvenioData?.fechaConvenio ?? "—"}
                            className="w-28 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-center font-bold text-xs text-slate-900" />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Monto Total Frac.:</span>
                          <input readOnly value={(detalleConvenioData?.montoTotalFracc ?? 0).toFixed(2)}
                            className="w-28 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-900" />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Cuota Inicial:</span>
                          <input readOnly value={(detalleConvenioData?.cuotaInicial ?? 0).toFixed(2)}
                            className="w-28 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-900" />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Porcentaje inicial:</span>
                          <div className="flex items-center gap-1">
                            <input readOnly value={(detalleConvenioData?.porcentajeInicial ?? 30).toFixed(2)}
                              className="w-20 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-center font-bold text-xs text-slate-900" />
                            <span className="font-semibold text-slate-700">%</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Saldo:</span>
                          <input readOnly value={(detalleConvenioData?.saldo ?? 0).toFixed(2)}
                            className="w-28 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-900" />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Numero de Cuotas:</span>
                          <input readOnly value={detalleConvenioData?.numCuotas ?? 0}
                            className="w-16 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-center font-bold text-xs text-slate-900" />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Estado:</span>
                          <span className="font-bold text-sat-navy">{detalleConvenioData?.estadoConvenio ?? "En Solicitud"}</span>
                        </div>
                      </div>

                      {/* Tabla Cronograma Derecha */}
                      <div className="md:col-span-7 border border-slate-200 bg-white rounded-lg p-3 shadow-xs min-h-[220px]">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <th className="px-2 py-1.5 text-center">Cuota</th>
                                <th className="px-2 py-1.5 text-right">Amortización</th>
                                <th className="px-2 py-1.5 text-right">Reajuste</th>
                                <th className="px-2 py-1.5 text-center">Fec. Venc.</th>
                                <th className="px-2 py-1.5 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {detalleConvenioData?.cuotas.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                                    No hay cuotas registradas.
                                  </td>
                                </tr>
                              ) : (
                                detalleConvenioData?.cuotas.map((c, i) => (
                                  <tr key={i} className="hover:bg-slate-50">
                                    <td className="px-2 py-1 text-center font-bold text-sat-navy">{c.periodo}</td>
                                    <td className="px-2 py-1 text-right font-mono">S/ {c.impInsol.toFixed(2)}</td>
                                    <td className="px-2 py-1 text-right font-mono text-slate-500">S/ {c.reaj.toFixed(2)}</td>
                                    <td className="px-2 py-1 text-center font-mono">{c.fechaVencimiento}</td>
                                    <td className="px-2 py-1 text-right font-mono font-semibold text-slate-800">S/ {c.total.toFixed(2)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Botonera Inferior */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200">
                      <button type="button"
                        onClick={() => alert(`Generando resolución para ${selectedConvenioCode}`)}
                        disabled={
                          (detalleConvenioData?.estadoConvenioCode === '1' && !detalleConvenioData?.nroRecibo?.trim()) ||
                          detalleConvenioData?.estadoConvenioCode === '2' ||
                          detalleConvenioData?.estadoConvenioCode === '3'
                        }
                        className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Generar Resolucion
                      </button>

                      <button type="button"
                        onClick={() => {
                          const reportBaseUrl = process.env.NEXT_PUBLIC_REPORT_URL ?? "";
                          if (!reportBaseUrl) {
                            alert("URL del servidor de reportes no configurada.");
                            return;
                          }
                          const url = `${reportBaseUrl}?tipo=pdf&nombrereporte=rpt_conv_resolucion&param=codigo^${codigo}|convenio^${selectedConvenioCode}`;
                          window.open(url, "_blank", "width=750,height=600,scrollbars=yes");
                        }}
                        disabled={
                          (detalleConvenioData?.estadoConvenioCode === '1' && !detalleConvenioData?.nroRecibo?.trim()) ||
                          detalleConvenioData?.estadoConvenioCode === '3'
                        }
                        className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Imprimir Resolucion
                      </button>

                      <button type="button"
                        onClick={() => alert(`Anular Convenio ${selectedConvenioCode}`)}
                        disabled={detalleConvenioData?.estadoConvenioCode === '3'}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anular Convenio
                      </button>

                      <button type="button"
                        onClick={() => alert(`Anular Convenio S/C ${selectedConvenioCode}`)}
                        disabled={detalleConvenioData?.estadoConvenioCode === '3'}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anular Convenio S/C
                      </button>

                      <button type="button" onClick={() => setShowDetalleConvenioModal(false)}
                        className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition ml-auto"
                      >
                        Salir
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Sub-Interfaz Modal: Reporte de Fraccionamiento ── */}
        {showSubReporte && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[92vh]">

              {/* Sub Header */}
              <div className="flex items-center justify-between bg-sat-navy px-4 py-2.5 shrink-0">
                <span className="text-xs font-bold text-white tracking-wide">Reporte de Fraccionamiento</span>
                <button type="button" onClick={() => setShowSubReporte(false)} className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white">
                  <X size={14} />
                </button>
              </div>

              <div className="p-4 space-y-3 overflow-y-auto flex-1 bg-slate-50/50">

                {/* Grupo Reporte Tesorería */}
                <fieldset className="rounded-lg border border-slate-300 bg-white p-3 shadow-xs">
                  <legend className="px-1 text-[11px] font-bold text-blue-600">Reporte Tesoreria:</legend>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-600">Desde:</span>
                      <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-600">Hasta:</span>
                      <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-600">Usuarios:</span>
                      <select value={usuarioSelected} onChange={(e) => setUsuarioSelected(e.target.value)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 font-medium"
                      >
                        <option value="TODOS">TODOS</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="OPERADOR">OPERADOR</option>
                      </select>
                    </div>

                    <button type="button" onClick={handleBuscarReporteTesoreria}
                      className="inline-flex items-center gap-1.5 rounded bg-sat-cyan px-3 py-1 text-xs font-semibold text-white transition hover:bg-cyan-600 ml-auto"
                    >
                      {reporteLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                      Buscar
                    </button>
                  </div>
                </fieldset>

                {/* Grilla Fraccionamientos Realizados */}
                <div className="rounded-lg border border-slate-300 bg-white shadow-xs overflow-hidden">
                  <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700">Fraccionamiento Realizados</span>
                  </div>

                  <div className="overflow-x-auto min-h-[140px] max-h-[220px]">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <th className="px-2 py-1.5">Año</th>
                          <th className="px-2 py-1.5">Convenio</th>
                          <th className="px-2 py-1.5">Estado</th>
                          <th className="px-2 py-1.5">Fecha</th>
                          <th className="px-2 py-1.5 text-right">Deuda Ini.</th>
                          <th className="px-2 py-1.5 text-center">Cuotas</th>
                          <th className="px-2 py-1.5 text-center">Cuot. Canceladas</th>
                          <th className="px-2 py-1.5 text-center">Cuot. Vencidas</th>
                          <th className="px-2 py-1.5">Usuario</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reporteItems.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-6 text-center text-slate-400">
                              Sin registros en este rango de fechas.
                            </td>
                          </tr>
                        ) : (
                          reporteItems.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-2 py-1.5 font-medium">{r.anio}</td>
                              <td className="px-2 py-1.5 font-mono">{r.convenio}</td>
                              <td className="px-2 py-1.5">{r.estado}</td>
                              <td className="px-2 py-1.5">{r.fecha}</td>
                              <td className="px-2 py-1.5 text-right font-semibold">S/ {r.deudaInicial.toFixed(2)}</td>
                              <td className="px-2 py-1.5 text-center">{r.cuotas}</td>
                              <td className="px-2 py-1.5 text-center">{r.cuotasCanceladas}</td>
                              <td className="px-2 py-1.5 text-center text-red-600 font-semibold">{r.cuotasVencidas}</td>
                              <td className="px-2 py-1.5">{r.usuario}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totalizador */}
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-xs font-bold text-slate-700">Total:</span>
                  <input readOnly value={totalReporteDeuda.toFixed(2)}
                    className="w-32 rounded border border-slate-300 bg-blue-50/50 px-2 py-1 text-right font-mono font-bold text-xs text-sat-navy" />
                </div>

                {/* Botón Imprimir Reporte */}
                <div className="pt-2">
                  <button type="button" onClick={handleImprimirSubReporte}
                    className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 shadow-2xs"
                  >
                    <Printer size={13} />
                    Imprimir Reporte
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
