"use client";

import { useEffect, useRef, useState } from "react";
import { X, Printer, Download, Loader2 } from "lucide-react";
import {
  generarPdf,
  descargarPdf,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";

// CSS que aísla SOLO el contenido del reporte (#reporte-print) al imprimir,
// ocultando el resto de la aplicación (dashboard + modal).
const PRINT_CSS = `
@media print {
  body * {
    visibility: hidden !important;
  }
  #reporte-print,
  #reporte-print * {
    visibility: visible !important;
  }
  #reporte-print {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    max-height: none !important;
    overflow: visible !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    border: none !important;
  }
}
`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** HTML del reporte ya llenado (con CSS inline). */
  html: string;
  /** Configuración del PDF para "Guardar en la PC". null deshabilita el botón. */
  pdfConfig: ReportePdfConfig | null;
}

export default function ReporteViewerModal({ isOpen, onClose, html, pdfConfig }: Props) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) rootRef.current?.focus();
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  };

  const guardarPdf = () => {
    if (!pdfConfig) return;
    setGuardando(true);
    setError(null);
    try {
      const doc = generarPdf(pdfConfig);
      descargarPdf(doc, pdfConfig.filename);
    } catch {
      setError("No se pudo generar el PDF. Intente nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[100] flex flex-col bg-slate-100 animate-fade-in"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <style>{PRINT_CSS}</style>

      {/* ── Header ── */}
      <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
          <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
            Vista Previa del Reporte
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
          >
            <Printer size={13} />
            Imprimir
          </button>
          <button
            type="button"
            onClick={guardarPdf}
            disabled={!pdfConfig || guardando}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Download size={13} />
                Guardar en la PC
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Body: vista previa del reporte ── */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600">
            {error}
          </div>
        )}
        <div
          id="reporte-print"
          className="mx-auto max-w-[210mm] bg-white p-6 shadow-lg text-slate-800"
          style={{ colorScheme: "light" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
