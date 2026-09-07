import { FileWarning } from "lucide-react";

export default function ListadoInfraccionesLoading() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 0.5px, transparent 0.5px)", backgroundSize: "16px 16px" }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <FileWarning size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Listado de Infracciones
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Papeleta Tránsito — Consulta de infracciones viajeras
            </p>
          </div>
        </div>
      </div>

      {/* Skeleton filters */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
          <div className="h-2.5 bg-slate-200 rounded w-24" />
        </div>
        <div className="p-2.5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="md:col-span-2 animate-pulse">
                <div className="h-2 bg-slate-200 rounded w-12 mb-1" />
                <div className="h-8 bg-slate-100 rounded" />
              </div>
            ))}
            <div className="md:col-span-12 flex gap-2 animate-pulse">
              <div className="h-8 bg-sat-cyan/30 rounded w-20" />
              <div className="h-8 bg-slate-200 rounded w-16" />
            </div>
          </div>
        </div>
      </div>

      {/* Skeleton table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="animate-pulse">
          <div className="bg-slate-100 border-b border-slate-200 px-3 py-2.5">
            <div className="grid grid-cols-10 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-3 bg-slate-200 rounded w-3/4" />
              ))}
            </div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`px-3 py-3 border-b border-slate-100 ${i === 4 ? "border-b-0" : ""}`}>
              <div className="grid grid-cols-10 gap-4">
                {[...Array(10)].map((_, j) => (
                  <div key={j} className="h-3.5 bg-slate-100 rounded" style={{ width: "80%" }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
