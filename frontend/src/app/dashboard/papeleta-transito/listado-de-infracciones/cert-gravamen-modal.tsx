"use client";

import { useState } from "react";
import { X, FileText, Stamp, Loader2 } from "lucide-react";
import {
  generarNoAdeudoAction,
  generarGravamenAction,
} from "@/actions/papeleta-transito/acciones-infraccion";

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
  const [nroReciboGrav, setNroReciboGrav] = useState("");
  const [loadingCert, setLoadingCert] = useState(false);
  const [loadingGrav, setLoadingGrav] = useState(false);

  if (!isOpen || !ninfrac) return null;

  const reportBaseUrl = process.env.NEXT_PUBLIC_REPORT_URL ?? "";

  const tieneDeudaCert = Number(noadeudo) > 0;
  const tieneDeudaGrav = Number(gravamen) > 0;

  const handleGenerarCertificado = async () => {
    if (!nroReciboCert.trim()) {
      alert("Ingrese el Número de Recibo");
      return;
    }
    if (!reportBaseUrl) {
      alert("URL del servidor de reportes no configurada.");
      return;
    }

    setLoadingCert(true);
    try {
      const res = await generarNoAdeudoAction({
        ninfrac,
        numingr: nroReciboCert.trim(),
        operador: usuario || "ESTACION/ADMIN",
      });

      if (!res.success) {
        alert(res.error || "Error al registrar certificado de no adeudo.");
        return;
      }

      const params = `schema=&tipo=pdf&nombrereporte=rpt_CertificadoNoAdeudo_pape&param=buscar^2|infracc^${ninfrac}|recibo^${nroReciboCert.trim()}|usuario^${usuario || "ESTACION/ADMIN"}`;
      const url = `${reportBaseUrl}?${params}`;
      window.open(url, "_blank", "width=700,height=600,scrollbars=yes");
    } catch {
      alert("Error al abrir el reporte de certificado.");
    } finally {
      setLoadingCert(false);
    }
  };

  const handleGenerarGravamen = async () => {
    if (!nroReciboGrav.trim()) {
      alert("Ingrese el Número de Recibo");
      return;
    }
    if (!reportBaseUrl) {
      alert("URL del servidor de reportes no configurada.");
      return;
    }

    setLoadingGrav(true);
    try {
      const res = await generarGravamenAction({
        ninfrac,
        numingr: nroReciboGrav.trim(),
        operador: usuario || "ESTACION/ADMIN",
      });

      if (res.success && (res.data === "TRUE" || res.message === "TRUE")) {
        const params = `schema=&tipo=pdf&nombrereporte=rpt_Certificadogravamen_pape&param=buscar^2|infracc^${ninfrac}|recibo^${nroReciboGrav.trim()}|usuario^${usuario || "ESTACION/ADMIN"}`;
        const url = `${reportBaseUrl}?${params}`;
        window.open(url, "_blank", "width=700,height=600,scrollbars=yes");
      } else {
        alert(res.message || res.error || "El recibo no está registrado");
      }
    } catch {
      alert("Error al procesar el gravamen.");
    } finally {
      setLoadingGrav(false);
    }
  };

  return (
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
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs uppercase focus:border-blue-500 focus:outline-none bg-white"
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
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs uppercase focus:border-blue-500 focus:outline-none bg-white"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerarGravamen}
              disabled={loadingGrav || tieneDeudaGrav}
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
  );
}
