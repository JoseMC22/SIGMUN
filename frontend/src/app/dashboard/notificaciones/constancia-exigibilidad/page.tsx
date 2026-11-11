"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  FileText,
  Loader2,
  Printer,
  Save,
  Search,
  X,
} from "lucide-react";
import {
  emitirConstanciaExigibilidadAction,
  imprimirConstanciaExigibilidadAction,
  listTiposValorAction,
  obtenerPlantillaConstanciaExigibilidadAction,
  validarConstanciaExigibilidadAction,
  type ValidarConstanciaExigibilidadData,
} from "@/actions/notificaciones/constancia-exigibilidad";
import { imprimirConstanciaExigibilidad } from "./export-utils";

const CURRENT_YEAR = new Date().getFullYear();

// ── Helpers ─────────────────────────────────────────────────────────

function padNumero(value: string): string {
  return value.replace(/\D/g, "").slice(0, 7);
}

function toPaddedNumero(value: string): string {
  return padNumero(value).padStart(7, "0");
}

function formatFechaCorta(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function anoDesde(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return String(date.getFullYear());
}

// ── Page ────────────────────────────────────────────────────────────

export default function ConstanciaExigibilidadPage() {
  const router = useRouter();

  // ── Combo state ──
  const [tiposValor, setTiposValor] = useState<{ id_valor: string; nomb_val: string }[]>([]);
  const [tiposLoading, setTiposLoading] = useState(true);

  // ── Form state ──
  const [tipoValor, setTipoValor] = useState("");
  const [anio, setAnio] = useState<number>(CURRENT_YEAR);
  const [numero, setNumero] = useState("");

  // ── Valor / constancia state ──
  const [valor, setValor] = useState<ValidarConstanciaExigibilidadData | null>(null);
  const [emitted, setEmitted] = useState<{ numexig: string; anoexig: string } | null>(null);

  // ── UI state ──
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load tipos de valor on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await listTiposValorAction();
      if (cancelled) return;
      if (result.success && result.data.length > 0) {
        setTiposValor(result.data);
        setTipoValor((prev) => prev || result.data[0].id_valor);
      } else {
        setError(result.error ?? "No se pudieron cargar los tipos de valor.");
      }
      setTiposLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Derived ──
  const hasValor = valor !== null;
  const canGenerate = valor?.canGenerate === true;
  const canPrint = valor?.canPrint === true;

  // ── Handlers ──

  const handleNumeroBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const digits = padNumero(e.target.value);
    setNumero(digits ? digits.padStart(7, "0") : "");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void handleValidar();
  };

  const handleValidar = async () => {
    const trimmed = padNumero(numero);
    if (!tipoValor) {
      setError("Debe seleccionar un Tipo de Valor.");
      return;
    }
    if (!Number.isInteger(anio) || anio < 1000 || anio > 9999) {
      setError("El año debe tener 4 dígitos.");
      return;
    }
    if (trimmed.length === 0) {
      setError("El número de valor es requerido.");
      return;
    }

    setLoading(true);
    setError(null);
    setEmitted(null);
    try {
      const result = await validarConstanciaExigibilidadAction({
        tipoValor,
        anio,
        numero: trimmed.padStart(7, "0"),
      });
      const row = result.data[0];
      if (result.success && row) {
        setValor(row);
      } else {
        setValor(null);
        setError(result.error ?? "El valor no se encuentra registrado");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerar = async () => {
    if (!valor || !canGenerate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await emitirConstanciaExigibilidadAction({
        tipoValor,
        anio,
        numero: toPaddedNumero(numero),
      });
      const row = result.data[0];
      if (result.success && row) {
        setEmitted({ numexig: row.numexig, anoexig: row.anoexig });
        setValor((prev) =>
          prev
            ? {
                ...prev,
                nroExigibilidad: row.numexig,
                canGenerate: false,
                canPrint: true,
                message: "Ya cuenta con Constancia de Exigibilidad",
              }
            : prev,
        );
      } else {
        setError(result.error ?? "No se pudo generar la constancia.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = async () => {
    if (!valor || !canPrint) return;
    const numexig = emitted?.numexig ?? valor.nroExigibilidad;
    const anoexig =
      emitted?.anoexig ?? anoDesde(valor.fExigibilidad) ?? String(CURRENT_YEAR);

    setPrinting(true);
    setError(null);
    try {
      const [plantilla, impresion] = await Promise.all([
        obtenerPlantillaConstanciaExigibilidadAction(),
        imprimirConstanciaExigibilidadAction({ numexig, anoexig }),
      ]);

      if (!plantilla.success) {
        setError(plantilla.error);
        return;
      }

      const imp = impresion.data[0];
      if (!impresion.success || !imp) {
        setError(impresion.error ?? "No existe exigibilidad para imprimir.");
        return;
      }

      await imprimirConstanciaExigibilidad(plantilla.data.html, {
        nombre: imp.nombre,
        numexig,
        anoexig,
        valorCompleto: imp.valor,
        fnotifica: formatFechaCorta(imp.fnotifica),
        nrocargo: imp.cargo,
      });
    } catch {
      setError("Error al generar el PDF de la constancia.");
    } finally {
      setPrinting(false);
    }
  };

  // S9 — Cancelar limpia el formulario y devuelve el año al actual
  const handleCancelar = () => {
    setNumero("");
    setAnio(CURRENT_YEAR);
    setValor(null);
    setEmitted(null);
    setError(null);
  };

  const handleCerrar = () => {
    router.push("/dashboard");
  };

  // ── Render ──
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Constancia de Exigibilidad
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Generar e imprimir la constancia de exigibilidad (sin QR)
            </p>
          </div>
        </div>
      </div>

      {/* Search/Validation form */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Criterios de búsqueda
          </span>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Tipo Valor */}
            <div className="md:col-span-4">
              <label
                htmlFor="tipoValor"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 leading-none"
              >
                Tipo Valor
              </label>
              <select
                id="tipoValor"
                value={tipoValor}
                onChange={(e) => setTipoValor(e.target.value)}
                disabled={loading || tiposLoading}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:opacity-60"
              >
                {tiposLoading ? (
                  <option value="">Cargando tipos de valor...</option>
                ) : tiposValor.length === 0 ? (
                  <option value="">Sin tipos de valor disponibles</option>
                ) : (
                  tiposValor.map((t) => (
                    <option key={t.id_valor} value={t.id_valor}>
                      {t.nomb_val}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Año */}
            <div className="md:col-span-2">
              <label
                htmlFor="anio"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 leading-none"
              >
                Año
              </label>
              <input
                id="anio"
                type="number"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                min={1000}
                max={9999}
                disabled={loading}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              />
            </div>

            {/* Número */}
            <div className="md:col-span-4">
              <label
                htmlFor="numero"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 leading-none"
              >
                Número de valor
              </label>
              <input
                id="numero"
                type="text"
                inputMode="numeric"
                placeholder="0000000"
                maxLength={7}
                value={numero}
                onChange={(e) => setNumero(padNumero(e.target.value))}
                onBlur={handleNumeroBlur}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-mono text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              />
            </div>

            {/* Validar */}
            <div className="md:col-span-2 flex items-end">
              <button
                type="button"
                onClick={handleValidar}
                disabled={loading || tiposLoading || !tipoValor || padNumero(numero).length === 0}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-sat-cyan px-4 py-2 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Search size={12} />
                )}
                Validar
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-2 p-2 rounded-md border border-red-200 bg-red-50 text-[11px] text-red-600"
            >
              <AlertCircle size={12} className="mr-1 inline" /> {error}
            </div>
          )}
        </div>
      </div>

      {/* Valor data (visible only after successful validation) */}
      {hasValor && valor && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Datos del valor
            </span>
          </div>
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Administrado */}
              <div className="md:col-span-4">
                <span className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">
                  Administrado
                </span>
                <div className="p-1.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-700">
                  {valor.administrado || "—"}
                </div>
              </div>

              {/* Fecha Valor */}
              <div className="md:col-span-2">
                <span className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">
                  Fecha Valor
                </span>
                <div className="p-1.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-700">
                  {formatFechaCorta(valor.fecVal)}
                </div>
              </div>

              {/* Monto */}
              <div className="md:col-span-2">
                <span className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">
                  Monto
                </span>
                <div className="p-1.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] text-right tabular-nums text-slate-700">
                  {valor.monto.toFixed(2)}
                </div>
              </div>

              {/* Nro Notificación */}
              <div className="md:col-span-2">
                <span className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">
                  Nro Notificación
                </span>
                <div className="p-1.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-700">
                  {valor.cargo || "—"}
                </div>
              </div>

              {/* F. Notificación */}
              <div className="md:col-span-2">
                <span className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">
                  F. Notificación
                </span>
                <div className="p-1.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-700">
                  {formatFechaCorta(valor.fNotifica)}
                </div>
              </div>

              {/* Nro Exigibilidad */}
              <div className="md:col-span-2">
                <span className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">
                  Nro Exigibilidad
                </span>
                <div className="p-1.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-800">
                  {valor.nroExigibilidad || "0"}
                </div>
              </div>

              {/* F. Exigibilidad */}
              <div className="md:col-span-2">
                <span className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">
                  F. Exigibilidad
                </span>
                <div className="p-1.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-700">
                  {formatFechaCorta(valor.fExigibilidad)}
                </div>
              </div>
            </div>

            {/* Message bar */}
            <div
              className={`p-2 rounded-md text-[11px] font-medium border ${
                canGenerate
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : canPrint
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {valor.message}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGenerar}
                  disabled={loading || printing || !canGenerate}
                  className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-2 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Save size={12} />
                  )}
                  Generar
                </button>
                <button
                  type="button"
                  onClick={handleImprimir}
                  disabled={loading || printing || !canPrint}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-300 px-4 py-2 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {printing ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Printer size={12} />
                  )}
                  Imprimir
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancelar}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-300 px-4 py-2 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40"
                >
                  <X size={12} /> Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCerrar}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-300 px-4 py-2 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
