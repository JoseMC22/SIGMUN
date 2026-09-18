"use client";

import { X, Download, FileText, ExternalLink } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName?: string;
}

export function FileViewerModal({ isOpen, onClose, fileUrl, fileName = "Documento Adjunto" }: Props) {
  if (!isOpen || !fileUrl) return null;

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl || fileName);
  const isPdf = /\.pdf$/i.test(fileUrl || fileName) || !isImage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex h-[85vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-700/20">
        {/* Cabecera del Visor */}
        <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy to-slate-800 px-5 py-3 text-white">
          <div className="flex items-center gap-2 truncate pr-4">
            <FileText size={18} className="text-sat-cyan shrink-0" />
            <span className="font-bold text-sm tracking-tight truncate font-outfit" title={fileName}>
              {fileName}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20 transition"
              title="Abrir en pestaña nueva"
            >
              <ExternalLink size={13} />
              <span>Abrir Fuera</span>
            </a>
            <a
              href={fileUrl}
              download={fileName}
              className="inline-flex items-center gap-1 rounded bg-sat-cyan px-3 py-1 text-xs font-bold text-white hover:bg-cyan-600 transition shadow-xs"
              title="Descargar archivo"
            >
              <Download size={13} />
              <span>Descargar</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white transition ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Cuerpo del Visor */}
        <div className="flex-1 bg-slate-100 flex items-center justify-center p-2 overflow-auto">
          {isImage ? (
            <img
              src={fileUrl}
              alt={fileName}
              className="max-h-full max-w-full object-contain rounded shadow-md"
            />
          ) : isPdf ? (
            <iframe
              src={`${fileUrl}#toolbar=1`}
              title={fileName}
              className="h-full w-full rounded border-0 bg-white"
            />
          ) : (
            <div className="text-center space-y-3 p-6 bg-white rounded-lg shadow-sm border border-slate-200">
              <FileText size={48} className="mx-auto text-sat-cyan animate-pulse" />
              <p className="text-sm font-bold text-slate-700">Este tipo de archivo no admite vista previa en vivo.</p>
              <a
                href={fileUrl}
                download={fileName}
                className="inline-flex items-center gap-1.5 rounded bg-sat-navy px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                <Download size={14} /> Descargar Archivo para Visualizar
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
