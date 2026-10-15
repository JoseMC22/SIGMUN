"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { getPcName } from "@/lib/api";
import { checkSessionAction } from "@/actions/auth/auth";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // Master fijo por contexto (solo lectura): el alta hereda el
  // cidordenanza del modal padre (ordenanza-detalle-modal). El concepto
  // viene del JOIN a TIPO_INGRESOS_DET por tipo_rec y aún no existe para
  // la fila nueva: se muestra la descripción del master.
  master: {
    cidordenanza: number;
    descripcion: string;
  } | null;
}

// Validación inline espejo del Zod del POST (previa al POST; el backend
// re-valida): rango de años (annoDesde/annoHasta YYYY, desde ≤ hasta, tope
// de 100 años), tipo/tipoRec min 1 y 4 montos ≥ 0. observacion admite ''
// legítimo. estado y fecvenc NO se validan: no son entrada del cliente
// (los fija el servidor) y se muestran solo lectura.
interface FormErrors {
  annoDesde?: string;
  annoHasta?: string;
  tipo?: string;
  tipoRec?: string;
  impInsol?: string;
  impReaj?: string;
  mora?: string;
  costoEmis?: string;
}

// "Hoy" en el reloj local del cliente (YYYY-MM-DD), solo informativo: el
// backend es la autoridad y recalcula el día calendario de Lima.
function hoyLocalIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Contrato del POST /api/mantenimiento-tablas/ordenanzas/detalle
// (ordenanzas-detalle-rango-anios, @msquery=2 = INSERT): { cidordenanza
// (fijo por contexto), annoDesde/annoHasta (RANGO YYYY), tipo, tipoRec,
// impInsol, impReaj, mora, costoEmis, observacion }. El backend inserta una
// fila por año del rango y responde { message, creados, salteados }. estado
// y fecvenc NO viajan: el backend los fija ('1' y el día calendario de
// Lima). estacion viaja por header x-estacion y se resuelve desde la
// sesión del cliente (patrón editar-detalle-modal).
export default function NuevoDetalleModal({
  isOpen,
  onClose,
  onSuccess,
  master,
}: Props) {
  const [annoDesde, setAnnoDesde] = useState("");
  const [annoHasta, setAnnoHasta] = useState("");
  const [tipo, setTipo] = useState("");
  const [tipoRec, setTipoRec] = useState("");
  const [impInsol, setImpInsol] = useState("");
  const [impReaj, setImpReaj] = useState("");
  const [mora, setMora] = useState("");
  const [costoEmis, setCostoEmis] = useState("");
  const [observacion, setObservacion] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  // Resultado con años salteados: el backend registró algunos años pero
  // salteó otros (ya existían). Se muestra un banner y se espera a que el
  // usuario confirme con "Listo" antes de llamar a onSuccess.
  const [resultado, setResultado] = useState<{ message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [estacion, setEstacion] = useState("");

  // Escape cierra SOLO este modal si es el tope de la pila (convención del
  // proyecto: nunca click en el backdrop). Se registra en la pila al abrir
  // para que el Escape del padre (no tope) no dispare.
  const modalId = useModalStack(isOpen);

  // Reset del alta + resolución de estación al abrir (patrón
  // nueva-ordenanza-modal): primero el pcName de localStorage y, si la
  // sesión lo trae, el hostname de sesión (éste último gana).
  useEffect(() => {
    if (!isOpen) return;
    setAnnoDesde("");
    setAnnoHasta("");
    setTipo("");
    setTipoRec("");
    setImpInsol("");
    setImpReaj("");
    setMora("");
    setCostoEmis("");
    setObservacion("");
    setErrors({});
    setError(null);
    setResultado(null);
    setSaving(false);
    setEstacion("");
    const pcFromStorage = getPcName?.() ?? "";
    if (pcFromStorage) setEstacion(pcFromStorage);
    checkSessionAction().then((s) => {
      if (s?.hostname) setEstacion(s.hostname);
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopModal(modalId)) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, modalId, onClose]);

  if (!isOpen || !master) return null;

  const validateMonto = (raw: string): number | null => {
    if (raw.trim() === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  };

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    const desdeValido = /^\d{4}$/.test(annoDesde.trim());
    const hastaValido = /^\d{4}$/.test(annoHasta.trim());
    if (!desdeValido) {
      errs.annoDesde = "El año debe tener el formato YYYY";
    }
    if (!hastaValido) {
      errs.annoHasta = "El año debe tener el formato YYYY";
    }
    // Solo compara cuando ambos tienen formato válido: si no, el error de
    // formato ya cubre el caso.
    if (desdeValido && hastaValido) {
      const desde = Number(annoDesde.trim());
      const hasta = Number(annoHasta.trim());
      if (desde > hasta) {
        errs.annoHasta = "El año desde no puede ser mayor que el año hasta";
      } else if (hasta - desde > 99) {
        errs.annoHasta = "El rango no puede superar los 100 años";
      }
    }
    if (!tipo.trim()) {
      errs.tipo = "El tipo es obligatorio";
    }
    if (!tipoRec.trim()) {
      errs.tipoRec = "El tipo de recurso es obligatorio";
    }
    if (validateMonto(impInsol) === null)
      errs.impInsol = "Debe ser un número mayor o igual a 0";
    if (validateMonto(impReaj) === null)
      errs.impReaj = "Debe ser un número mayor o igual a 0";
    if (validateMonto(mora) === null)
      errs.mora = "Debe ser un número mayor o igual a 0";
    if (validateMonto(costoEmis) === null)
      errs.costoEmis = "Debe ser un número mayor o igual a 0";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // No-op mientras se muestra el resultado con años salteados: el usuario
    // debe confirmar con "Listo".
    if (saving || resultado) return;

    const errs = validate();
    setErrors(errs);
    setError(null);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      // Sin `signal`: la cancelación es lógica del padre (patrón
      // ordenanza-detalle-modal); la llamada POST es de un solo fetch
      // con { method, headers, body }.
      const res = await fetch("/api/mantenimiento-tablas/ordenanzas/detalle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-estacion": estacion,
        },
        body: JSON.stringify({
          cidordenanza: master.cidordenanza,
          annoDesde: annoDesde.trim(),
          annoHasta: annoHasta.trim(),
          tipo: tipo.trim(),
          tipoRec: tipoRec.trim(),
          impInsol: Number(impInsol),
          impReaj: Number(impReaj),
          mora: Number(mora),
          costoEmis: Number(costoEmis),
          observacion,
        }),
      });

      if (!res.ok) {
        // 4xx del backend → mensaje del body (Zod/NestJS: message string o
        // string[] de errores de validación; 409 (todos los años existen)
        // incluido); sin body JSON → genérico.
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

      // 2xx: el backend devuelve { message, creados, salteados }. Si salteó
      // años, se reporta inline y se espera confirmación ("Listo"); sin
      // salteados (o body no parseable) → comportamiento actual (onSuccess).
      try {
        const body = await res.json();
        if (Array.isArray(body?.salteados) && body.salteados.length > 0) {
          setResultado({
            message:
              typeof body.message === "string" && body.message.trim()
                ? body.message
                : "Se registraron los años nuevos.",
          });
          return;
        }
      } catch {
        // Body no JSON pero 2xx: comportamiento actual.
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
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Nuevo detalle</h2>
            {/* Master fijo por contexto, solo lectura (sin inputs): el
                concepto aún no existe (viene del JOIN por tipo_rec). */}
            <p className="mt-0.5 text-xs text-slate-400">
              {`#${master.cidordenanza} · ${master.descripcion}`}
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

          {resultado && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <AlertCircle size={14} className="text-amber-500 shrink-0" />
              <span className="text-xs text-amber-700">{resultado.message}</span>
            </div>
          )}

          {/* Rango de años (desde/hasta): el backend inserta una fila por año. */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="nuevo-detalle-anno-desde"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Año desde *
              </label>
              <input
                id="nuevo-detalle-anno-desde"
                type="text"
                value={annoDesde}
                onChange={(e) => setAnnoDesde(e.target.value)}
                placeholder="Ej: 2013"
                maxLength={4}
                className={`${inputClass(errors.annoDesde)} font-mono tabular-nums`}
                autoFocus
              />
              {errors.annoDesde && (
                <p className="mt-1 text-[10px] font-medium text-red-500">
                  {errors.annoDesde}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="nuevo-detalle-anno-hasta"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Año hasta *
              </label>
              <input
                id="nuevo-detalle-anno-hasta"
                type="text"
                value={annoHasta}
                onChange={(e) => setAnnoHasta(e.target.value)}
                placeholder="Ej: 2026"
                maxLength={4}
                className={`${inputClass(errors.annoHasta)} font-mono tabular-nums`}
              />
              {errors.annoHasta && (
                <p className="mt-1 text-[10px] font-medium text-red-500">
                  {errors.annoHasta}
                </p>
              )}
            </div>
          </div>

          {/* Tipo + tipo de recurso */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="nuevo-detalle-tipo"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Tipo *
              </label>
              <input
                id="nuevo-detalle-tipo"
                type="text"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                placeholder="Ej: 02.01"
                className={`${inputClass(errors.tipo)} font-mono tabular-nums`}
              />
              {errors.tipo && (
                <p className="mt-1 text-[10px] font-medium text-red-500">
                  {errors.tipo}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="nuevo-detalle-tiporec"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Tipo rec. *
              </label>
              <input
                id="nuevo-detalle-tiporec"
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

          {/* Montos (4, ≥ 0) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="nuevo-detalle-impinsol"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Imp. insol. *
              </label>
              <input
                id="nuevo-detalle-impinsol"
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
                htmlFor="nuevo-detalle-impreaj"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Imp. reaj. *
              </label>
              <input
                id="nuevo-detalle-impreaj"
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
                htmlFor="nuevo-detalle-mora"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Mora *
              </label>
              <input
                id="nuevo-detalle-mora"
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
                htmlFor="nuevo-detalle-costoemis"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Costo emis. *
              </label>
              <input
                id="nuevo-detalle-costoemis"
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

          {/* Observación (opcional) */}
          <div>
            <label
              htmlFor="nuevo-detalle-observacion"
              className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
            >
              Observación
            </label>
            <textarea
              id="nuevo-detalle-observacion"
              rows={2}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Opcional"
              className={`${inputClass()} resize-none`}
            />
          </div>

          {/* Estado + fecha de vencimiento: fijos por el servidor, solo
              lectura informativa (no son campos del cliente). */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Estado
              </span>
              <div
                data-testid="nuevo-detalle-estado-fijo"
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-mono tabular-nums text-slate-500"
              >
                1
              </div>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Fecha de vencimiento
              </span>
              <div
                data-testid="nuevo-detalle-fecvenc-fijo"
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-mono tabular-nums text-slate-500"
              >
                {hoyLocalIso()}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {resultado ? (
              <button
                type="button"
                onClick={onSuccess}
                className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40"
              >
                Listo
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
