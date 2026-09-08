"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Save } from "lucide-react";
import { buscarResolucionSancionAction, grabarResolucionSancionAction } from "@/actions/papeleta-transito/acciones-infraccion";

interface Props {
  isOpen: boolean;
  ninfrac: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResolucionSancionModal({ isOpen, ninfrac, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  });

  useEffect(() => {
    if (!isOpen || !ninfrac) return;
    setLoading(true);
    setError(null);
    buscarResolucionSancionAction(ninfrac)
      .then((result) => {
        if (result.success && result.data) {
          const d = result.data as Record<string, string>;
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
          });
        } else {
          setError(result.error ?? result.message ?? "Error al cargar datos.");
        }
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [isOpen, ninfrac]);

  if (!isOpen) return null;

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!ninfrac) return;
    setSaving(true);
    setError(null);
    try {
      const result = await grabarResolucionSancionAction({
        ninfrac,
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
          <span className="text-sm font-semibold text-white tracking-tight">Generar Resolución de Sanción</span>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Serie Papel</label>
                  <input type="text" value={form.seriePapel} readOnly
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700 read-only:opacity-70" />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">N° Papel</label>
                  <input type="text" value={form.numeroPapel} readOnly
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700 read-only:opacity-70" />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Cód. Infracción</label>
                  <input type="text" value={form.codigoInfraccion} readOnly
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700 read-only:opacity-70" />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Fecha Papeleta</label>
                  <input type="text" value={form.fechaPapeleta} readOnly
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700 read-only:opacity-70" />
                </div>
              </div>

              <hr className="border-slate-100" />

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">N° Resolución</label>
                  <input type="text" value={form.resolucion} onChange={(e) => update("resolucion", e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Fecha Notificación</label>
                  <input type="text" value={form.fechaNotificacion} onChange={(e) => update("fechaNotificacion", e.target.value)}
                    placeholder="dd/mm/yyyy"
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Observaciones</label>
                  <input type="text" value={form.observaciones} onChange={(e) => update("observaciones", e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 shrink-0">
          <button type="button" onClick={onClose} disabled={loading || saving}
            className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={loading || saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Grabar
          </button>
        </div>
      </div>
    </div>
  );
}
