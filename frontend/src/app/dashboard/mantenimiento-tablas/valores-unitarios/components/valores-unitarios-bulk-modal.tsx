"use client";

import { useEffect, useState } from "react";
import { X, Plus, Loader2, AlertCircle } from "lucide-react";
import {
  SaveValoresUnitariosBulkPayload,
  VALORES_UNITARIOS_CODES,
} from "../types";

interface Props {
  isOpen: boolean;
  defaultAnno: string;
  endpoint: string;
  onClose: () => void;
  onSuccess: (anno: string) => void;
}

interface AddedItem {
  codi: string;
  valor: number;
}

const VALOR_MAX = 99999.99;

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";
const labelClass =
  "mb-0.5 block text-[9px] font-semibold uppercase leading-none tracking-wider text-slate-400";

type ErrorBody = {
  message?: string;
  details?: { errors?: Array<{ message?: string }> };
};

function validateEntry(
  region: string,
  anno: string,
  codi: string,
  valor: string,
): string | null {
  if (!/^\d$/.test(region.trim())) {
    return "La región debe tener 1 dígito";
  }
  if (!/^\d{4}$/.test(anno.trim())) {
    return "El año debe tener 4 dígitos";
  }
  if (!/^[A-J][1-7]$/.test(codi.trim())) {
    return "La categoría debe estar entre A1 y J7";
  }
  const parsed = valor.trim() === "" ? Number.NaN : Number(valor);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > VALOR_MAX) {
    return "El valor debe estar entre 0 y 99999.99";
  }
  return null;
}

export default function ValoresUnitariosBulkModal({
  isOpen,
  defaultAnno,
  endpoint,
  onClose,
  onSuccess,
}: Props) {
  const [region, setRegion] = useState("1");
  const [anno, setAnno] = useState(defaultAnno);
  const [codi, setCodi] = useState("");
  const [valor, setValor] = useState("");
  const [items, setItems] = useState<AddedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRegion("1");
      setAnno(defaultAnno);
      setCodi("");
      setValor("");
      setItems([]);
      setError(null);
    }
  }, [isOpen, defaultAnno]);

  if (!isOpen) return null;

  const titleId = "valores-unitarios-bulk-title";

  const handleAdd = () => {
    setError(null);

    const validationMessage = validateEntry(region, anno, codi, valor);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const normalizedCodi = codi.trim();
    if (items.some((item) => item.codi === normalizedCodi)) {
      setError("La categoría ya fue agregada");
      return;
    }

    const parsed = Number(valor);
    setItems((current) => [...current, { codi: normalizedCodi, valor: parsed }]);
    setCodi("");
    setValor("");
  };

  const handleRemove = (removedCodi: string) => {
    setItems((current) => current.filter((item) => item.codi !== removedCodi));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!/^\d$/.test(region.trim())) {
      setError("La región debe tener 1 dígito");
      return;
    }
    if (!/^\d{4}$/.test(anno.trim())) {
      setError("El año debe tener 4 dígitos");
      return;
    }

    const entered = new Map(items.map((item) => [item.codi, item.valor]));
    const payload: SaveValoresUnitariosBulkPayload = {
      region: region.trim(),
      anno: anno.trim(),
      items: VALORES_UNITARIOS_CODES.map((code) => ({
        codi: code,
        valor: entered.get(code) ?? 0,
      })),
    };

    setSaving(true);
    try {
      const res = await fetch(`${endpoint}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ErrorBody | null;
        if (res.status === 400) {
          setError(
            body?.details?.errors?.[0]?.message ??
              body?.message ??
              "Datos inválidos. Revise los campos.",
          );
        } else if (res.status === 503) {
          setError(body?.message ?? "Base de datos no disponible");
        } else {
          setError(body?.message ?? "Error al guardar los valores");
        }
        return;
      }

      onSuccess(anno.trim());
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h2
              id={titleId}
              className="font-outfit text-sm font-semibold tracking-tight text-slate-800"
            >
              Registro de valores unitarios
            </h2>
            <p className="mt-0.5 font-inter text-[10px] text-slate-400">
              Región {region.trim() || "—"} · Año {anno.trim() || "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <AlertCircle size={14} className="shrink-0 text-red-400" />
              <span className="text-[11px] text-red-600">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vu-bulk-region" className={labelClass}>
                Región
              </label>
              <input
                id="vu-bulk-region"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                className={inputClass}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="vu-bulk-anno" className={labelClass}>
                Año
              </label>
              <input
                id="vu-bulk-anno"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={anno}
                onChange={(event) =>
                  setAnno(event.target.value.replace(/\D/g, ""))
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <div>
              <label htmlFor="vu-bulk-codi" className={labelClass}>
                Categoría
              </label>
              <input
                id="vu-bulk-codi"
                type="text"
                maxLength={2}
                value={codi}
                onChange={(event) => setCodi(event.target.value.toUpperCase())}
                className={inputClass}
                placeholder="A1"
              />
            </div>
            <div>
              <label htmlFor="vu-bulk-valor" className={labelClass}>
                Valor
              </label>
              <input
                id="vu-bulk-valor"
                type="number"
                step="0.01"
                min="0"
                max={VALOR_MAX}
                value={valor}
                onChange={(event) => setValor(event.target.value)}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-1 rounded-md border border-sat-cyan/40 px-3 py-1.5 text-xs font-medium text-sat-cyan transition hover:bg-sat-cyan/10 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 active:scale-[0.98]"
            >
              <Plus size={13} />
              Agregar
            </button>
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className={labelClass}>Categorías agregadas</span>
              <span className="text-[10px] text-slate-400">
                Las demás se registran con valor 0.
              </span>
            </div>
            <div
              data-testid="valores-unitarios-added-list"
              className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/60 p-2"
            >
              {items.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {items.map((item) => (
                    <li
                      key={item.codi}
                      className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1"
                    >
                      <span className="font-mono text-[11px] font-semibold text-slate-600">
                        {item.codi}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-700 tabular-nums">
                          {item.valor}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.codi)}
                          aria-label={`Quitar ${item.codi}`}
                          className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
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
              {saving ? "Grabando..." : "Grabar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
