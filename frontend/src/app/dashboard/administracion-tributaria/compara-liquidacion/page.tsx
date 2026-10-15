"use client";

import { Scale } from "lucide-react";
import { ComparacionPanel } from "./liquidacion-panel";

// ─── Main Page ────────────────────────────────────────────

export default function ComparaLiquidacionPage() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        {/* Dot pattern overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 0.5px, transparent 0.5px)", backgroundSize: "16px 16px" }}
        />
        {/* Gloss flare */}
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <Scale size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Comparación de Liquidaciones
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Consulte y compare dos liquidaciones lado a lado: cabecera y detalle por secuencia
            </p>
          </div>
        </div>
      </div>

      {/* Dos paneles independientes, uno junto al otro (apilados en pantallas angostas) */}
      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <ComparacionPanel titulo="Liquidación A" testIdPrefix="a" />
        <ComparacionPanel titulo="Liquidación B" testIdPrefix="b" />
      </div>
    </div>
  );
}
