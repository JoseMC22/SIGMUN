"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { SaveValorUnitarioPayload, ValorUnitarioRow } from "../types";

interface Props {
  isOpen: boolean;
  mode: "create" | "edit";
  row: ValorUnitarioRow | null;
  endpoint: string;
  onClose: () => void;
  onSuccess: () => void;
}

const VALOR_MAX = 99999.99;

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";
const readOnlyClass =
  "w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-500";
const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400";

/** Espejo client-side de SaveValorUnitarioSchema (Zod del backend). */
function validate(values: SaveValorUnitarioPayload): string | null {
  if (!/^\d$/.test(values.region.trim())) {
    return "La región debe tener 1 dígito";
  }
  if (!/^\d{4}$/.test(values.anno.trim())) {
    return "El año debe tener 4 dígitos";
  }
  const codi = values.codi.trim();
  if (!/^[A-J][1-7]$/.test(codi)) {
    return "La categoría debe estar entre A1 y J7";
  }
  if (
    !Number.isFinite(values.valor) ||
    values.valor < 0 ||
    values.valor > VALOR_MAX
  ) {
    return "El valor debe estar entre 0 y 99999.99";
  }
  return null;
}

export default function ValorUnitarioFormModal({
  isOpen,
  mode,
  row,
  endpoint,
  onClose,
  onSuccess,
}: Props) {
  const [region, setRegion] = useState("");
  const [anno, setAnno] = useState("");
  const [codi, setCodi] = useState("");
  const [valor, setValor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRegion(mode === "create" ? "1" : (row?.region ?? ""));
      setAnno(row?.anno ?? "");
      setCodi(row?.codi ?? "");
      setValor(row ? String(row.valor) : "");
      setError(null);
    }
  }, [isOpen, mode, row]);

  if (!isOpen) return null;

  const isEdit = mode === "edit";
  const titleId = "valor-unitario-form-title";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload: SaveValorUnitarioPayload = {
      region: region.trim(),
      anno: anno.trim(),
      codi: codi.trim(),
      valor: valor.trim() === "" ? Number.NaN : Number(valor),
    };

    const validationMessage = validate(payload);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: payload.region,
          anno: payload.anno,
          codi: payload.codi,
          valor: payload.valor,
        }),
      });

      if (res.status === 409) {
        setError("La fila ya existe");
        return;
      }
      if (res.status === 404) {
        setError("No se encontró la fila");
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        setError(body?.message ?? "Error al guardar el registro");
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
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 id={titleId} className="text-sm font-semibold text-slate-800">
            {isEdit ? "Editar valor unitario" : "Nuevo valor unitario"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <AlertCircle size={14} className="shrink-0 text-red-400" />
              <span className="text-[11px] text-red-600">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vu-region" className={labelClass}>
                Región
              </label>
              <input
                id="vu-region"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={region}
                readOnly={isEdit}
                onChange={(event) => setRegion(event.target.value)}
                className={isEdit ? readOnlyClass : inputClass}
                autoFocus={!isEdit}
              />
            </div>
            <div>
              <label htmlFor="vu-anno" className={labelClass}>
                Año
              </label>
              <input
                id="vu-anno"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={anno}
                readOnly={isEdit}
                onChange={(event) => setAnno(event.target.value.replace(/\D/g, ""))}
                className={isEdit ? readOnlyClass : inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vu-codi" className={labelClass}>
                Categoría
              </label>
              <input
                id="vu-codi"
                type="text"
                maxLength={2}
                value={codi}
                readOnly={isEdit}
                onChange={(event) => setCodi(event.target.value.toUpperCase())}
                className={isEdit ? readOnlyClass : inputClass}
              />
            </div>
            <div>
              <label htmlFor="vu-valor" className={labelClass}>
                Valor
              </label>
              <input
                id="vu-valor"
                type="number"
                step="0.01"
                min="0"
                max={VALOR_MAX}
                value={valor}
                onChange={(event) => setValor(event.target.value)}
                className={inputClass}
                placeholder="0.00"
                autoFocus={isEdit}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:opacity-50"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              {saving
                ? "Guardando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
