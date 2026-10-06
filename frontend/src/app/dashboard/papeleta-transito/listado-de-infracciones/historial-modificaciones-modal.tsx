import React, { useState, useEffect } from "react";
import { X, History, Loader2, Monitor, User, Calendar, ArrowRight, AlertCircle, Eye } from "lucide-react";
import {
  obtenerHistorialModificacionesAction,
  HistorialModificacionItem,
  cargarDetalleInfraccionAction,
} from "@/actions/papeleta-transito/acciones-infraccion";

interface Props {
  isOpen: boolean;
  ninfrac: string | null;
  numeroPapeleta?: string;
  placa?: string;
  onClose: () => void;
}

export default function HistorialModificacionesModal({
  isOpen,
  ninfrac,
  numeroPapeleta,
  placa,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<HistorialModificacionItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistorialModificacionItem | null>(null);
  const [showComparacion, setShowComparacion] = useState(false);
  const [isLatestSelected, setIsLatestSelected] = useState(false);

  useEffect(() => {
    if (!isOpen || !ninfrac) return;
    setLoading(true);
    setError(null);
    obtenerHistorialModificacionesAction(ninfrac)
      .then((res) => {
        if (res.success && res.data) setHistorial(res.data);
        else setError(res.error ?? "No se encontraron registros de modificacion.");
      })
      .catch(() => setError("Error de conexion."))
      .finally(() => setLoading(false));
  }, [isOpen, ninfrac]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-xs p-3"
        onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      >
        <div className="relative w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-3 shrink-0">
            <div className="flex items-center gap-2.5 text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sat-cyan">
                <History size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Historial de Modificaciones</h3>
                <p className="text-[11px] text-slate-300">
                  Papeleta: <span className="font-semibold text-sat-cyan">{numeroPapeleta || ninfrac}</span>
                  {placa && <span className="ml-2 font-mono text-white/90">({placa})</span>}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                <Loader2 size={32} className="animate-spin text-sat-cyan" />
                <span className="text-xs font-medium">Cargando registros de auditoria...</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 py-12 px-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-medium">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            ) : historial.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <History size={36} className="text-slate-300" />
                <p className="text-xs font-medium">No hay modificaciones registradas para esta papeleta.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase tracking-wider text-[10px] font-semibold">
                      <th className="px-3 py-2.5">Fecha y Hora</th>
                      <th className="px-3 py-2.5">Usuario</th>
                      <th className="px-3 py-2.5">Estacion</th>
                      <th className="px-3 py-2.5">Campo</th>
                      <th className="px-3 py-2.5">Antes → Nuevo</th>
                      <th className="px-3 py-2.5">Accion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historial.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        onClick={() => { setSelectedItem(item); setIsLatestSelected(idx === 0); setShowComparacion(true); }}
                        className="hover:bg-blue-50/60 cursor-pointer transition group"
                      >
                        <td className="px-3 py-2 font-mono text-[10px] text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} className="text-slate-400" />
                            {item.fechaHora || "—"}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 border border-slate-200">
                            <User size={10} className="text-sat-cyan" />
                            {item.usuario || "SISTEMA"}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 border border-slate-200 font-mono">
                            <Monitor size={10} className="text-slate-400" />
                            {item.estacion || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-800 text-[10px]">{item.campo || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700 border border-rose-200">
                              <span className="text-[9px] font-bold uppercase text-rose-400">Antes:</span>
                              <span className="line-through">{item.valorAnterior || "—"}</span>
                            </span>
                            <ArrowRight size={11} className="text-slate-400" />
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700 border border-emerald-200 font-semibold">
                              <span className="text-[9px] font-bold uppercase text-emerald-500">Nuevo:</span>
                              {item.valorNuevo || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <button type="button" className="inline-flex items-center gap-1 rounded bg-sat-navy/10 text-sat-navy px-2 py-1 text-[10px] font-bold group-hover:bg-sat-navy group-hover:text-white transition">
                            <Eye size={11} /> Comparar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 bg-slate-100 shrink-0">
            <span className="text-[10px] text-slate-500 font-medium">Clic en una fila para ver la comparativa visual.</span>
            <button type="button" onClick={onClose} className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition">
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {showComparacion && selectedItem && (
        <ComparacionDual ninfrac={ninfrac} item={selectedItem} isLatest={isLatestSelected} onClose={() => setShowComparacion(false)} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ComparacionDual — Réplica exacta del formulario de Visualizar Infracción (Papeleta)
// ─────────────────────────────────────────────────────────────────────────────
function ComparacionDual({
  ninfrac,
  item,
  isLatest,
  onClose,
}: {
  ninfrac: string | null;
  item: HistorialModificacionItem;
  isLatest: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!ninfrac) return;
    setLoading(true);
    cargarDetalleInfraccionAction(ninfrac)
      .then((res) => { if (res.success && res.data) setData(res.data as Record<string, any>); })
      .finally(() => setLoading(false));
  }, [ninfrac]);

  const isChanged = (key: string) => {
    const c = (item.campo || "").toLowerCase();
    const obs = (item.observacion || "").toLowerCase();
    const k = key.toLowerCase();
    if (k === "codigoinfraccion") return obs.includes("infracci") || c.includes("digo") || c.includes("infrac");
    if (k === "dosaje") return c.includes("dosaje") || obs.includes("dosaje:");
    if (k === "grado") return c.includes("grado") || obs.includes("grado:");
    if (k === "numeroplaca" || k === "placa") return obs.includes("placa:") || (c.includes("placa") && !c.includes("sec") && !c.includes("edici"));
    if (k === "detalle" || k === "observaciones") return obs.includes("observaciones:") || (c.includes("observ") && !c.includes("estac"));
    if (k === "importe") return c.includes("importe") || obs.includes("importe:");
    if (k === "lugar") return c.includes("lugar") || obs.includes("lugar:");
    if (k === "referencia") return c.includes("referencia") || obs.includes("referencia:");
    if (k === "nombreconductor" || k === "conductor") return c.includes("conductor") || obs.includes("conductor:");
    return c === k;
  };

  const getVal = (key: string, isBefore: boolean) => {
    if (isChanged(key)) return isBefore ? String(item.valorAnterior ?? "") : String(item.valorNuevo ?? "");
    return String(data[key] ?? "");
  };

  const inputStyle = (key: string, isBefore: boolean, baseWidth: string = "w-full") => {
    const changed = isChanged(key);
    if (!changed) {
      return `${baseWidth} h-6 rounded border border-slate-300 bg-slate-100 px-1.5 text-xs font-semibold text-slate-900 read-only:cursor-default`;
    }
    if (isBefore) {
      return `${baseWidth} h-6 rounded border-2 border-rose-400 bg-rose-50 px-1.5 text-xs font-bold text-rose-800 line-through decoration-rose-500 read-only:cursor-default`;
    }
    return `${baseWidth} h-6 rounded border-2 border-emerald-500 bg-emerald-50 px-1.5 text-xs font-bold text-emerald-800 read-only:cursor-default`;
  };

  const renderForm = (isBefore: boolean) => (
    <div className="p-3 space-y-1.5 text-[11px] text-black font-medium overflow-y-auto flex-1 bg-white">
      {/* Fila 1: Checkbox Acta de Control | Serie, Talonario, N° Papeleta y Oficio | Fecha y Hora de Infraccion */}
      <div className="flex items-center gap-2 py-0.5 flex-wrap">
        <label className="flex items-center gap-1 font-semibold text-blue-700 cursor-default shrink-0 text-[10px]">
          <input type="checkbox" disabled checked={!!data.acta} className="h-3.5 w-3.5 rounded border-slate-400 text-blue-600" />
          Acta de Control
        </label>

        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-slate-800 font-medium hidden sm:inline">Serie, Talonario, N° Papeleta:</span>
          <input readOnly value={getVal("seriePapel", isBefore)} className={inputStyle("seriePapel", isBefore, "w-10 text-center uppercase")} />
          <span>-</span>
          <input readOnly value={getVal("taloPapel", isBefore)} className={inputStyle("taloPapel", isBefore, "w-7 text-center")} />
          <span>-</span>
          <input readOnly value={getVal("numeroPapel", isBefore)} className={inputStyle("numeroPapel", isBefore, "w-16 text-center")} />
          <span>-</span>
          <input readOnly value={getVal("oficio", isBefore)} className={inputStyle("oficio", isBefore, "w-16")} />
        </div>

        <div className="flex items-center gap-1 ml-auto text-[10px]">
          <span className="text-slate-800 font-medium">F. Infracción:</span>
          <input readOnly value={getVal("fechaAplicacion", isBefore)} className={inputStyle("fechaAplicacion", isBefore, "w-24")} />
          <input readOnly value={getVal("hora", isBefore)} className={inputStyle("hora", isBefore, "w-6 text-center")} />
          <span>:</span>
          <input readOnly value={getVal("minuto", isBefore)} className={inputStyle("minuto", isBefore, "w-6 text-center")} />
        </div>
      </div>

      {/* Fila 2: Codigo Infracc. | Importe en S/. */}
      <div className="flex items-center gap-3 py-0.5">
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">Código Infracc.</span>
          <input readOnly value={getVal("codigoInfraccion", isBefore)} className={inputStyle("codigoInfraccion", isBefore, "w-16 text-center uppercase font-bold")} />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">Importe S/.</span>
          <input readOnly value={getVal("importe", isBefore)} className={inputStyle("importe", isBefore, "w-24 text-right font-bold")} />
        </div>
      </div>

      {/* Fila 3: Detalle Infracción Textarea */}
      <div className="py-0.5">
        <textarea readOnly value={String(data.detalleInfraccion ?? "")} rows={2}
          className="w-full rounded-md border border-slate-300 bg-slate-50 p-1.5 text-[11px] font-normal text-slate-800 resize-none read-only:cursor-default" />
      </div>

      {/* Fila 4: Dosaje Etilico N° | Grado de Alcohol | Retención de brevete */}
      <div className="flex items-center gap-4 py-0.5">
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">Dosaje Etilico N°:</span>
          <input readOnly value={getVal("dosaje", isBefore)} className={inputStyle("dosaje", isBefore, "w-24")} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">Grado Alcohol:</span>
          <input readOnly value={getVal("grado", isBefore)} className={inputStyle("grado", isBefore, "w-24")} />
        </div>
        <label className="flex items-center gap-1 font-medium text-slate-800 text-[10px]">
          <input type="checkbox" disabled checked={!!data.retener} className="h-3.5 w-3.5 rounded border-slate-400" />
          Retención de brevete
        </label>
      </div>

      {/* Fila 5: Lugar/Av./Jr./Cdra */}
      <div className="flex items-center gap-1 py-0.5">
        <span className="text-slate-800 font-medium text-[10px] shrink-0">Lugar/Av./Jr./Cdra:</span>
        <input readOnly value={getVal("lugar", isBefore)} className={inputStyle("lugar", isBefore, "flex-1")} />
      </div>

      {/* Fila 6: Referencia */}
      <div className="flex items-center gap-1 py-0.5">
        <span className="text-slate-800 font-medium text-[10px] shrink-0">Referencia:</span>
        <input readOnly value={getVal("referencia", isBefore)} className={inputStyle("referencia", isBefore, "flex-1")} />
      </div>

      {/* Fila 7: Codigo Conductor | DNI/RUC | Lic. de Conducir */}
      <div className="flex items-center gap-2 py-0.5 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">Codigo Conductor:</span>
          <input readOnly value={getVal("codigoConductor", isBefore)} className={inputStyle("codigoConductor", isBefore, "w-20")} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">DNI/RUC:</span>
          <input readOnly value={getVal("rucConductor", isBefore)} className={inputStyle("rucConductor", isBefore, "w-24")} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">Lic. Conducir:</span>
          <input readOnly value={getVal("licenciaConductor", isBefore)} className={inputStyle("licenciaConductor", isBefore, "w-28")} />
        </div>
      </div>

      {/* Fila 8: Datos del Conductor */}
      <div className="flex items-center gap-1 py-0.5">
        <span className="text-slate-800 font-medium text-[10px] shrink-0">Datos del Conductor:</span>
        <input readOnly value={getVal("nombreConductor", isBefore)} className={inputStyle("nombreConductor", isBefore, "flex-1")} />
      </div>

      {/* Fila 9: Dirección Conductor */}
      <div className="flex items-center gap-1 py-0.5">
        <span className="text-slate-800 font-medium text-[10px] shrink-0">Dirección:</span>
        <input readOnly value={getVal("direccionConductor", isBefore)} className={inputStyle("direccionConductor", isBefore, "flex-1")} />
      </div>

      {/* Fila 10: Placa | Placa Secundaria */}
      <div className="flex items-center gap-3 py-0.5">
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">Placa:</span>
          <input readOnly value={getVal("numeroPlaca", isBefore)} className={inputStyle("numeroPlaca", isBefore, "w-20 font-bold")} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">Placa Secundaria:</span>
          <input readOnly value={getVal("placaSecundaria", isBefore)} className={inputStyle("placaSecundaria", isBefore, "w-20")} />
        </div>
      </div>

      {/* Fila 11: Marca | Tipo de Veh. | Color | Año */}
      <div className="flex items-center gap-2 py-0.5 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">Marca:</span>
          <input readOnly value={getVal("marcaVehiculo", isBefore)} className={inputStyle("marcaVehiculo", isBefore, "w-24")} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">Tipo Veh.:</span>
          <input readOnly value={getVal("tipoVehiculo", isBefore)} className={inputStyle("tipoVehiculo", isBefore, "w-24")} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">Color:</span>
          <input readOnly value={getVal("colorVehiculo", isBefore)} className={inputStyle("colorVehiculo", isBefore, "w-20")} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">Año:</span>
          <input readOnly value={getVal("anioVehiculo", isBefore)} className={inputStyle("anioVehiculo", isBefore, "w-14")} />
        </div>
      </div>

      {/* Fila 12: Observaciones | CIP Policia */}
      <div className="flex items-center gap-3 py-0.5">
        <div className="flex items-center gap-1 flex-1">
          <span className="text-slate-800 font-medium text-[10px] shrink-0">Observaciones:</span>
          <input readOnly value={getVal("detalle", isBefore)} className={inputStyle("detalle", isBefore, "w-full")} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px] shrink-0">CIP Policia:</span>
          <input readOnly value={getVal("cipAuto", isBefore)} className={inputStyle("cipAuto", isBefore, "w-24")} />
        </div>
      </div>

      {/* Fila 13: Cod. Propietario | No presento Tarjeta de Propiedad */}
      <div className="flex items-center gap-3 py-0.5">
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">Cod. Propietario:</span>
          <input readOnly value={getVal("codigoPropietario", isBefore)} className={inputStyle("codigoPropietario", isBefore, "w-24")} />
        </div>
        <label className="flex items-center gap-1 font-medium text-slate-800 text-[10px]">
          <input type="checkbox" disabled checked={!!data.presento} className="h-3.5 w-3.5 rounded border-slate-400" />
          No presento Tarjeta de Propiedad
        </label>
      </div>

      {/* Fila 14: Propietario */}
      <div className="flex items-center gap-1 py-0.5">
        <span className="text-slate-800 font-medium text-[10px] shrink-0">Propietario:</span>
        <input readOnly value={getVal("nombrePropietario", isBefore)} className={inputStyle("nombrePropietario", isBefore, "flex-1")} />
      </div>

      {/* Fila 15: DNI/RUC | T. Propiedad/TIV */}
      <div className="flex items-center gap-3 py-0.5">
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">DNI/RUC:</span>
          <input readOnly value={getVal("rucPropietario", isBefore)} className={inputStyle("rucPropietario", isBefore, "w-24")} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-medium text-[10px]">T. Propiedad/TIV:</span>
          <input readOnly value={getVal("tipoPropiedad", isBefore)} className={inputStyle("tipoPropiedad", isBefore, "w-36")} />
        </div>
      </div>

      {/* Fila 16: Dirección Propietario */}
      <div className="flex items-center gap-1 py-0.5">
        <span className="text-slate-800 font-medium text-[10px] shrink-0">Dirección:</span>
        <input readOnly value={getVal("direccionPropietario", isBefore)} className={inputStyle("direccionPropietario", isBefore, "flex-1")} />
      </div>

      {/* Fila 17: Estado Anterior */}
      <div className="flex items-center gap-1 py-0.5">
        <span className="text-slate-800 font-medium text-[10px] shrink-0">Estado Anterior:</span>
        <input readOnly value={getVal("estadoAnterior", isBefore)} className={inputStyle("estadoAnterior", isBefore, "w-36")} />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-2">
      <div className="relative w-full max-w-[98vw] rounded-2xl bg-white shadow-2xl border border-slate-300 overflow-hidden flex flex-col" style={{ maxHeight: "96vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-3 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sat-cyan">
              <Eye size={17} />
            </div>
            <div>
              <h2 className="text-[13px] font-bold tracking-tight">Comparativa de Auditoría</h2>
              <p className="text-[10px] text-slate-300 flex items-center gap-2 flex-wrap">
                <span>Papeleta: <span className="font-mono font-bold text-sat-cyan">{ninfrac}</span></span>
                <span className="opacity-40">|</span>
                <span className="font-semibold">{item.usuario}</span>
                <span className="opacity-40">·</span>
                <span>{item.fechaHora}</span>
                {item.campo && (
                  <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono">{item.campo}</span>
                )}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition">
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex gap-3 p-3 bg-slate-100 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center w-full gap-3 text-slate-500">
              <Loader2 size={28} className="animate-spin text-sat-cyan" />
              <span className="text-xs">Cargando datos...</span>
            </div>
          ) : (
            <>
              {/* Panel NUEVO/ACTUAL — izquierda */}
              <div className="flex-1 rounded-xl border-2 border-emerald-500 bg-white shadow-sm overflow-hidden flex flex-col min-h-0 min-w-0">
                <div className="bg-emerald-600 px-3 py-1.5 text-white flex items-center justify-between shrink-0">
                  <span className="text-[11px] font-bold uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
                    {isLatest ? "ESTADO ACTUAL" : "ESTADO MODIFICADO"}
                  </span>
                  <span className="bg-emerald-800/60 text-[10px] px-2 py-0.5 rounded-md font-mono font-bold tracking-wider">
                    {isLatest ? "ACTUAL" : "NUEVO"}
                  </span>
                </div>
                {renderForm(false)}
              </div>

              {/* Panel ANTES — derecha */}
              <div className="flex-1 rounded-xl border-2 border-rose-400 bg-white shadow-sm overflow-hidden flex flex-col min-h-0 min-w-0">
                <div className="bg-rose-600 px-3 py-1.5 text-white flex items-center justify-between shrink-0">
                  <span className="text-[11px] font-bold uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white/80 animate-ping" />
                    ESTADO ANTERIOR
                  </span>
                  <span className="bg-rose-800/60 text-[10px] px-2 py-0.5 rounded-md font-mono font-bold tracking-wider">ANTES</span>
                </div>
                {renderForm(true)}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-2.5 bg-slate-50 shrink-0">
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
              <span className="w-3 h-3 rounded bg-rose-50 border-2 border-rose-400 inline-block" /> Valor anterior (tachado)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <span className="w-3 h-3 rounded bg-emerald-50 border-2 border-emerald-500 inline-block" /> Valor nuevo
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 inline-block" /> Sin cambio
            </span>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs">
            Cerrar Comparativa
          </button>
        </div>

      </div>
    </div>
  );
}

