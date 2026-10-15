"use client";

import { useCallback, useState } from "react";
import { Scale, FileDown, Loader2 } from "lucide-react";
import { ComparacionPanel } from "./liquidacion-panel";
import { generarComparaLiquidacionPdf, type PanelExportData } from "./compara-liquidacion-pdf";

// ─── Main Page ────────────────────────────────────────────

export default function ComparaLiquidacionPage() {
  // Cada panel informa su resultado cargado (o null) para el exportador.
  const [paneles, setPaneles] = useState<[PanelExportData | null, PanelExportData | null]>([
    null,
    null,
  ]);
  const [exporting, setExporting] = useState(false);

  const handleExportar = useCallback(async () => {
    if (!paneles.some(Boolean)) return;
    setExporting(true);
    try {
      await generarComparaLiquidacionPdf([
        paneles[0] ?? { titulo: "Liquidación A", cabecera: null, detalle: [] },
        paneles[1] ?? { titulo: "Liquidación B", cabecera: null, detalle: [] },
      ]);
    } catch {
      // La descarga es best-effort: no interrumpe la comparación en pantalla.
    } finally {
      setExporting(false);
    }
  }, [paneles]);

  const hayResultados = paneles.some(Boolean);

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
          <button
            type="button"
            onClick={handleExportar}
            disabled={!hayResultados || exporting}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3.5 py-2 text-xs font-medium text-white ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <FileDown size={14} />
                Exportar a PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dos paneles independientes, uno junto al otro (apilados en pantallas angostas) */}
      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <ComparacionPanel
          titulo="Liquidación A"
          testIdPrefix="a"
          onLoadedData={(data) =>
            setPaneles(([, b]) => [data, b] as [PanelExportData | null, PanelExportData | null])
          }
        />
        <ComparacionPanel
          titulo="Liquidación B"
          testIdPrefix="b"
          onLoadedData={(data) =>
            setPaneles(([a]) => [a, data] as [PanelExportData | null, PanelExportData | null])
          }
        />
      </div>
    </div>
  );
}
