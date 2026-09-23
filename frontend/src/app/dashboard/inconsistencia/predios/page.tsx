import { AlertCircle, FileWarning } from "lucide-react";

export default function InconsistenciaPrediosPage() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 0.5px, transparent 0.5px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <FileWarning size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Inconsistencia de Predios
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Reporte de inconsistencias de predios
            </p>
          </div>
        </div>
      </div>

      {/* Scaffold placeholder — real filters/table arrive with business details */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
        <AlertCircle size={14} />
        <span className="font-medium">
          Módulo en construcción: pendiente la definición del reporte (SP,
          filtros y columnas).
        </span>
      </div>
    </div>
  );
}
