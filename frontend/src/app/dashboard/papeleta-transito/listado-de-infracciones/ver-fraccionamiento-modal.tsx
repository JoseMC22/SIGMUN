"use client";

import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, Printer, Search, FileText } from "lucide-react";
import { verFraccionamientoAction } from "@/actions/papeleta-transito/acciones-infraccion";

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
            // Mock de demostración / respaldo visual si no hay filas cargadas aún
            setItems([]);
          }
        } else {
          setError(res.error ?? "No se encontró historial de fraccionamientos.");
        }
      }).catch(() => setError("Error de conexión"))
        .finally(() => setLoading(false));
    }
  }, [isOpen, codigo, propietarioNombre]);

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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        <Loader2 size={18} className="animate-spin inline mr-2 text-sat-cyan" />
                        Cargando fraccionamientos…
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
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
