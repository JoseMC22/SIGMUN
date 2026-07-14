"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ValoresErrorBoundary({ error, reset }: Props) {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <AlertCircle size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Gestión de Valores
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Administración de valores vehiculares
            </p>
          </div>
        </div>
      </div>

      {/* Error state */}
      <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-16 animate-fade-in">
        <div className="mb-3 rounded-full bg-red-100 p-3">
          <AlertCircle size={24} className="text-red-400" />
        </div>
        <p className="text-sm font-medium text-red-600">
          Ocurrió un error inesperado al cargar la página.
        </p>
        <p className="mt-1 text-xs text-red-400 max-w-md text-center">
          {error.message || "Error de conexión con el servidor."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40"
        >
          <RotateCcw size={13} />
          Reintentar
        </button>
      </div>
    </div>
  );
}
