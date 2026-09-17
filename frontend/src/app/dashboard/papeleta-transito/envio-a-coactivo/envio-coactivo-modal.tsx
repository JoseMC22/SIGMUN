"use client";

import { useState, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { buscarEnvioCoactivoAction, grabarEnvioCoactivoAction } from "@/actions/papeleta-transito/envio-coactivo";

interface Props {
  isOpen: boolean;
  ninfrac: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EnvioCoactivoModal({ isOpen, ninfrac, onClose, onSuccess }: Props) {
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState({
    seriePapel: "",
    taloPapel: "",
    numeroPapel: "",
    oficio: "",
    fechaPapeleta: "",
    codigoInfraccion: "",
    observacion: "",
  });

  useEffect(() => {
    if (isOpen && ninfrac) {
      setLoadingData(true);
      setError(null);
      buscarEnvioCoactivoAction(ninfrac)
        .then((res) => {
          if (res.success && res.data) {
            const d = res.data as any;
            setData({
              seriePapel: d.seriePapel ?? "",
              taloPapel: d.taloPapel ?? "",
              numeroPapel: d.numeroPapel ?? "",
              oficio: d.oficio ?? "",
              fechaPapeleta: d.fechaPapeleta ?? "",
              codigoInfraccion: d.codigoInfraccion ?? "",
              observacion: "",
            });
          } else {
            setError(res.error ?? "No se pudieron cargar los datos de coactivo.");
          }
        })
        .catch(() => setError("Error de conexión"))
        .finally(() => setLoadingData(false));
    }
  }, [isOpen, ninfrac]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!ninfrac) return;
    setSaving(true);
    setError(null);
    try {
      const res = await grabarEnvioCoactivoAction({
        ninfrac,
        observacion: data.observacion,
      });
      if (res.success) {
        alert("✅ Infracción enviada a COACTIVO exitosamente.");
        onSuccess();
        onClose();
      } else {
        setError(res.error ?? "Error al enviar la infracción a coactivo.");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-800 px-4 py-3">
          <span className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <Send size={16} className="text-indigo-400" />
            Envío a Coactivo
          </span>
          {!saving && (
            <button type="button" onClick={onClose} className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{error}</div>
          )}

          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-indigo-600" size={24} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Serie / Talo</label>
                  <input readOnly value={`${data.seriePapel} - ${data.taloPapel}`} className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">N° Papeleta</label>
                  <input readOnly value={data.numeroPapel} className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Cód. Infracción</label>
                  <input readOnly value={data.codigoInfraccion} className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-indigo-700" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Oficio</label>
                  <input readOnly value={data.oficio} className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Fecha Infracción</label>
                  <input readOnly value={data.fechaPapeleta} className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Observación / Motivo</label>
                <textarea
                  value={data.observacion}
                  onChange={(e) => setData((prev) => ({ ...prev, observacion: e.target.value }))}
                  rows={3}
                  placeholder="Ingrese el motivo u observación del envío a coactivo..."
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 bg-slate-50">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving || loadingData} className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Confirmar Envío
          </button>
        </div>
      </div>
    </div>
  );
}
