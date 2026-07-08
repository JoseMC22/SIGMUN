import { DollarSign, Loader2 } from "lucide-react";

export default function ValoresLoading() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 0.5px, transparent 0.5px)", backgroundSize: "16px 16px" }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <DollarSign size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
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

      {/* Skeleton */}
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
                  <div key={j} className="h-3.5 bg-slate-100 rounded" style={{ width: j === 0 ? "60%" : j === 6 ? "40%" : "80%" }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
