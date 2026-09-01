"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import { getStoredUser, getPcName, fetchPcName } from "@/lib/api";
import {
  getGenerarDeudaConceptoAction,
  guardarGenerarDeudaAction,
  type GenerarDeudaConcepto,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { getAnioOptions } from "@/lib/forms/anios";

// ─── Types ────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Código del contribuyente — informativo, por si más adelante hay
   *  que ligarlo en el payload del SP de guardado. */
  codigoContribuyente?: string;
  /** Nombre del contribuyente — solo se muestra en el header. */
  nombreContribuyente?: string;
  /** Callback con el id devuelto por el SP después de guardar
   *  (permite al padre refrescar la grilla del Estado de Cuenta). */
  onSaved?: (idMulta: string | null) => void;
}

interface FormState {
  anioDesde: string;
  anioHasta: string;
  fecha: string;
  concepto: string;
  monto: string;
  observaciones: string;
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

const labelClass = "mb-0.5 block text-[10px] font-medium text-slate-600";

const todayIso = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// ─── Component ────────────────────────────────────────────

export default function GenerarDeudaModal({
  isOpen,
  onClose,
  codigoContribuyente,
  nombreContribuyente,
  onSaved,
}: Props) {
  // Default values are deterministic so the form always opens identically.
  const currentYear = String(new Date().getFullYear());
  const anioOptions = getAnioOptions(); // 1992 → current year, desc

  const initialForm = (): FormState => ({
    anioDesde: currentYear,
    anioHasta: currentYear,
    fecha: todayIso(),
    concepto: "",
    monto: "",
    observaciones: "",
  });

  const [form, setForm] = useState<FormState>(initialForm);
  const [conceptos, setConceptos] = useState<GenerarDeudaConcepto[]>([]);
  const [loadingConceptos, setLoadingConceptos] = useState(false);
  const [errorConceptos, setErrorConceptos] = useState<string | null>(null);
  const [loadingGuardar, setLoadingGuardar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Id devuelto por el SP cuando se genera la multa (mostramos "ok"). */
  const [successId, setSuccessId] = useState<string | null>(null);
  /** Hostname de la PC del cliente (resuelto al abrir el modal). */
  const [estacion, setEstacion] = useState<string>("");

  // ── Load "Concepto" options from the SP when the modal opens ──
  useEffect(() => {
    if (!isOpen) return;
    const user = getStoredUser();
    const areaId = user?.areaId;
    if (!areaId) {
      setConceptos([]);
      setErrorConceptos(
        "No se pudo identificar el área del usuario. Inicie sesión nuevamente.",
      );
      return;
    }
    let cancelled = false;
    setLoadingConceptos(true);
    setErrorConceptos(null);
    getGenerarDeudaConceptoAction(areaId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setConceptos(result.data);
          if (result.data.length === 0) {
            setErrorConceptos("No hay conceptos disponibles para esta área.");
          }
        } else {
          setConceptos([]);
          setErrorConceptos(result.error);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setConceptos([]);
        setErrorConceptos("Error al cargar los conceptos.");
      })
      .finally(() => {
        if (!cancelled) setLoadingConceptos(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // ── Reset form when the modal closes ──
  const resetState = useCallback(() => {
    setForm(initialForm());
    setConceptos([]);
    setLoadingConceptos(false);
    setErrorConceptos(null);
    setLoadingGuardar(false);
    setError(null);
    setSuccessId(null);
    setEstacion("");
  }, []);

  useEffect(() => {
    if (!isOpen) resetState();
  }, [isOpen, resetState]);

  // ── Fetch PC name from backend on open ──
  // fetchPcName() hits /auth/client-info, which the backend now resolves
  // via Windows-native nslookup (since Node's dns.reverse() returns
  // placeholders like "GATEWAY" in this network). We need this value
  // BEFORE the user clicks "Guardar" so the SP gets the real hostname.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetchPcName().then((name) => {
      if (cancelled) return;
      setEstacion(name || "");
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // ── ESC to close ──
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ── Field helpers ──
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Guard logic (placeholder — full validation in next step) ──
  const anioDesdeNum = Number(form.anioDesde);
  const anioHastaNum = Number(form.anioHasta);
  const anioRangeInvalid =
    Number.isFinite(anioDesdeNum) &&
    Number.isFinite(anioHastaNum) &&
    anioDesdeNum > anioHastaNum;
  const montoNum = Number(form.monto);
  const montoInvalid = form.monto !== "" && (!Number.isFinite(montoNum) || montoNum <= 0);
  const formInvalid =
    !form.concepto ||
    !form.monto ||
    Number.isNaN(montoNum) ||
    montoNum <= 0 ||
    anioRangeInvalid;

  const handleGuardar = async () => {
    if (formInvalid) {
      setError(
        anioRangeInvalid
          ? "El año 'Desde' no puede ser mayor que el año 'Hasta'."
          : "Complete los campos obligatorios (Concepto, Monto > 0).",
      );
      return;
    }
    const user = getStoredUser();
    const operador = user?.username ?? "";
    // Try the state first (populated on open by fetchPcName). Fall back to
    // the synchronous localStorage read in case the user clicked Guardar
    // before the async fetch resolved.
    const estacionResolved = estacion || getPcName();
    if (!operador) {
      setError("No se pudo obtener el usuario actual. Inicie sesión nuevamente.");
      return;
    }
    if (!estacionResolved) {
      setError(
        "No se pudo identificar la estación (hostname). Configure el nombre de la PC.",
      );
      return;
    }
    setLoadingGuardar(true);
    setError(null);
    setSuccessId(null);
    try {
      const result = await guardarGenerarDeudaAction({
        codigo: codigoContribuyente ?? '',
        anio_desde: form.anioDesde,
        anio_hasta: form.anioHasta,
        codigo_infraccion: form.concepto,
        monto_multa: Number(form.monto),
        fecha_multa: form.fecha,
        operador,
        estacion: estacionResolved,
        glosa: form.observaciones,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccessId(result.data.idMulta);
      onSaved?.(result.data.idMulta);
      // No cerrar automáticamente: se muestra "Se generó correctamente"
      // y el usuario cierra con la X, ESC o el botón Salir.
    } catch {
      setError("Error al guardar la deuda. Intente nuevamente.");
    } finally {
      setLoadingGuardar(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <div>
            <h2 className="text-[12px] font-semibold text-slate-800">
              Generar Deuda
            </h2>
            {(codigoContribuyente || nombreContribuyente) && (
              <p className="mt-0.5 text-[10px] text-slate-500">
                {nombreContribuyente ? `${nombreContribuyente} · ` : ""}
                {codigoContribuyente ? `Cód. ${codigoContribuyente}` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="space-y-3 p-4">
          {/* Groupbox: Generar Deuda */}
          <fieldset className="rounded border border-slate-200 bg-slate-50/50 p-3">
            <legend className="px-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Generar Deuda
            </legend>

            <div className="space-y-2">
              {/* Año Desde / Año Hasta */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass} htmlFor="anioDesde">
                    Año Desde
                  </label>
                  <select
                    id="anioDesde"
                    value={form.anioDesde}
                    onChange={(e) => setField("anioDesde", e.target.value)}
                    className={inputClass}
                  >
                    {anioOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="anioHasta">
                    Año Hasta
                  </label>
                  <select
                    id="anioHasta"
                    value={form.anioHasta}
                    onChange={(e) => setField("anioHasta", e.target.value)}
                    className={inputClass}
                  >
                    {anioOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {anioRangeInvalid && (
                <p className="text-[10px] text-red-600">
                  El año Desde no puede ser mayor que Hasta.
                </p>
              )}

              {/* Fecha */}
              <div>
                <label className={labelClass} htmlFor="fecha">
                  Fecha
                </label>
                <input
                  id="fecha"
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setField("fecha", e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Concepto */}
              <div>
                <label className={labelClass} htmlFor="concepto">
                  Concepto
                </label>
                <div className="relative">
                  <select
                    id="concepto"
                    value={form.concepto}
                    onChange={(e) => setField("concepto", e.target.value)}
                    className={inputClass}
                    disabled={loadingConceptos || conceptos.length === 0}
                  >
                    <option value="">
                      {loadingConceptos
                        ? "Cargando…"
                        : conceptos.length === 0
                          ? "Sin conceptos"
                          : "Seleccione…"}
                    </option>
                    {conceptos.map((c) => (
                      <option key={c.tipo} value={c.tipo}>
                        {c.tipo} — {c.concepto}
                      </option>
                    ))}
                  </select>
                  {loadingConceptos && (
                    <Loader2
                      size={12}
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                    />
                  )}
                </div>
                {errorConceptos && (
                  <p className="mt-1 text-[10px] text-red-600">
                    {errorConceptos}
                  </p>
                )}
              </div>

              {/* Monto Deuda S/. */}
              <div>
                <label className={labelClass} htmlFor="monto">
                  Monto Deuda S/.
                </label>
                <input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monto}
                  onChange={(e) => setField("monto", e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
                {montoInvalid && (
                  <p className="mt-1 text-[10px] text-red-600">
                    El monto debe ser un número mayor a 0.
                  </p>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <label className={labelClass} htmlFor="observaciones">
                  Observaciones
                </label>
                <textarea
                  id="observaciones"
                  rows={3}
                  value={form.observaciones}
                  onChange={(e) => setField("observaciones", e.target.value)}
                  className={inputClass}
                />
              </div>

              {error && (
                <p className="text-[10px] text-red-600">{error}</p>
              )}
              {successId !== null && (
                <p className="text-[10px] text-emerald-700">
                  Se generó correctamente.
                </p>
              )}
            </div>
          </fieldset>

          {/* Groupbox: actions */}
          <fieldset className="rounded border border-slate-200 bg-slate-50/50 p-2">
            <legend className="px-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Acciones
            </legend>
            <div className="flex justify-end gap-2 px-1 py-1">
              {successId !== null ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded bg-sat-cyan px-8 py-1 text-[11px] font-medium text-white transition hover:bg-cyan-600"
                >
                  OK
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Salir
                  </button>
                  <button
                    type="button"
                    onClick={handleGuardar}
                    disabled={formInvalid || loadingGuardar}
                    className="inline-flex items-center justify-center gap-1.5 rounded bg-sat-cyan px-3 py-1 text-[11px] font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingGuardar && (
                      <Loader2 size={12} className="animate-spin" />
                    )}
                    Guardar
                  </button>
                </>
              )}
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
}
