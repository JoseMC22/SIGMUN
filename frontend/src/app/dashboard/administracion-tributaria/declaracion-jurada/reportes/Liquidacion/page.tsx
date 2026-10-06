'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Printer } from 'lucide-react';
import { getLiquidacionReporteAction } from '@/actions/administracion-tributaria/declaracion-jurada';
import { obtenerPlantillaReporteLiquidacionAction } from '@/actions/administracion-tributaria/reporte-liquidacion';
import { construirHtmlReporteLiquidacion } from './reporte-liquidacion';

export default function LiquidacionReportePage() {
  const searchParams = useSearchParams();
  const idliqui = searchParams.get('idliqui') ?? '';
  const nliqui = searchParams.get('nliqui') ?? '';
  const codigo = searchParams.get('codigo') ?? '';

  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!idliqui) {
      setError('Falta el parámetro idliqui.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const [dataResult, plantillaResult] = await Promise.all([
        getLiquidacionReporteAction(idliqui),
        obtenerPlantillaReporteLiquidacionAction(),
      ]);

      if (cancelled) return;

      if (!dataResult.success) {
        setError(dataResult.error);
        setLoading(false);
        return;
      }
      if (!plantillaResult.success) {
        setError(plantillaResult.error);
        setLoading(false);
        return;
      }

      const built = construirHtmlReporteLiquidacion(
        dataResult.data,
        plantillaResult.data,
      );
      setHtml(built);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [idliqui]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          Cargando liquidación...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print button bar */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
        <span className="text-xs font-medium text-slate-500">
          Liquidación {nliqui || idliqui}
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded bg-sat-cyan px-3 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 active:scale-[0.98]"
        >
          <Printer size={12} />
          Imprimir
        </button>
      </div>

      {/* Report iframe */}
      {html && (
        <iframe
          srcDoc={html}
          title={`Liquidación ${nliqui}`}
          className="h-[calc(100vh-40px)] w-full border-0"
        />
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          iframe { height: 100vh !important; }
        }
      `}</style>
    </div>
  );
}
