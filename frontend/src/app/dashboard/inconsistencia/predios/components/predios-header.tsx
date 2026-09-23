"use client";

import { FileWarning } from "lucide-react";

/** Encabezado de la pantalla con el gradiente SAT. */
export function PrediosHeader() {
  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #fff 0.5px, transparent 0.5px)",
          backgroundSize: "16px 16px",
        }}
      />
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 ring-1 ring-white/10 backdrop-blur-sm">
          <FileWarning
            size={18}
            className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
          />
        </div>
        <div>
          <h1 className="font-outfit text-lg font-bold tracking-tight text-white">
            Inconsistencia de Predios
          </h1>
          <p className="font-inter text-xs text-white/50">
            Consulta de predios con diferencias entre padrón y declaración
          </p>
        </div>
      </div>
    </div>
  );
}
