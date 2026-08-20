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
            nuevoEstado: "",
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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !loading && !saving) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 animate-fade-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-3 shrink-0">
          <span className="text-sm font-semibold text-white tracking-tight">
            {editable ? "Cambio de Estado" : "Consulta de Estado"}
          </span>
          {!loading && !saving && (
            <button type="button" onClick={onClose} className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-sat-cyan" />
              <span className="ml-2 text-xs text-slate-500">Cargando...</span>
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{error}</div>
          )}

          {!loading && (
            <>
              {/* Header Box Legacy (Serie, Talonario, N° Papeleta, Oficio, Fecha, Infraccion) */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Serie, Talonario, N° Papeleta y Oficio</label>
                  <div className="flex items-center gap-1.5 font-bold font-mono">
                    <input type="text" value={form.seriePapel} readOnly className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-center text-xs text-slate-800" />
                    <span>-</span>
                    <input type="text" value={form.taloPapel || "01"} readOnly className="w-10 rounded border border-slate-300 bg-white px-1.5 py-1 text-center text-xs text-slate-800" />
                    <span>-</span>
                    <input type="text" value={form.numeroPapel} readOnly className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-center text-xs text-slate-800" />
                    <span>-</span>
                    <input type="text" value={form.oficio || "01"} readOnly className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-center text-xs text-slate-800" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Fecha Aplicacion</label>
                    <input type="text" value={form.fechaPapeleta} readOnly className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Infraccion</label>
                    <input type="text" value={form.codigoInfraccion} readOnly className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 font-bold" />
                  </div>
                </div>
              </div>

              {/* Estado actual info (when coming from read-only mode) */}
              {form.estadoActual && (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-700">
                  <span className="font-semibold">Estado Actual:</span> {form.estadoActual}
                  {form.usuario && <span className="ml-2 text-amber-500">| Por: {form.usuario}</span>}
                  {form.fechaModificacion && <span className="ml-2 text-amber-500">| {form.fechaModificacion}</span>}
                </div>
              )}

              {editable && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">Estados *</label>
                      <select value={form.nuevoEstado} onChange={(e) => update("nuevoEstado", e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none">
                        <option value="">[SELECCIONE]</option>
                        {estados.map((e) => (
                          <option key={e.id} value={e.id}>{e.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">N° Resolución</label>
                      <input type="text" value={form.resolucion} onChange={(e) => update("resolucion", e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none" />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">Fecha</label>
                      <input type="date" value={form.fechaNotificacion} onChange={(e) => update("fechaNotificacion", e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 font-medium focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Observación</label>
                    <textarea rows={3} value={form.observaciones} onChange={(e) => update("observaciones", e.target.value)}
                      placeholder="Ingrese observaciones..."
                      className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800 font-normal resize-none focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none" />
                  </div>

                  <div className="pt-1 flex flex-col gap-1 border-t border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-700">Adjuntar PDF:</label>
                    <input type="file" accept=".pdf" className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 shrink-0">
          <button type="button" onClick={onClose} disabled={loading || saving}
            className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
            {editable ? "Cancelar" : "Cerrar"}
          </button>
          {editable && (
            <button type="button" onClick={handleSave} disabled={loading || saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 disabled:opacity-60 disabled:cursor-not-allowed">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Grabar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
