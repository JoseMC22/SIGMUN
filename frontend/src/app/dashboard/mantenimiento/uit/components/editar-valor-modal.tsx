"use client";

import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";

interface UitRow {
  anno: number;
  tipo: string;
  valor_uit: number;
  imp_minimo: number | null;
  imp_maximo: number | null;
  costo_emis: number;
  costo_adic: number;
  estado: string;
}

interface Props {
  isOpen: boolean;
  row: UitRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

function formatInput(n: number | null): string {
  if (n === null || n === undefined) return "";
  return n.toString();
}

export default function EditarValorModal({ isOpen, row, onClose, onSuccess }: Props) {
  const [valorUit, setValorUit] = useState(formatInput(row?.valor_uit));
  const [impMinimo, setImpMinimo] = useState(formatInput(row?.imp_minimo));
  const [impMaximo, setImpMaximo] = useState(formatInput(row?.imp_maximo));
  const [costoEmis, setCostoEmis] = useState(formatInput(row?.costo_emis));
  const [costoAdic, setCostoAdic] = useState(formatInput(row?.costo_adic));
  const [estado, setEstado] = useState(row?.estado === "1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (row) {
      setValorUit(formatInput(row.valor_uit));
      setImpMinimo(formatInput(row.imp_minimo));
      setImpMaximo(formatInput(row.imp_maximo));
      setCostoEmis(formatInput(row.costo_emis));
      setCostoAdic(formatInput(row.costo_adic));
      setEstado(row.estado === "1");
      setError(null);
    }
  }, [row]);

  if (!isOpen || !row) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const valorNum = Number(valorUit);
    const impMinNum = impMinimo !== "" ? Number(impMinimo) : null;
    const impMaxNum = impMaximo !== "" ? Number(impMaximo) : null;
    const costoEmisNum = Number(costoEmis);
    const costoAdicNum = Number(costoAdic);

    if (valorUit === "" || costoEmis === "" || costoAdic === "") {
      setError("Valor UIT, Costo Emisión y Costo Adicional son obligatorios");
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
      const res = await fetch("/api/mantenimiento/uit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anno: row.anno,
          valor_uit: valorNum,
          imp_minimo: impMinNum,
          imp_maximo: impMaxNum,
          costo_emis: costoEmisNum,
          costo_adic: costoAdicNum,
          estado: estado ? "1" : "0",
        }),
      });

      if (res.status === 404) {
        setError(`No se encontró el año ${row.anno}`);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setError(String(errData?.message ?? "Error al actualizar el registro"));
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
          <h2 className="text-sm font-semibold text-slate-800">Editar valor UIT — {row.anno}</h2>
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

          {/* Row 1: Año (readonly) + Tipo (readonly) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Año
              </label>
              <input
                type="text"
                value={row.anno}
                readOnly
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Tipo
              </label>
              <input
                type="text"
                value={row.tipo}
                readOnly
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Row 2: Valor UIT */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Valor UIT *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valorUit}
              onChange={(e) => setValorUit(e.target.value)}
              placeholder="Ej: 5700.00"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Row 3: Imp. Mínimo + Imp. Máximo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Imp. Mínimo
              </label>
              <input
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
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Imp. Máximo
              </label>
              <input
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
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Costo Emisión *
              </label>
              <input
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
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Costo Adicional *
              </label>
              <input
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
              id="editar-estado"
              type="checkbox"
              checked={estado}
              onChange={(e) => setEstado(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sat-cyan focus:ring-sat-cyan/20"
            />
            <label htmlFor="editar-estado" className="text-[11px] font-medium text-slate-600">
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
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
