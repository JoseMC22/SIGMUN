"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Save } from "lucide-react";
import { buscarCambioEstadoAction, listarEstadosAction, grabarCambioEstadoAction } from "@/actions/papeleta-transito/acciones-infraccion";

interface Props {
  isOpen: boolean;
  ninfrac: string | null;
  editable?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface EstadoOption {
  id: string;
  nombre: string;
}

export default function CambioEstadoModal({ isOpen, ninfrac, editable = true, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estados, setEstados] = useState<EstadoOption[]>([]);
  const [form, setForm] = useState({
    seriePapel: "",
    taloPapel: "",
    numeroPapel: "",
    oficio: "",
    fechaPapeleta: "",
    codigoInfraccion: "",
    resolucion: "",
    fechaNotificacion: "",
    observaciones: "",
    estadoActual: "",
    usuario: "",
    estacion: "",
    fechaModificacion: "",
    nuevoEstado: "",
  });

  useEffect(() => {
    if (!isOpen || !ninfrac) return;
    setLoading(true);
    setError(null);

    Promise.all([
      buscarCambioEstadoAction(ninfrac),
      listarEstadosAction(),
    ])
      .then(([estadoResult, estadosResult]) => {
        if (estadoResult.success && estadoResult.data) {
          const d = estadoResult.data as Record<string, string>;
          setForm({
            seriePapel: d.seriePapel ?? "",
            taloPapel: d.taloPapel ?? "",
            numeroPapel: d.numeroPapel ?? "",
            oficio: d.oficio ?? "",
            fechaPapeleta: d.fechaPapeleta ?? "",
            codigoInfraccion: d.codigoInfraccion ?? "",
            resolucion: d.resolucion ?? "",
            fechaNotificacion: d.fechaNotificacion ?? "",
            observaciones: d.observaciones ?? "",
            estadoActual: d.estadoActual ?? "",
            usuario: d.usuario ?? "",
            estacion: d.estacion ?? "",
            fechaModificacion: d.fechaModificacion ?? "",
            nuevoEstado: d.idEstado || d.estadoActual || "",
          });
        } else {
          setError(estadoResult.error ?? estadoResult.message ?? "Error al cargar datos.");
        }
        if (estadosResult.success && estadosResult.data) {
          setEstados(estadosResult.data as EstadoOption[]);
        }
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [isOpen, ninfrac]);

  if (!isOpen) return null;

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!ninfrac) return;
    if (!form.nuevoEstado) {
      setError("Seleccione un estado.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await grabarCambioEstadoAction({
        ninfrac,
        tipoestado: form.nuevoEstado,
        numero: form.resolucion,
        fecha: form.fechaNotificacion,
        obs: form.observaciones,
      });
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error ?? result.message);
      }
    } catch {
      setError("Error de conexión al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-xs p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !loading && !saving) onClose(); }}
    >
      <div className="w-full max-w-[560px] rounded-xl bg-white shadow-2xl border border-slate-300 animate-fade-in overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5 shrink-0">
          <span className="text-xs font-bold text-white tracking-wide">
            {editable ? "Cambio de Estados" : "Consulta de Estados"}
          </span>
          {!loading && !saving && (
            <button type="button" onClick={onClose} className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-3 bg-slate-50/50 overflow-y-auto max-h-[85vh]">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={22} className="animate-spin text-sat-cyan" />
              <span className="ml-2 text-xs font-medium text-slate-600">Cargando datos...</span>
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{error}</div>
          )}

          {!loading && (
            <>
              {/* Grupo Superior: Serie, Talonario, N° Papeleta y Oficio */}
              <fieldset className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs space-y-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Serie, Talonario, N° Papeleta y Oficio
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap font-mono font-bold">
                    <input type="text" value={form.seriePapel} readOnly className="flex-1 min-w-[50px] rounded border border-slate-300 bg-slate-100 px-2 py-1 text-center text-xs text-slate-900" />
                    <span className="text-slate-400">-</span>
                    <input type="text" value={form.taloPapel || "01"} readOnly className="w-12 rounded border border-slate-300 bg-slate-100 px-1.5 py-1 text-center text-xs text-slate-900" />
                    <span className="text-slate-400">-</span>
                    <input type="text" value={form.numeroPapel} readOnly className="flex-1 min-w-[70px] rounded border border-slate-300 bg-slate-100 px-2 py-1 text-center text-xs text-slate-900" />
                    <span className="text-slate-400">-</span>
                    <input type="text" value={form.oficio || "01"} readOnly className="w-12 rounded border border-slate-300 bg-slate-100 px-2 py-1 text-center text-xs text-slate-900" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Fecha Aplicacion:</label>
                    <input type="text" value={form.fechaPapeleta} readOnly className="w-full rounded border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs text-slate-900 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Infraccion:</label>
                    <input type="text" value={form.codigoInfraccion} readOnly className="w-full rounded border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs text-slate-900 font-bold" />
                  </div>
                </div>
              </fieldset>

              {/* Grupo Inferior: Formulario Cambio de Estado */}
              <fieldset className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs space-y-2.5 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-24 font-semibold text-slate-700 shrink-0">Estados:</span>
                  <select
                    value={form.nuevoEstado}
                    onChange={(e) => update("nuevoEstado", e.target.value)}
                    disabled={!editable}
                    className="flex-1 min-w-0 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 font-bold focus:border-sat-cyan focus:outline-none"
                  >
                    <option value="">[SELECCIONE]</option>
                    {estados.map((e) => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-24 font-semibold text-slate-700 shrink-0">N° Resolución:</span>
                  <input
                    type="text"
                    value={form.resolucion}
                    onChange={(e) => update("resolucion", e.target.value)}
                    readOnly={!editable}
                    className="flex-1 min-w-0 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 font-semibold focus:border-sat-cyan focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-24 font-semibold text-slate-700 shrink-0">Fecha:</span>
                  <input
                    type="date"
                    value={form.fechaNotificacion}
                    onChange={(e) => update("fechaNotificacion", e.target.value)}
                    readOnly={!editable}
                    className="w-44 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 font-semibold focus:border-sat-cyan focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <span className="block font-semibold text-slate-700">Observación:</span>
                  <textarea
                    rows={3}
                    value={form.observaciones}
                    onChange={(e) => update("observaciones", e.target.value)}
                    readOnly={!editable}
                    className="w-full rounded border border-slate-300 bg-white p-2 text-xs font-normal text-slate-900 resize-none focus:border-sat-cyan focus:outline-none"
                  />
                </div>

                {/* Ficha de Auditoría (Usuario, Estación, Fecha) */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <input readOnly value={form.usuario} className="w-full rounded border border-slate-300 bg-slate-100 px-1 py-1 text-center font-bold text-[11px] text-slate-800 truncate" />
                  <input readOnly value={form.estacion} className="w-full rounded border border-slate-300 bg-slate-100 px-1 py-1 text-center font-bold text-[11px] text-slate-800 truncate" />
                  <input readOnly value={form.fechaModificacion} className="w-full rounded border border-slate-300 bg-slate-100 px-1 py-1 text-center font-bold text-[11px] text-slate-800 truncate" />
                </div>

                {/* Adjuntar PDF */}
                <div className="flex items-center gap-2 pt-1 overflow-hidden">
                  <span className="text-[11px] font-semibold text-slate-700 shrink-0">Adjuntar PDF:</span>
                  <input type="file" accept=".pdf" className="text-xs text-slate-600 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-50 cursor-pointer min-w-0 flex-1" />
                </div>
              </fieldset>

              {/* Botonera de Acción */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                {editable && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={loading || saving}
                    className="rounded border border-slate-300 bg-white px-4 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition shadow-2xs disabled:opacity-50 flex items-center gap-1"
                  >
                    {saving ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
                    Grabar
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading || saving}
                  className="rounded border border-slate-300 bg-white px-4 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition shadow-2xs"
                >
                  Salir
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
