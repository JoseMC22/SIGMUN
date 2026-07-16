"use client";

import { useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NuevoValorModal({ isOpen, onClose, onSuccess }: Props) {
  const [anno, setAnno] = useState("");
  const [valorUit, setValorUit] = useState("");
  const [impMinimo, setImpMinimo] = useState("");
  const [impMaximo, setImpMaximo] = useState("");
  const [costoEmis, setCostoEmis] = useState("");
  const [costoAdic, setCostoAdic] = useState("");
  const [estado, setEstado] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const annoNum = Number(anno);
    const valorNum = Number(valorUit);
    const impMinNum = impMinimo !== "" ? Number(impMinimo) : null;
    const impMaxNum = impMaximo !== "" ? Number(impMaximo) : null;
    const costoEmisNum = costoEmis !== "" ? Number(costoEmis) : 0;
    const costoAdicNum = costoAdic !== "" ? Number(costoAdic) : 0;

    if (!anno || !valorUit) {
      setError("Todos los campos son obligatorios");
      return;
    }

    if (annoNum < 1992) {
      setError("El año debe ser mayor o igual a 1992");
      return;
    }

    if (valorNum <= 0) {
      setError("El valor UIT debe ser mayor a 0");
      return;
    }

    if (costoEmisNum < 0 || costoAdicNum < 0) {
      setError("Los costos no pueden ser negativos");
      return;
    }

    if (impMinNum !== null && impMaxNum !== null && impMinNum > impMaxNum) {
      setError("El importe mínimo no puede ser mayor al máximo");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/mantenimiento-tablas/mantenimiento-uit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anno: annoNum,
          valor_uit: valorNum,
          imp_minimo: impMinNum,
          imp_maximo: impMaxNum,
          costo_emis: costoEmisNum,
          costo_adic: costoAdicNum,
          estado: estado ? "1" : "0",
        }),
      });

      if (res.status === 409) {
        setError(`El año ${annoNum} ya existe`);
        return;
      }

      if (!res.ok) {
        setError("Error al guardar el registro");
        return;
      }

      onSuccess();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Nuevo valor UIT</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span className="text-xs text-red-600">{error}</span>
            </div>
          )}

          {/* Row 1: Año */}
          <div>
            <label htmlFor="nuevo-anno" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Año
            </label>
            <input
              id="nuevo-anno"
              type="number"
              min={1992}
              value={anno}
              onChange={(e) => setAnno(e.target.value)}
              placeholder="Ej: 2027"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Row 2: Valor UIT */}
          <div>
            <label htmlFor="nuevo-valor" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Valor UIT
            </label>
            <input
              id="nuevo-valor"
              type="number"
              step="0.01"
              min="0"
              value={valorUit}
              onChange={(e) => setValorUit(e.target.value)}
              placeholder="Ej: 5700.00"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Row 3: Imp. Mínimo + Imp. Máximo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="nuevo-imp-minimo" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Imp. Mínimo
              </label>
              <input
                id="nuevo-imp-minimo"
                type="number"
                step="0.01"
                min="0"
                value={impMinimo}
                onChange={(e) => setImpMinimo(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="nuevo-imp-maximo" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Imp. Máximo
              </label>
              <input
                id="nuevo-imp-maximo"
                type="number"
                step="0.01"
                min="0"
                value={impMaximo}
                onChange={(e) => setImpMaximo(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 4: Costo Emisión + Costo Adicional */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="nuevo-costo-emis" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Costo Emisión *
              </label>
              <input
                id="nuevo-costo-emis"
                type="number"
                step="0.01"
                min="0"
                value={costoEmis}
                onChange={(e) => setCostoEmis(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="nuevo-costo-adic" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Costo Adicional *
              </label>
              <input
                id="nuevo-costo-adic"
                type="number"
                step="0.01"
                min="0"
                value={costoAdic}
                onChange={(e) => setCostoAdic(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 5: Estado */}
          <div className="flex items-center gap-2">
            <input
              id="nuevo-estado"
              type="checkbox"
              checked={estado}
              onChange={(e) => setEstado(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sat-cyan focus:ring-sat-cyan/20"
            />
            <label htmlFor="nuevo-estado" className="text-[11px] font-medium text-slate-600">
              Activado
            </label>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-50"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
