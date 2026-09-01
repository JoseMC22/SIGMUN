"use client";

import { useState } from "react";
import { X, Printer, AlertTriangle } from "lucide-react";
import { generarGravamenSinPlacaAction } from "@/actions/papeleta-transito/acciones-infraccion";
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
import ReporteViewerModal from "@/components/reportes/reporte-viewer-modal";

interface Props {
  isOpen: boolean;
  placa: string;
  valorGravamen: string; // "0" u otro valor que retorna el SP
  onClose: () => void;
}

export default function CertGravamenSinPlacaModal({ isOpen, placa, valorGravamen, onClose }: Props) {
  const [nroRecibo, setNroRecibo] = useState("");
  const [loading, setLoading] = useState(false);
  const [reporteHtml, setReporteHtml] = useState<string | null>(null);
  const [reportePdf, setReportePdf] = useState<any>(null);

  if (!isOpen) return null;

  const yaRegistrado = Number(valorGravamen?.trim()) > 0;
  const tieneDeuda = yaRegistrado; // alias for the warning label
  const reportBaseUrl = process.env.NEXT_PUBLIC_REPORT_URL ?? "";

  const handleImprimirGeneraGravamen = async () => {
    const recibo = nroRecibo.trim();
    if (!recibo) {
      alert("ℹ️ Ingrese el Número de Recibo.");
      return;
    }
    setLoading(true);
    try {
      const res = await generarGravamenSinPlacaAction(placa, recibo, "ESTACION/ADMIN");
      if (res.success && res.data === "TRUE") {
        const plantilla = await obtenerPlantillaGravamenAction();
        if (!plantilla.success) {
          alert(`Error al cargar plantilla: ${plantilla.error}`);
          return;
        }
        const html = construirHtmlReporteGravamen(
          {
            placa,
            numRecibo: recibo,
            nroDocumento: "-",
            usuario: "ADMIN",
            sinDatos: true,
          },
          plantilla.data
        );
        setReporteHtml(html);
        setReportePdf(
          construirConfigPdfGravamen({
            placa,
            numRecibo: recibo,
            nroDocumento: "-",
            usuario: "ADMIN",
          })
        );
      } else {
        alert(res.message || "Error al generar gravamen.");
      }
    } catch {
      alert("❌ Error de conexión al generar el gravamen.");
    } finally {
      setLoading(false);
    }
  };

  const handleImprimirCertificado = async () => {
    if (!nroRecibo.trim()) {
      alert("ℹ️ Ingrese el Número de Recibo.");
      return;
    }
    try {
      const plantilla = await obtenerPlantillaCertificadoAction();
      if (!plantilla.success) {
        alert(`Error al cargar plantilla: ${plantilla.error}`);
        return;
      }
      const html = construirHtmlReporteCertificado(
        {
          certNro: "-",
          nombreInfractor: "GENERAL",
          numDoc: "-",
          licencia: "-",
          direccion: "-",
          numRecibo: nroRecibo.trim(),
          hora: new Date().toLocaleTimeString("es-PE"),
          estacion: "ESTACION",
          fechaExpedicion: new Date().toLocaleDateString("es-PE"),
          usuario: "SISTEMA",
        },
        plantilla.data
      );
      setReporteHtml(html);
      setReportePdf(
        construirConfigPdfCertificado({
          certNro: "-",
          nombreInfractor: "GENERAL",
          numDoc: "-",
          licencia: "-",
          direccion: "-",
          numRecibo: nroRecibo.trim(),
          hora: new Date().toLocaleTimeString("es-PE"),
          estacion: "ESTACION",
          fechaExpedicion: new Date().toLocaleDateString("es-PE"),
          usuario: "SISTEMA",
        })
      );
    } catch {
      alert("Error al cargar certificado.");
    }
  };

  const handleImprimirGravamen = async () => {
    if (!nroRecibo.trim()) {
      alert("ℹ️ Ingrese el Número de Recibo.");
      return;
    }
    try {
      const plantilla = await obtenerPlantillaGravamenAction();
      if (!plantilla.success) {
        alert(`Error al cargar plantilla: ${plantilla.error}`);
        return;
      }
      const html = construirHtmlReporteGravamen(
        {
          placa,
          numRecibo: nroRecibo.trim(),
          nroDocumento: "-",
          usuario: "ADMIN",
          sinDatos: true,
        },
        plantilla.data
      );
      setReporteHtml(html);
      setReportePdf(
        construirConfigPdfGravamen({
          placa,
          numRecibo: nroRecibo.trim(),
          nroDocumento: "-",
          usuario: "ADMIN",
        })
      );
    } catch {
      alert("Error al cargar gravamen.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5 text-white">
          <span className="text-xs font-bold tracking-tight">Generar Gravamen</span>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-white/10 text-white/70 hover:text-white transition">
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="rounded-md bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-600">Gravamen:</span>
              <span className="font-mono text-slate-800 font-bold">{valorGravamen}</span>
            </div>

            {tieneDeuda && (
              <div className="flex items-center gap-1.5 text-red-600 font-bold bg-red-50 border border-red-200 p-2 rounded">
                <AlertTriangle size={16} />
                <span>Tiene Gravamen Registrado — no se puede generar otro</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <label htmlFor="txtnrorecibo1" className="font-semibold text-sat-navy shrink-0">N° de Recibo:</label>
              <input
                id="txtnrorecibo1"
                type="text"
                value={nroRecibo}
                onChange={(e) => setNroRecibo(e.target.value.toUpperCase())}
                placeholder="Ej. 056080603"
                className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono uppercase text-slate-900 font-bold bg-white focus:border-sat-cyan focus:outline-none focus:ring-1 focus:ring-sat-cyan"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2">
            <button
              type="button"
              onClick={handleImprimirGeneraGravamen}
              disabled={yaRegistrado || loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-sat-navy bg-sat-navy px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[#1b2b4a] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer size={14} />
              Imprimir/+Gravamen
            </button>

            <button
              type="button"
              onClick={handleImprimirCertificado}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <Printer size={14} />
              Imprimir Certificado
            </button>

            <button
              type="button"
              onClick={handleImprimirGravamen}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <Printer size={14} />
              Imprimir Gravamen
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 px-4 py-2.5 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* ── Reporte viewer ── */}
      <ReporteViewerModal
        isOpen={reporteHtml !== null}
        onClose={() => {
          setReporteHtml(null);
          setReportePdf(null);
        }}
        html={reporteHtml ?? ""}
        pdfConfig={reportePdf}
      />
    </div>
  );
}
