"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import {
  SaveValoresUnitariosBulkPayload,
  VALORES_UNITARIOS_CODES,
} from "../types";

interface Props {
  isOpen: boolean;
  defaultAnno: string;
  endpoint: string;
  onClose: () => void;
  onSuccess: () => void;
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

/** Una fila por letra: A1..A7, B1..B7, ..., J1..J7. */
const CODE_ROWS: string[][] = Array.from({ length: 10 }, (_, letterIndex) =>
  VALORES_UNITARIOS_CODES.slice(letterIndex * 7, letterIndex * 7 + 7),
);

/** Espejo client-side de SaveValoresUnitariosBulkSchema (Zod del backend). */
function validate(
  region: string,
  anno: string,
  values: Record<string, string>,
): string | null {
  if (!/^\d$/.test(region.trim())) {
    return "La región debe tener 1 dígito";
  }
  if (!/^\d{4}$/.test(anno.trim())) {
    return "El año debe tener 4 dígitos";
  }

  const items = buildItems(values);
  if (items.length === 0) {
    return "Ingrese al menos un valor";
  }

  for (const item of items) {
    if (
      !Number.isFinite(item.valor) ||
      item.valor < 0 ||
      item.valor > VALOR_MAX
    ) {
      return `El valor de ${item.codi} debe estar entre 0 y 99999.99`;
    }
  }
  return null;
}

/** Solo se envían las cajas completadas; el orden es el de los 70 códigos. */
function buildItems(
  values: Record<string, string>,
): Array<{ codi: string; valor: number }> {
  return VALORES_UNITARIOS_CODES.flatMap((codi) => {
    const raw = (values[codi] ?? "").trim();
    return raw === "" ? [] : [{ codi, valor: Number(raw) }];
  });
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
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRegion("1");
      setAnno(defaultAnno);
      setValues({});
      setError(null);
    }
  }, [isOpen, defaultAnno]);

  if (!isOpen) return null;

  const titleId = "valores-unitarios-bulk-title";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const validationMessage = validate(region, anno, values);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const payload: SaveValoresUnitariosBulkPayload = {
      region: region.trim(),
      anno: anno.trim(),
      items: buildItems(values),
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

      onSuccess();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-sat-navy to-sat-navy/90 px-5 py-3">
          <div>
            <h2
              id={titleId}
              className="font-outfit text-sm font-semibold tracking-tight text-white"
            >
              Carga masiva de valores unitarios
            </h2>
            <p className="mt-0.5 font-inter text-[10px] text-white/60">
              Región {region.trim() || "—"} · Año {anno.trim() || "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-sat-cyan/40"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
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
                onChange={(event) => setAnno(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className={labelClass}>Valores por código</span>
              <span className="text-[10px] text-slate-400">
                Dejá vacío el código que no quieras modificar.
              </span>
            </div>
            <div
              data-testid="valores-unitarios-bulk-grid"
              className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50/60 p-2"
            >
              {CODE_ROWS.map((codes) => (
                <div
                  key={codes[0]}
                  data-testid="valores-unitarios-bulk-row"
                  className="grid grid-cols-7 gap-1"
                >
                  {codes.map((codi) => (
                    <label
                      key={codi}
                      htmlFor={`vu-bulk-${codi}`}
                      className="flex flex-col items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1 py-1 shadow-sm transition focus-within:border-sat-cyan focus-within:ring-2 focus-within:ring-sat-cyan/20"
                    >
                      <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                        {codi}
                      </span>
                      <input
                        id={`vu-bulk-${codi}`}
                        type="number"
                        step="0.01"
                        min="0"
                        max={VALOR_MAX}
                        aria-label={`Valor ${codi}`}
                        value={values[codi] ?? ""}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [codi]: event.target.value,
                          }))
                        }
                        placeholder="—"
                        className="w-full min-w-0 border-0 bg-transparent px-0.5 py-0.5 text-center font-mono text-[11px] text-slate-700 tabular-nums outline-none placeholder:text-slate-300 focus:outline-none"
                      />
                    </label>
                  ))}
                </div>
              ))}
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
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
