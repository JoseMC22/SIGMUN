"use client";

import { useState, useRef } from "react";
import { FileText, CheckCircle, X, Loader2, Paperclip } from "lucide-react";
import { uploadArchivoNasAction } from "@/actions/storage";

interface Props {
  onUploadSuccess: (data: { cNombreArchivo: string; cRutaArchivo: string; cUrl?: string }) => void;
  onRemove?: () => void;
  accept?: string;
  label?: string;
  currentFileName?: string;
  cCodificacion?: string;
  oficina?: string;
}

export function FileUploaderNAS({
  onUploadSuccess,
  onRemove,
  accept = ".pdf,.doc,.docx",
  label = "Adjuntar Informe / Documento de Respaldo",
  currentFileName,
  cCodificacion,
  oficina,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(currentFileName || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validación de formato: solo PDF o Word
    const fileName = file.name.toLowerCase();
    const isValidFormat = fileName.endsWith(".pdf") || fileName.endsWith(".doc") || fileName.endsWith(".docx");
    if (!isValidFormat) {
      setError("Formato no permitido. Solo se aceptan archivos PDF o Word (.pdf, .doc, .docx).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validación de tamaño máximo (500 MB)
    const MAX_SIZE_MB = 500;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setError(`El archivo excede el tamaño máximo permitido de ${MAX_SIZE_MB} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (cCodificacion) formData.append("cCodificacion", cCodificacion);
      if (oficina) formData.append("oficina", oficina);

      const res = await uploadArchivoNasAction(formData);

      if (res.success && res.cNombreArchivo && res.cRutaArchivo) {
        setUploadedName(res.cNombreArchivo);
        onUploadSuccess({
          cNombreArchivo: res.cNombreArchivo,
          cRutaArchivo: res.cRutaArchivo,
          cUrl: res.cUrl,
        });
      } else {
        setError(res.error || "Error al subir el archivo.");
      }
    } catch {
      setError("Error inesperado al intentar cargar el archivo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClear = () => {
    setUploadedName(null);
    setError(null);
    if (onRemove) onRemove();
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </label>
      )}

      {uploadedName ? (
        <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs transition">
          <div className="flex items-center gap-2 truncate">
            <FileText size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold text-emerald-900 truncate" title={uploadedName}>
              {uploadedName}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
              <CheckCircle size={10} /> Adjuntado al NAS
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-rose-600 transition rounded"
            title="Quitar archivo adjunto"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            id="nas-file-input"
          />
          <label
            htmlFor="nas-file-input"
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-xs font-semibold transition ${
              uploading
                ? "border-slate-300 bg-slate-50 text-slate-400 cursor-not-allowed"
                : "border-slate-300 bg-white text-slate-600 hover:border-sat-cyan hover:bg-slate-50/80 hover:text-sat-navy"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin text-sat-cyan" />
                <span>Subiendo archivo al servidor NAS...</span>
              </>
            ) : (
              <>
                <Paperclip size={15} className="text-sat-cyan" />
                <span>Seleccionar o arrastrar archivo (PDF, Word - Máx. 500 MB)</span>
              </>
            )}
          </label>
        </div>
      )}

      {error && <p className="text-[10px] font-medium text-rose-600">{error}</p>}
    </div>
  );
}
