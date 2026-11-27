"use client";

import { useEffect, useRef, useState } from "react";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";
import { X, Printer, Download, Loader2 } from "lucide-react";
import {
  descargarPdfDesdeHtml,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";

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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen) rootRef.current?.focus();
  }, [isOpen]);

  // Escape cierra SOLO este modal si es el tope de la pila.
  const modalId = useModalStack(isOpen);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopModal(modalId)) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, modalId, onClose]);

  const guardarPdf = async () => {
    if (!pdfConfig || !html) return;
    setGuardando(true);
    setError(null);
    try {
      await descargarPdfDesdeHtml(html, pdfConfig.filename, pdfConfig.orientacion);
    } catch {
      setError("No se pudo generar el PDF. Intente nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current) {
      // Enfocar el iframe y disparar print
      iframeRef.current.contentWindow?.focus();
      iframeRef.current.contentWindow?.print();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[100] flex flex-col bg-slate-100 animate-fade-in"
      tabIndex={-1}
    >
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
            onClick={handlePrint}
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

      {/* ── Body: vista previa del reporte via iframe (impresión multi-página nativa) ── */}
      <div className="flex-1 overflow-hidden p-6">
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600">
            {error}
          </div>
        )}
        <iframe
          ref={iframeRef}
          srcDoc={html}
          title="Vista Previa del Reporte"
          className="w-full h-full border-0 bg-white"
          style={{ minHeight: "600px" }}
        />
      </div>
    </div>
  );
}