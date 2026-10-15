"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { getPcName } from "@/lib/api";
import { checkSessionAction } from "@/actions/auth/auth";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // Fila del detalle seleccionada en la grilla (el modal pre-carga sus
  // valores editables). idDetalle = PK del detalle (WHERE del modo 8).
  // T7: tipo/observacion/estado preservados (NO editables, sin inputs
  // visibles: viajan tal cual en el PATCH para que el modo 8 no los pise).
  detalle: {
    idDetalle: number;
    cidordenanza: number;
    anno: string;
    tipoRec: string;
    concepto: string;
    impInsol: number;
    impReaj: number;
    mora: number;
    costoEmis: number;
    tipo: string;
    observacion: string;
    estado: string;
  } | null;
}

// Validación inline (previa al PATCH; el backend re-valida con Zod).
interface FormErrors {
  anno?: string;
  tipoRec?: string;
  impInsol?: string;
  impReaj?: string;
  mora?: string;
  costoEmis?: string;
}

// Contrato del PATCH /api/mantenimiento-tablas/ordenanzas/detalle/:id
// (T3 + T7 con los 19 params): { cidordenanza, anno YYYY, tipoRec,
// impInsol, impReaj, mora, costoEmis } editables + { tipo, observacion,
// estado } PRESERVADOS desde la fila (NO editables, sin inputs visibles).
// El backend llama caja.sp_ordenanzas @msquery=8 (UPDATE del detalle).
// estacion viaja por header x-estacion y se resuelve desde la sesión del
// cliente (patrón editar-ordenanza-modal).
export default function EditarDetalleModal({
  isOpen,
  onClose,
  onSuccess,
  detalle,
}: Props) {
  const [anno, setAnno] = useState("");
  const [tipoRec, setTipoRec] = useState("");
  const [impInsol, setImpInsol] = useState("");
  const [impReaj, setImpReaj] = useState("");
  const [mora, setMora] = useState("");
  const [costoEmis, setCostoEmis] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [estacion, setEstacion] = useState("");

  // Pre-carga con la fila del detalle al abrir + resolución de estación
  // (patrón editar-ordenanza-modal): primero el pcName de localStorage y,
  // si la sesión lo trae, el hostname de sesión (éste último gana).
  useEffect(() => {
    if (!isOpen || !detalle) return;
    setAnno(detalle.anno);
    setTipoRec(detalle.tipoRec);
    setImpInsol(String(detalle.impInsol));
    setImpReaj(String(detalle.impReaj));
    setMora(String(detalle.mora));
    setCostoEmis(String(detalle.costoEmis));
    setErrors({});
    setError(null);
    setSaving(false);
    setEstacion("");
    const pcFromStorage = getPcName?.() ?? "";
    if (pcFromStorage) setEstacion(pcFromStorage);
    checkSessionAction().then((s) => {
      if (s?.hostname) setEstacion(s.hostname);
    });
  }, [isOpen, detalle]);

  if (!isOpen || !detalle) return null;

  const validateMonto = (raw: string): number | null => {
    if (raw.trim() === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  };

  const validate = (): { errs: FormErrors; parsed?: Omit<Props["detalle"], "idDetalle" | "cidordenanza" | "concepto"> & { cidordenanza: number } } => {
    const errs: FormErrors = {};
    if (!/^\d{4}$/.test(anno.trim())) {
      errs.anno = "El año debe tener el formato YYYY";
    }
    if (!tipoRec.trim()) {
      errs.tipoRec = "El tipo de recurso es obligatorio";
    }
    const montos: FormErrors = {};
    if (validateMonto(impInsol) === null)
      montos.impInsol = "Debe ser un número mayor o igual a 0";
    if (validateMonto(impReaj) === null)
      montos.impReaj = "Debe ser un número mayor o igual a 0";
    if (validateMonto(mora) === null)
      montos.mora = "Debe ser un número mayor o igual a 0";
    if (validateMonto(costoEmis) === null)
      montos.costoEmis = "Debe ser un número mayor o igual a 0";
    return { errs: { ...errs, ...montos } };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const { errs } = validate();
    setErrors(errs);
    setError(null);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      // Sin `signal`: la cancelación es lógica del padre (patrón
      // ordenanza-detalle-modal); la llamada PATCH es de un solo fetch
      // con { method, headers, body }.
      const res = await fetch(
        `/api/mantenimiento-tablas/ordenanzas/detalle/${detalle.idDetalle}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-estacion": estacion,
          },
          body: JSON.stringify({
            cidordenanza: detalle.cidordenanza,
            anno: anno.trim(),
            tipoRec: tipoRec.trim(),
            impInsol: Number(impInsol),
            impReaj: Number(impReaj),
            mora: Number(mora),
            costoEmis: Number(costoEmis),
            // Preservados T7: desde la fila, tal cual (NO editables, sin
            // inputs visibles) para que el modo 8 no los pise en blanco.
            tipo: detalle.tipo,
            observacion: detalle.observacion,
            estado: detalle.estado,
          }),
        },
      );

      if (!res.ok) {
        // 4xx del backend → mensaje del body (Zod/NestJS: message string o
        // string[] de errores de validación); sin body JSON → genérico.
        let msg = "Error al guardar el detalle";
        try {
          const body = await res.json();
          const m = body?.message;
          if (typeof m === "string" && m.trim()) {
            msg = m;
          } else if (Array.isArray(m) && m.length > 0) {
            msg = m.join("; ");
          }
        } catch {
          // Body no JSON: mensaje genérico
        }
        setError(msg);
        return;
      }

      onSuccess();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (hasError?: string) =>
    `w-full rounded-md border px-3 py-2 text-[13px] text-slate-700 placeholder-slate-400 transition focus:outline-none ${
      hasError
        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
        : "border-slate-300 bg-white focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Editar detalle</h2>
            {/* Master + concepto solo lectura (el concepto viene del JOIN
                a TIPO_INGRESOS_DET y no es editable). */}
            <p className="mt-0.5 text-xs text-slate-400">
              {`#${detalle.cidordenanza} · ${detalle.concepto}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
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

          {/* Año + tipo de recurso */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="editar-detalle-anno"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Año *
              </label>
              <input
                id="editar-detalle-anno"
                type="text"
                value={anno}
                onChange={(e) => setAnno(e.target.value)}
                placeholder="Ej: 2013"
                maxLength={4}
                className={`${inputClass(errors.anno)} font-mono tabular-nums`}
                autoFocus
              />
              {errors.anno && (
                <p className="mt-1 text-[10px] font-medium text-red-500">
                  {errors.anno}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="editar-detalle-tiporec"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Tipo rec. *
              </label>
              <input
                id="editar-detalle-tiporec"
                type="text"
                value={tipoRec}
                onChange={(e) => setTipoRec(e.target.value)}
                placeholder="Ej: 02.01"
                className={`${inputClass(errors.tipoRec)} font-mono tabular-nums`}
              />
              {errors.tipoRec && (
                <p className="mt-1 text-[10px] font-medium text-red-500">
                  {errors.tipoRec}
                </p>
              )}
            </div>
          </div>

          {/* Montos (4 editables, ≥ 0) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="editar-detalle-impinsol"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Imp. insol. *
              </label>
              <input
                id="editar-detalle-impinsol"
                type="number"
                min={0}
                step="0.01"
                value={impInsol}
                onChange={(e) => setImpInsol(e.target.value)}
                className={`${inputClass(errors.impInsol)} font-mono tabular-nums`}
              />
              {errors.impInsol && (
                <p className="mt-1 text-[10px] font-medium text-red-500">
                  {errors.impInsol}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="editar-detalle-impreaj"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Imp. reaj. *
              </label>
              <input
                id="editar-detalle-impreaj"
                type="number"
                min={0}
                step="0.01"
                value={impReaj}
                onChange={(e) => setImpReaj(e.target.value)}
                className={`${inputClass(errors.impReaj)} font-mono tabular-nums`}
              />
              {errors.impReaj && (
                <p className="mt-1 text-[10px] font-medium text-red-500">
                  {errors.impReaj}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="editar-detalle-mora"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Mora *
              </label>
              <input
                id="editar-detalle-mora"
                type="number"
                min={0}
                step="0.01"
                value={mora}
                onChange={(e) => setMora(e.target.value)}
                className={`${inputClass(errors.mora)} font-mono tabular-nums`}
              />
              {errors.mora && (
                <p className="mt-1 text-[10px] font-medium text-red-500">
                  {errors.mora}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="editar-detalle-costoemis"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Costo emis. *
              </label>
              <input
                id="editar-detalle-costoemis"
                type="number"
                min={0}
                step="0.01"
                value={costoEmis}
                onChange={(e) => setCostoEmis(e.target.value)}
                className={`${inputClass(errors.costoEmis)} font-mono tabular-nums`}
              />
              {errors.costoEmis && (
                <p className="mt-1 text-[10px] font-medium text-red-500">
                  {errors.costoEmis}
                </p>
              )}
            </div>
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
