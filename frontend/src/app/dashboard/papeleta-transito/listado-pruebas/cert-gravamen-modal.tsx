"use client";

import { useState } from "react";
import { X, FileText, Stamp, Loader2 } from "lucide-react";
import {
  generarNoAdeudoAction,
  generarGravamenAction,
} from "@/actions/papeleta-transito/acciones-infraccion";
import {
  obtenerDatosReporteCertificadoAction,
  obtenerDatosReporteGravamenAction,
} from "@/actions/papeleta-transito/listado-de-infracciones";
import {
  obtenerPlantillaCertificadoAction,
  obtenerPlantillaGravamenAction,
} from "@/actions/papeleta-transito/reportes-infracciones";
import {
  construirHtmlReporteCertificado,
  construirConfigPdfCertificado,
} from "./reportes/Certificado/reporte-certificado";
import {
  construirHtmlReporteGravamen,
  construirConfigPdfGravamen,
} from "./reportes/Gravamen/reporte-gravamen";
import type { ReportePdfConfig } from "@/lib/reportes/reporte-service";
import ReporteViewerModal from "@/components/reportes/reporte-viewer-modal";

interface Props {
  isOpen: boolean;
  ninfrac: string | null;
  usuario?: string;
  noadeudo?: string;
  gravamen?: string;
  onClose: () => void;
}

export default function CertGravamenModal({
  isOpen,
  ninfrac,
  usuario = "",
  noadeudo = "",
  gravamen = "",
  onClose,
}: Props) {
  const [nroReciboCert, setNroReciboCert] = useState("");
  // Pre-fill gravamen recibo with the same value used for certificado (legacy behavior)
  const [nroReciboGrav, setNroReciboGrav] = useState("");
  const [loadingCert, setLoadingCert] = useState(false);
  const [loadingGrav, setLoadingGrav] = useState(false);

  // ── Reporte viewer state ──────────────────────────────────
  const [reporteHtml, setReporteHtml] = useState<string | null>(null);
  const [reportePdf, setReportePdf] = useState<ReportePdfConfig | null>(null);

  if (!isOpen || !ninfrac) return null;

  const tieneDeudaCert = Number(noadeudo) > 0;
  const tieneDeudaGrav = Number(gravamen) > 0;

  const handleGenerarCertificado = async () => {
    if (!nroReciboCert.trim()) {
      alert("Ingrese el Número de Recibo");
      return;
    }
    // Mirror to gravamen field if empty (same behavior as legacy system)
    if (!nroReciboGrav.trim()) {
      setNroReciboGrav(nroReciboCert.trim());
    }

    setLoadingCert(true);
    try {
      // Paso 1: registrar el certificado en BD (@buscar=1)
      const res = await generarNoAdeudoAction({
        ninfrac,
        numingr: nroReciboCert.trim(),
        operador: usuario || "ESTACION/ADMIN",
      });

      if (!res.success) {
        alert(res.error || "Error al registrar certificado de no adeudo.");
        return;
      }

      // Paso 2: obtener datos estructurados (@buscar=2) + plantilla
      const [plantilla, datosRes] = await Promise.all([
        obtenerPlantillaCertificadoAction(),
        obtenerDatosReporteCertificadoAction({
          ninfrac,
          numingr: nroReciboCert.trim(),
          operador: usuario || "ESTACION/ADMIN",
        }),
      ]);

      if (!plantilla.success) {
        alert(`Error al cargar plantilla: ${plantilla.error}`);
        return;
      }
      if (!datosRes.success) {
        alert(`Error al obtener datos del reporte: ${datosRes.error}`);
        return;
      }

      const d = datosRes.data ?? {};
      setReporteHtml(
        construirHtmlReporteCertificado(
          {
            certNro: d.cert_nro ?? "-",
            nombreInfractor: d.nombre ?? "-",
            numDoc: d.doc ?? "-",
            licencia: d.licencia ?? "-",
            direccion: d.domicilio ?? "-",
            numRecibo: d.num_ingr ?? nroReciboCert.trim(),
            fechaExpedicion: d.fecha ?? new Date().toLocaleDateString("es-PE"),
            usuario: (d.USU_REG ?? usuario) || "SISTEMA",
            hora: d.hora ?? new Date().toLocaleTimeString("es-PE"),
          },
          plantilla.data,
        ),
      );
      setReportePdf(
        construirConfigPdfCertificado({
          certNro: d.cert_nro ?? "-",
          nombreInfractor: d.nombre ?? "-",
          numDoc: d.doc ?? "-",
          licencia: d.licencia ?? "-",
          direccion: d.domicilio ?? "-",
          numRecibo: d.num_ingr ?? nroReciboCert.trim(),
        }),
      );
    } catch {
      alert("Error al generar el reporte de Certificado de No Adeudo.");
    } finally {
      setLoadingCert(false);
    }
  };

  const handleGenerarGravamen = async () => {
    if (!nroReciboGrav.trim()) {
      alert("Ingrese el Número de Recibo");
      return;
    }

    setLoadingGrav(true);
    try {
      // Paso 1: registrar el gravamen en BD (@buscar=1)
      const res = await generarGravamenAction({
        ninfrac,
        numingr: nroReciboGrav.trim(),
        operador: usuario || "ESTACION/ADMIN",
      });

      if (!(res.success && (res.data === "TRUE" || res.message === "TRUE"))) {
        alert(res.message || res.error || "El recibo no está registrado");
        return;
      }

      // Paso 2: obtener datos estructurados (@buscar=2) + plantilla
      const [plantilla, datosRes] = await Promise.all([
        obtenerPlantillaGravamenAction(),
        obtenerDatosReporteGravamenAction({
          ninfrac,
          numingr: nroReciboGrav.trim(),
          operador: usuario || "ESTACION/ADMIN",
        }),
      ]);

      if (!plantilla.success) {
        alert(`Error al cargar plantilla: ${plantilla.error}`);
        return;
      }
      if (!datosRes.success) {
        alert(`Error al obtener datos del reporte: ${datosRes.error}`);
        return;
      }

      // SP buscar=2 returns a single header row: placa, nro (doc), num_ingr (recibo), fecha, hora, USU_REG
      const rows: any[] = Array.isArray(datosRes.data) ? datosRes.data : (datosRes.data ? [datosRes.data] : []);
      const row0 = rows[0] ?? {};

      setReporteHtml(
        construirHtmlReporteGravamen(
          {
            placa: String(row0.placa ?? "-"),
            numRecibo: String(row0.num_ingr ?? nroReciboGrav.trim()),
            nroDocumento: String(row0.nro ?? "-"),
            usuario: String(row0.USU_REG ?? usuario ?? "SISTEMA"),
            fecha: String(row0.fecha ?? new Date().toLocaleDateString("es-PE")),
            hora: String(row0.hora ?? ""),
            sinDatos: rows.length === 0,
          },
          plantilla.data,
        ),
      );
      setReportePdf(
        construirConfigPdfGravamen({
          placa: String(row0.placa ?? "-"),
          numRecibo: String(row0.num_ingr ?? nroReciboGrav.trim()),
          nroDocumento: String(row0.nro ?? "-"),
          usuario: String(row0.USU_REG ?? usuario ?? "SISTEMA"),
          fecha: String(row0.fecha ?? ""),
        }),
      );
    } catch {
      alert("Error al procesar el gravamen.");
    } finally {
      setLoadingGrav(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-3 text-white">
            <span className="text-sm font-semibold tracking-tight">
              Generar Certificado / Gravamen
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Infracción:</span>
              <span className="font-bold text-slate-800 font-mono text-sm">
                {ninfrac}
              </span>
            </div>

            {/* Seccion Certificado */}
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Certificado:</span>
                {tieneDeudaCert && (
                  <span className="font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded text-[11px]">
                    Tiene Deuda
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="text-slate-600 shrink-0">N° de Recibo:</label>
                <input
                  type="text"
                  value={nroReciboCert}
                  onChange={(e) => setNroReciboCert(e.target.value.toUpperCase())}
                  placeholder="Ingrese recibo"
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 font-semibold placeholder:text-slate-400 uppercase focus:border-blue-500 focus:outline-none bg-white"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerarCertificado}
                disabled={loadingCert}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingCert ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FileText size={14} />
                )}
                Imprimir Certificado
              </button>
            </div>

            {/* Seccion Gravamen */}
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Gravamen:</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-slate-600 shrink-0">N° de Recibo:</label>
                <input
                  type="text"
                  value={nroReciboGrav}
                  onChange={(e) => setNroReciboGrav(e.target.value.toUpperCase())}
                  placeholder="Ingrese recibo"
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 font-semibold placeholder:text-slate-400 uppercase focus:border-blue-500 focus:outline-none bg-white"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerarGravamen}
                disabled={loadingGrav}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingGrav ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Stamp size={14} />
                )}
                Imprimir Gravamen
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end border-t border-slate-200 px-4 py-2.5 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 shadow-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* ── Reporte viewer (Certificado / Gravamen) ── */}
      <ReporteViewerModal
        isOpen={reporteHtml !== null}
        onClose={() => {
          setReporteHtml(null);
          setReportePdf(null);
        }}
        html={reporteHtml ?? ""}
        pdfConfig={reportePdf}
      />
    </>
  );
}
