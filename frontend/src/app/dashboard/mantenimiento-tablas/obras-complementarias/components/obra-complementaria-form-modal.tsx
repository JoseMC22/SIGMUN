"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import {
  ObraComplementariaRow,
  SaveObraComplementariaPayload,
  toObraComplementariaKey,
} from "../types";

interface Props {
  isOpen: boolean;
  mode: "create" | "edit";
  row: ObraComplementariaRow | null;
  defaultAnno: string;
  endpoint: string;
  onClose: () => void;
  onSuccess: () => void;
}

const VALOR_MAX = 9999999999.99;
const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800 placeholder-slate-500 transition-colors focus-visible:border-sat-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-1";
const readOnlyClass =
  "w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-[13px] text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-1";
const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-600";

function validate(values: SaveObraComplementariaPayload): string | null {
  if (values.id_instala.trim().length !== 3) {
    return "El ID de instalación debe tener 3 caracteres";
  }
  if (!/^\d{4}$/.test(values.anno.trim())) {
    return "El año debe tener 4 dígitos";
  }
  if (!values.instala.trim()) return "La instalación es obligatoria";
  if (!values.uni_med.trim()) return "La unidad de medida es obligatoria";
  if (
    !Number.isFinite(values.valor) ||
    values.valor < 0 ||
    values.valor > VALOR_MAX
  ) {
    return "El valor debe estar entre 0 y 9999999999.99";
  }
  if (!values.descri_gener.trim()) {
    return "La descripción general es obligatoria";
  }
  return null;
}

export default function ObraComplementariaFormModal({
  isOpen,
  mode,
  row,
  defaultAnno,
  endpoint,
  onClose,
  onSuccess,
}: Props) {
  const [idInstala, setIdInstala] = useState("");
  const [anno, setAnno] = useState("");
  const [categ, setCateg] = useState("");
  const [instala, setInstala] = useState("");
  const [uniMed, setUniMed] = useState("");
  const [valor, setValor] = useState("");
  const [descriGener, setDescriGener] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIdInstala(row?.id_instala ?? "");
    setAnno(row?.anno ?? defaultAnno);
    setCateg(row?.categ ?? "");
    setInstala(row?.instala ?? "");
    setUniMed(row?.uni_med ?? "");
    setValor(row ? String(row.valor) : "");
    setDescriGener(row?.descri_gener ?? "");
    setError(null);
    setSaving(false);
  }, [defaultAnno, isOpen, mode, row]);

  if (!isOpen) return null;

  const isEdit = mode === "edit";
  const titleId = "obra-complementaria-form-title";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload: SaveObraComplementariaPayload = {
      id_instala: idInstala.trim(),
      anno: anno.trim(),
      categ: categ.trim() || null,
      instala: instala.trim(),
      uni_med: uniMed.trim(),
      valor: valor.trim() === "" ? Number.NaN : Number(valor),
      descri_gener: descriGener.trim(),
    };
    const validationMessage = validate(payload);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const data = {
      instala: payload.instala,
      uni_med: payload.uni_med,
      valor: payload.valor,
      descri_gener: payload.descri_gener,
    };

    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { key: toObraComplementariaKey(payload), data }
            : payload,
        ),
      });

      if (res.status === 409) {
        setError("Ya existe una obra complementaria con esa clave");
        return;
      }
      if (res.status === 404) {
        setError("No se encontró la obra complementaria");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !saving) onClose();
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 id={titleId} className="text-sm font-semibold text-slate-800">
            {isEdit ? "Editar obra complementaria" : "Nueva obra complementaria"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sat-navy disabled:opacity-50"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 p-5">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
            >
              <AlertCircle size={14} className="shrink-0 text-red-700" aria-hidden="true" />
              <span className="text-[11px] text-red-700">{error}</span>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="oc-id-instala" className={labelClass}>
                ID instalación
              </label>
              <input
                id="oc-id-instala"
                type="text"
                maxLength={3}
                value={idInstala}
                readOnly={isEdit}
                onChange={(event) => setIdInstala(event.target.value)}
                className={isEdit ? readOnlyClass : inputClass}
                autoFocus={!isEdit}
                required
              />
            </div>
            <div>
              <label htmlFor="oc-anno" className={labelClass}>
                Año
              </label>
              <input
                id="oc-anno"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={anno}
                readOnly={isEdit}
                onChange={(event) =>
                  setAnno(event.target.value.replace(/\D/g, ""))
                }
                className={isEdit ? readOnlyClass : inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="oc-categ" className={labelClass}>
                Categoría
              </label>
              <input
                id="oc-categ"
                type="text"
                maxLength={2}
                value={categ}
                readOnly={isEdit}
                onChange={(event) => setCateg(event.target.value.toUpperCase())}
                className={isEdit ? readOnlyClass : inputClass}
                aria-describedby="oc-categ-help"
              />
              <p id="oc-categ-help" className="mt-1 text-[10px] text-slate-600">
                Opcional; se envía como nula si queda vacía.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="oc-instala" className={labelClass}>
              Instalación
            </label>
            <input
              id="oc-instala"
              type="text"
              maxLength={200}
              value={instala}
              onChange={(event) => setInstala(event.target.value)}
              className={inputClass}
              autoFocus={isEdit}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="oc-uni-med" className={labelClass}>
                Unidad de medida
              </label>
              <input
                id="oc-uni-med"
                type="text"
                maxLength={15}
                value={uniMed}
                onChange={(event) => setUniMed(event.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="oc-valor" className={labelClass}>
                Valor
              </label>
              <input
                id="oc-valor"
                type="number"
                step="0.01"
                min="0"
                max={VALOR_MAX}
                value={valor}
                onChange={(event) => setValor(event.target.value)}
                className={inputClass}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="oc-descri-gener" className={labelClass}>
              Descripción general
            </label>
            <textarea
              id="oc-descri-gener"
              maxLength={200}
              rows={3}
              value={descriGener}
              onChange={(event) => setDescriGener(event.target.value)}
              className={`${inputClass} resize-y`}
              required
            />
          </div>

          <p className="text-[11px] text-slate-600">
            El estado y los datos de auditoría son asignados por el servidor.
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex min-h-9 items-center rounded-md border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-2 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-sat-navy px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50"
            >
              {saving && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
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
