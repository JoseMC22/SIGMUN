"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import {
  getDetalleConvenioAction,
  generarResolucionAction,
  getDatosResolucionAction,
  anularConvenioAction,
  anularConvenioScAction,
  type DetalleConvenioData,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { obtenerPlantillaReporteResolucionAction } from "@/actions/administracion-tributaria/reporte-resolucion";
import {
  construirHtmlReporteResolucion,
  construirConfigPdfResolucion,
} from "./reportes/Resolucion/resolucion";
import ReporteViewerModal from "@/components/reportes/reporte-viewer-modal";
import ConfirmDialog from "@/components/confirm-dialog";
import { getStoredUser, getPcName } from "@/lib/api";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  codigoContribuyente?: string;
  nombreContribuyente?: string;
  convenio?: string;
}

function fmtMonto(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value || "0.00";
  return n.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPorcentaje(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value || "0.00";
  return `${n.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;
}

// ─── Detalle de Convenio (legacy: fraccionar/resolfracc) ────────────────
// Panel izquierdo: datos del convenio. Panel derecho: grilla de cuotas.
// Los 4 botones legacy (Generar/Imprimir Resolución, Anular, Anular S/C)
// están implementados; por decisión del usuario solo se Muestra "Anular
// Convenio" en la UI (los demás permanecen ocultos temporalmente).
export default function DetalleConvenioModal({
  isOpen,
  onClose,
  codigoContribuyente,
  nombreContribuyente,
  convenio,
}: Props) {
  const [detalle, setDetalle] = useState<DetalleConvenioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Generar Resolución
  const [generando, setGenerando] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Imprimir Resolución (reporte rpt_conv_resolucion)
  const [imprimiendo, setImprimiendo] = useState(false);
  const [reporteHtml, setReporteHtml] = useState<string | null>(null);
  const [reportePdf, setReportePdf] = useState<ReturnType<
    typeof construirConfigPdfResolucion
  > | null>(null);
  // Anular Convenio (ConfirmDialog)
  const [confirmarAnular, setConfirmarAnular] = useState(false);
  const [anulando, setAnulando] = useState(false);
  // Anular Convenio S/C (ConfirmDialog)
  const [confirmarAnularSc, setConfirmarAnularSc] = useState(false);
  const [anulandoSc, setAnulandoSc] = useState(false);

  // Modal-foco: solo el modal en la cima de la pila responde al Escape.
  const modalId = useModalStack(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopModal(modalId)) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, modalId, onClose]);

  // Carga al abrir; reset al cerrar (legacy: Ajax al abrir el diálogo).
  const cargarDetalle = useCallback(() => {
    const codigo = codigoContribuyente?.trim();
    const numConvenio = convenio?.trim();
    if (!codigo || !numConvenio) {
      setError("No hay un convenio seleccionado.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    getDetalleConvenioAction(codigo, numConvenio)
      .then((result) => {
        if (!result.success) {
          setError(result.error);
          return;
        }
        setDetalle(result.data);
      })
      .catch(() => setError("Error al obtener el detalle del convenio."))
      .finally(() => setLoading(false));
  }, [codigoContribuyente, convenio]);

  useEffect(() => {
    if (!isOpen) {
      setDetalle(null);
      setError(null);
      setMessage(null);
      setReporteHtml(null);
      setReportePdf(null);
      return;
    }
    let cancelled = false;
    cargarDetalle();
    return () => {
      cancelled = true;
    };
  }, [isOpen, cargarDetalle]);

  // ── Generar Resolución (legacy: fraccionar/resoluciongenera) ──
  const handleGenerarResolucion = useCallback(async () => {
    const codigo = codigoContribuyente?.trim();
    const numConvenio = convenio?.trim();
    if (!codigo || !numConvenio || generando) return;
    setGenerando(true);
    setError(null);
    setMessage(null);
    try {
      const result = await generarResolucionAction(codigo, numConvenio);
      if (!result.success) {
        setError(result.error);
        return;
      }
      // El legacy mostraba "Resolucion Generada Correctamente" y recargaba
      // el estado del convenio (pasa de estado 1 → 2).
      setMessage(result.message ?? "Resolución Generada Correctamente");
      cargarDetalle();
    } catch {
      setError("Error al generar la resolución.");
    } finally {
      setGenerando(false);
    }
  }, [codigoContribuyente, convenio, generando, cargarDetalle]);

  // ── Imprimir Resolución (legacy: jasper rpt_conv_resolucion) ──
  const handleImprimirResolucion = useCallback(async () => {
    const codigo = codigoContribuyente?.trim();
    const numConvenio = convenio?.trim();
    if (!codigo || !numConvenio || imprimiendo) return;
    setImprimiendo(true);
    setError(null);
    setMessage(null);
    try {
      const [datos, plantilla] = await Promise.all([
        getDatosResolucionAction(codigo, numConvenio),
        obtenerPlantillaReporteResolucionAction(),
      ]);
      if (!datos.success) {
        setError(datos.error);
        return;
      }
      if (!plantilla.success) {
        setError(plantilla.error);
        return;
      }
      const html = construirHtmlReporteResolucion(datos.data, plantilla.data, {
        codigo,
        convenio: numConvenio,
        funcionario: getStoredUser()?.username ?? "",
      });
      setReporteHtml(html);
      setReportePdf(construirConfigPdfResolucion(datos.data, {
        codigo,
        convenio: numConvenio,
      }));
    } catch {
      setError("Error al cargar la resolución.");
    } finally {
      setImprimiendo(false);
    }
  }, [codigoContribuyente, convenio, imprimiendo]);

  // ── Anular Convenio (legacy: fraccionar/anularfrac) ──
  const handleAnularConvenio = useCallback(async () => {
    const codigo = codigoContribuyente?.trim();
    const numConvenio = convenio?.trim();
    if (!codigo || !numConvenio || anulando) return;
    setAnulando(true);
    setError(null);
    setMessage(null);
    try {
      const result = await anularConvenioAction(
        codigo,
        numConvenio,
        getStoredUser()?.username ?? "",
        getPcName(),
      );
      if (!result.success) {
        setError(result.error);
        setConfirmarAnular(false);
        return;
      }
      setMessage(result.message ?? "Convenio anulado correctamente.");
      setConfirmarAnular(false);
      // El convenio pasa a estado 3 (anulado); recargamos el detalle.
      cargarDetalle();
    } catch {
      setError("Error al anular el convenio.");
      setConfirmarAnular(false);
    } finally {
      setAnulando(false);
    }
  }, [codigoContribuyente, convenio, anulando, cargarDetalle]);

  // ── Anular Convenio S/C (legacy: fraccionar/anularfracsc) ──
  const handleAnularConvenioSc = useCallback(async () => {
    const codigo = codigoContribuyente?.trim();
    const numConvenio = convenio?.trim();
    if (!codigo || !numConvenio || anulandoSc) return;
    setAnulandoSc(true);
    setError(null);
    setMessage(null);
    try {
      const result = await anularConvenioScAction(
        codigo,
        numConvenio,
        getStoredUser()?.username ?? "",
        getPcName(),
      );
      if (!result.success) {
        setError(result.error);
        setConfirmarAnularSc(false);
        return;
      }
      setMessage(result.message ?? "Convenio anulado sin cargos correctamente.");
      setConfirmarAnularSc(false);
      // El convenio pasa a estado 3 (anulado); recargamos el detalle.
      cargarDetalle();
    } catch {
      setError("Error al anular el convenio sin cargos.");
      setConfirmarAnularSc(false);
    } finally {
      setAnulandoSc(false);
    }
  }, [codigoContribuyente, convenio, anulandoSc, cargarDetalle]);

  if (!isOpen) return null;

  // ── Habilitación de botones (lógica del JS legacy js_resolfracc.js) ──
  const estado = detalle?.estadoCodigo?.trim() ?? "";
  const sinRecibo = (detalle?.nroRecibo ?? "").trim() === "";
  const btnGenResolDisabled = generando ||
    estado === "2" ||
    estado === "3" ||
    (estado === "1" && sinRecibo);
  const btnImproResolDisabled = imprimiendo ||
    estado === "3" ||
    (estado === "1" && sinRecibo);
  const btnAnularDisabled = anulando || estado === "3";
  // Anular S/C: deshabilitado en estado 3 (igual que el legacy) y mientras anulando.
  const btnAnularScDisabled = anulandoSc || estado === "3";

  return (
    <>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
            <div>
              <h2 className="text-[12px] font-semibold text-slate-800">
                Detalle Convenio
              </h2>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {nombreContribuyente ? `${nombreContribuyente} · ` : ""}
                {codigoContribuyente ? `Cód. ${codigoContribuyente}` : ""}
                {convenio ? ` · Convenio ${convenio}` : ""}
              </p>
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

          {/* Body: datos del convenio + grilla de cuotas */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 size={14} className="mr-1.5 animate-spin" />
                Cargando detalle…
              </div>
            ) : error || !detalle ? (
              <div className="py-8 text-center text-[11px] text-red-600">
                {error ?? "No se pudo cargar el detalle del convenio."}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* ── Datos del convenio ── */}
                <div className="rounded border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                    Datos del Convenio
                  </div>
                  <div className="space-y-2 px-3 py-3 text-[11px]">
                    <Field label="Fecha Conven:" value={detalle.fecha} />
                    <Field
                      label="Monto Total Frac.:"
                      value={fmtMonto(detalle.montoTotal)}
                      align="right"
                    />
                    <Field
                      label="Cuota Inicial:"
                      value={fmtMonto(detalle.cuotaInicial)}
                      align="right"
                    />
                    <Field
                      label="Porcentaje inicial:"
                      value={fmtPorcentaje(detalle.porcentajeInicial)}
                      align="right"
                    />
                    <Field
                      label="Saldo:"
                      value={fmtMonto(detalle.saldo)}
                      align="right"
                    />
                    <Field
                      label="Número de Cuotas:"
                      value={detalle.numeroCuotas}
                      align="right"
                    />
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="font-medium text-slate-600">Estado:</span>
                      <span
                        className={
                          detalle.estadoCodigo === "3"
                            ? "font-semibold text-red-600"
                            : "font-semibold text-emerald-700"
                        }
                      >
                        {detalle.estado}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Detalle de Cuotas ── */}
                <div className="rounded border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                    Detalle de Cuotas
                  </div>
                  <div className="max-h-[300px] overflow-auto">
                    <table className="w-full text-[11px]">
                      <thead className="sticky top-0 bg-slate-100">
                        <tr className="text-slate-700">
                          <th className="px-2 py-1.5 text-center font-semibold">
                            Cuotas
                          </th>
                          <th className="px-2 py-1.5 text-right font-semibold">
                            Importe
                          </th>
                          <th className="px-2 py-1.5 text-right font-semibold">
                            Reajuste
                          </th>
                          <th className="px-2 py-1.5 text-right font-semibold">
                            Total
                          </th>
                          <th className="px-2 py-1.5 text-left font-semibold">
                            Fecha Venc.
                          </th>
                          <th className="px-2 py-1.5 text-center font-semibold">
                            Nro. Recibo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalle.cuotas.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-3 py-4 text-center text-slate-500"
                            >
                              El convenio no registra cuotas.
                            </td>
                          </tr>
                        ) : (
                          detalle.cuotas.map((c, idx) => (
                            <tr
                              key={`${c.periodo}-${idx}`}
                              className="border-t border-slate-100 hover:bg-slate-50"
                            >
                              <td className="px-2 py-1 text-center text-slate-800">
                                {c.periodo}
                              </td>
                              <td className="px-2 py-1 text-right text-slate-800">
                                {fmtMonto(c.importe)}
                              </td>
                              <td className="px-2 py-1 text-right text-slate-800">
                                {fmtMonto(c.reajuste)}
                              </td>
                              <td className="px-2 py-1 text-right text-slate-800">
                                {fmtMonto(c.total)}
                              </td>
                              <td className="px-2 py-1 text-slate-800">
                                {c.fechaVenc}
                              </td>
                              <td className="px-2 py-1 text-center text-slate-800">
                                {c.nroRecibo}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje de éxito (p. ej. resolución generada) */}
            {message && (
              <p className="mt-3 text-[11px] font-medium text-emerald-700">
                {message}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2">
            <div className="min-w-0 flex-1">
              {error && <p className="text-[10px] text-red-600">{error}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setConfirmarAnular(true)}
                disabled={!detalle || btnAnularDisabled}
                title={
                  btnAnularDisabled
                    ? "No disponible para el estado actual del convenio."
                    : "Anula el convenio (acción irreversible)."
                }
                className="rounded border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anular Convenio
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Resolución (vista previa + PDF) ══ */}
      <ReporteViewerModal
        isOpen={reporteHtml !== null}
        onClose={() => {
          setReporteHtml(null);
          setReportePdf(null);
        }}
        html={reporteHtml ?? ""}
        pdfConfig={reportePdf}
      />

      {/* ══ Confirmación de anulación ══ */}
      <ConfirmDialog
        isOpen={confirmarAnular}
        title="Anular Convenio"
        message={`¿Está seguro de anular el convenio ${convenio ?? ""}? Esta acción es irreversible.`}
        confirmLabel="Sí, anular"
        cancelLabel="No"
        loading={anulando}
        onConfirm={() => void handleAnularConvenio()}
        onCancel={() => {
          if (!anulando) setConfirmarAnular(false);
        }}
      />

      {/* ══ Confirmación de anulación sin cargos ══ */}
      <ConfirmDialog
        isOpen={confirmarAnularSc}
        title="Anular Convenio S/C"
        message={`¿Está seguro de anular sin cargos el convenio ${convenio ?? ""}? Esta acción es irreversible.`}
        confirmLabel="Sí, anular"
        cancelLabel="No"
        loading={anulandoSc}
        onConfirm={() => void handleAnularConvenioSc()}
        onCancel={() => {
          if (!anulandoSc) setConfirmarAnularSc(false);
        }}
      />
    </>
  );
}

function Field({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: string;
  align?: "left" | "right";
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-medium text-slate-600">{label}</span>
      <span className={align === "right" ? "text-right text-slate-800" : "text-slate-800"}>
        {value}
      </span>
    </div>
  );
}