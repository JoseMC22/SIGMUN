"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { cargarDetalleInfraccionAction } from "@/actions/papeleta-transito/acciones-infraccion";

interface Props {
  isOpen: boolean;
  ninfrac: string | null;
  editable?: boolean;
  onClose: () => void;
  onSave?: (data: Record<string, unknown>) => void;
}

export default function DetalleInfraccionModal({ isOpen, ninfrac, editable = false, onClose, onSave }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!isOpen || !ninfrac) return;
    setLoading(true);
    setError(null);
    cargarDetalleInfraccionAction(ninfrac)
      .then((result) => {
        if (result.success && result.data) {
          setData(result.data as Record<string, unknown>);
        } else {
          setError(result.error ?? result.message ?? "Error al cargar detalle.");
        }
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [isOpen, ninfrac]);

  if (!isOpen) return null;

  const update = (field: string, value: string) => setData((prev) => ({ ...prev, [field]: value }));

  const field = (label: string, key: string, opts?: { type?: string; readOnly?: boolean; span?: number }) => {
    const span = opts?.span ?? 1;
    const val = String(data[key] ?? "");
    return (
      <div key={key} className={span > 1 ? `col-span-${span}` : ""}>
        <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</label>
        {opts?.type === "textarea" ? (
          <textarea
            value={val}
            onChange={(e) => update(key, e.target.value)}
            readOnly={opts?.readOnly ?? !editable}
            rows={2}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none resize-none read-only:cursor-default read-only:opacity-70"
          />
        ) : (
          <input
            type={opts?.type ?? "text"}
            value={val}
            onChange={(e) => update(key, e.target.value)}
            readOnly={opts?.readOnly ?? !editable}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none read-only:cursor-default read-only:opacity-70"
          />
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-slate-200 animate-fade-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-3 shrink-0">
          <span className="text-sm font-semibold text-white tracking-tight">
            {editable ? "Modificar Infracción" : "Visualizar Infracción"}
          </span>
          {!loading && (
            <button type="button" onClick={onClose} className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-sat-cyan" />
              <span className="ml-2 text-xs text-slate-500">Cargando detalle...</span>
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{error}</div>
          )}

          {!loading && !error && (
            <>
              {/* Datos del Vehículo */}
              <fieldset>
                <legend className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Datos del Vehículo</legend>
                <div className="grid grid-cols-4 gap-3">
                  {field("Placa", "numeroPlaca", { span: 1 })}
                  {field("ID Placa", "idPlaca", { readOnly: true })}
                  {field("Marca", "marcaVehiculo", { readOnly: true })}
                  {field("Color", "colorVehiculo", { readOnly: true })}
                  {field("Tipo Vehículo", "tipoVehiculo", { readOnly: true })}
                  {field("Año", "anioVehiculo", { readOnly: true })}
                  {field("CIP Auto", "cipAuto", { readOnly: true })}
                  {field("Placa Secundaria", "placaSecundaria", { readOnly: true })}
                </div>
              </fieldset>

              {/* Datos de la Infracción */}
              <fieldset>
                <legend className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Datos de la Infracción</legend>
                <div className="grid grid-cols-4 gap-3">
                  {field("Serie Papel", "seriePapel", { readOnly: true })}
                  {field("N° Papel", "numeroPapel", { readOnly: true })}
                  {field("Talo Papel", "taloPapel", { readOnly: true })}
                  {field("Oficio", "oficio", { readOnly: true })}
                  {field("Cód. Infracción", "codigoInfraccion", { readOnly: true })}
                  {field("Monto", "importe", { type: "number", readOnly: true })}
                  {field("Fecha Aplicación", "fechaAplicacion", { readOnly: true })}
                  {field("Hora", "hora", { readOnly: true })}
                  {field("Minuto", "minuto", { readOnly: true })}
                  {field("Fecha Vencimiento", "fechaVencimiento", { readOnly: true })}
                  {field("Detalle Infracción", "detalleInfraccion", { span: 2 })}
                  {field("Dosaje", "dosaje")}
                  {field("Grado", "grado")}
                </div>
              </fieldset>

              {/* Propietario */}
              <fieldset>
                <legend className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Propietario</legend>
                <div className="grid grid-cols-4 gap-3">
                  {field("Cód. Propietario", "codigoPropietario", { readOnly: true })}
                  {field("Nombre", "nombrePropietario", { span: 2 })}
                  {field("Tipo", "tipoPropiedad", { readOnly: true })}
                  {field("RUC", "rucPropietario", { readOnly: true })}
                  {field("Dirección", "direccionPropietario", { span: 3 })}
                </div>
              </fieldset>

              {/* Conductor */}
              <fieldset>
                <legend className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Conductor</legend>
                <div className="grid grid-cols-4 gap-3">
                  {field("Cód. Conductor", "codigoConductor", { readOnly: true })}
                  {field("Nombre", "nombreConductor", { span: 2 })}
                  {field("Licencia", "licenciaConductor", { readOnly: true })}
                  {field("RUC", "rucConductor", { readOnly: true })}
                  {field("Dirección", "direccionConductor", { span: 3 })}
                </div>
              </fieldset>

              {/* Lugar */}
              <fieldset>
                <legend className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Lugar de Infracción</legend>
                <div className="grid grid-cols-4 gap-3">
                  {field("ID Lugar", "idLugar", { readOnly: true })}
                  {field("Lugar", "lugar", { span: 2 })}
                  {field("Referencia", "referencia")}
                </div>
              </fieldset>

              {/* Detalle */}
              {field("Detalle", "detalle", { type: "textarea", span: 4 })}

              {/* Info adicional */}
              <fieldset>
                <legend className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Información de Registro</legend>
                <div className="grid grid-cols-4 gap-3">
                  {field("Usuario", "usuario", { readOnly: true })}
                  {field("Estación", "estacion", { readOnly: true })}
                  {field("Fecha Ingreso", "fechaIngreso", { readOnly: true })}
                  {field("Responsable", "responsable", { readOnly: true })}
                </div>
              </fieldset>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 shrink-0">
          <button type="button" onClick={onClose} disabled={loading}
            className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
            {editable ? "Cancelar" : "Cerrar"}
          </button>
          {editable && onSave && (
            <button type="button" onClick={() => onSave(data)} disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? <Loader2 size={13} className="animate-spin" /> : null}
              Guardar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
