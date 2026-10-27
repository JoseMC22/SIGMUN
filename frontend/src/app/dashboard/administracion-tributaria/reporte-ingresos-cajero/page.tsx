"use client";

import { useState } from "react";
import {
  Search,
  Printer,
  FileSpreadsheet,
  Loader2,
  Receipt,
  SearchX,
  AlertCircle,
  Users,
} from "lucide-react";
import {
  searchReporteIngresosCajeroAction,
  type ReporteIngresosCajeroRow,
} from "@/actions/administracion-tributaria/reporte-ingresos-cajero";
import { exportReporteIngresosCajeroExcel } from "./export-excel";
import ReporteViewerModal from "@/components/reportes/reporte-viewer-modal";
import type { ReportePdfConfig } from "@/lib/reportes/reporte-service";

export default function ReporteIngresosCajeroPage() {
  const hoy = new Date().toISOString().split("T")[0];

  // Filtros
  const [desde, setDesde] = useState<string>(hoy);
  const [hasta, setHasta] = useState<string>(hoy);

  // Grid
  const [data, setData] = useState<ReporteIngresosCajeroRow[]>([]);
  const [totalOperaciones, setTotalOperaciones] = useState(0);
  const [totalImporte, setTotalImporte] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Visor Reporte / Impresión
  const [reporteHtml, setReporteHtml] = useState<string | null>(null);
  const [reportePdf, setReportePdf] = useState<ReportePdfConfig | null>(null);

  const handleBuscar = async () => {
    if (!desde || !hasta) {
      setError("Debe seleccionar la fecha de inicio y fin.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await searchReporteIngresosCajeroAction({ desde, hasta });
      if (res.success) {
        setData(res.data);
        setTotalOperaciones(res.totalOperaciones);
        setTotalImporte(res.totalImporte);
        setSearched(true);
      } else {
        setError(res.error);
        setData([]);
      }
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al buscar.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = () => {
    if (data.length === 0) return;

    const fechaActual = new Date().toLocaleDateString("es-PE");
    const horaActual = new Date().toLocaleTimeString("es-PE");

    const filasHtml = data
      .map(
        (row) => `
        <tr>
          <td style="padding: 6px 10px; border-bottom: 1px dashed #cbd5e1; text-align: center; font-family: monospace;">${row.codigoCajero}</td>
          <td style="padding: 6px 10px; border-bottom: 1px dashed #cbd5e1; text-align: left;">${row.nombreCajero}</td>
          <td style="padding: 6px 10px; border-bottom: 1px dashed #cbd5e1; text-align: center; font-weight: 500;">${row.numeroOperaciones}</td>
          <td style="padding: 6px 10px; border-bottom: 1px dashed #cbd5e1; text-align: right; font-weight: 600;">S/ ${row.importe.toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Recaudación por Cajero</title>
        <style>
          @page { size: portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 20px; }
          .header-tbl { width: 100%; margin-bottom: 15px; border-collapse: collapse; }
          .title { font-size: 15px; font-weight: bold; text-align: center; color: #0f172a; text-transform: uppercase; margin: 5px 0; }
          .sub-title { font-size: 12px; font-weight: 600; text-align: center; color: #475569; margin-bottom: 15px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 15px; font-size: 10px; }
          .table-data { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .table-data th { background: #f1f5f9; padding: 8px 10px; border-top: 1px solid #0f172a; border-bottom: 1px solid #0f172a; font-size: 10px; text-transform: uppercase; font-weight: 700; color: #334155; }
          .totales-row td { padding: 10px; border-top: 2px solid #0f172a; font-weight: bold; font-size: 12px; }
        </style>
      </head>
      <body>
        <table class="header-tbl">
          <tr>
            <td style="text-align: left; font-size: 9px; color: #64748b;">
              <strong>SERVICIO DE ADMINISTRACIÓN TRIBUTARIA DE ICA</strong><br>
              Área de Tesorería y Recaudación
            </td>
            <td style="text-align: right; font-size: 9px; color: #64748b;">
              Fecha: ${fechaActual} &nbsp;|&nbsp; Hora: ${horaActual}
            </td>
          </tr>
        </table>

        <div class="title">Servicio de Administración Tributaria de Ica</div>
        <div class="sub-title">Recaudación por Cajero</div>

        <div class="meta-box">
          <table style="width: 100%;">
            <tr>
              <td style="width: 50%;"><strong>Fecha Inicio:</strong> ${desde}</td>
              <td style="width: 50%; text-align: right;"><strong>Fecha Fin:</strong> ${hasta}</td>
            </tr>
          </table>
        </div>

        <table class="table-data">
          <thead>
            <tr>
              <th style="width: 15%; text-align: center;">Cód. Cajero</th>
              <th style="width: 45%; text-align: left;">Nombre Cajero</th>
              <th style="width: 20%; text-align: center;">N° Operaciones</th>
              <th style="width: 20%; text-align: right;">Importe</th>
            </tr>
          </thead>
          <tbody>
            ${filasHtml}
            <tr class="totales-row">
              <td colspan="2" style="text-align: right;">TOTAL GENERAL:</td>
              <td style="text-align: center;">${totalOperaciones}</td>
              <td style="text-align: right;">S/ ${totalImporte.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const configPdf: ReportePdfConfig = {
      filename: `reporte-ingresos-cajero-${desde}-${hasta}.pdf`,
      titulo: "RECAUDACIÓN POR CAJERO",
      subtitulo: [
        ["Fecha Inicio", desde],
        ["Fecha Fin", hasta],
        ["Total Operaciones", String(totalOperaciones)],
        ["Total Recaudado", `S/ ${totalImporte.toFixed(2)}`],
      ],
      orientacion: "portrait",
      columnas: ["Cód. Cajero", "Nombre Cajero", "N° Operaciones", "Importe"],
      filas: [
        ...data.map((r) => [
          r.codigoCajero,
          r.nombreCajero,
          String(r.numeroOperaciones),
          `S/ ${r.importe.toFixed(2)}`,
        ]),
        [
          "TOTAL GENERAL",
          "",
          String(totalOperaciones),
          `S/ ${totalImporte.toFixed(2)}`,
        ],
      ],
    };

    setReporteHtml(html);
    setReportePdf(configPdf);
  };

  const handleExportExcel = async () => {
    if (data.length === 0) return;
    try {
      await exportReporteIngresosCajeroExcel({
        data,
        desde,
        hasta,
        totalOperaciones,
        totalImporte,
      });
    } catch {
      setError("Error al exportar a Excel.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 0.5px, transparent 0.5px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
              <Users
                size={18}
                className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
                Reporte de Ingresos por Cajero
              </h1>
              <p className="text-xs text-white/50 font-inter">
                Administración Tributaria — Resumen consolidado de recaudación y operaciones por ventanilla
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de Filtros */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
          <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Filtros de búsqueda
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Fecha Desde */}
          <div className="md:col-span-3">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Fecha Hasta */}
          <div className="md:col-span-3">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="md:col-span-6 flex items-center justify-end gap-2 pt-2 md:pt-0">
            <button
              type="button"
              onClick={handleBuscar}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-navy px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sat-navy/90 focus:outline-none disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              Buscar
            </button>

            <button
              type="button"
              onClick={handleImprimir}
              disabled={loading || data.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer size={14} className="text-blue-600" />
              Imprimir Reporte
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loading || data.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              Exportar Excel
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-red-50 p-2 text-xs text-red-600">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      {/* Grid de Resultados */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Receipt size={15} className="text-slate-500" />
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-outfit">
              Detalle de Recaudación por Ventanilla
            </h2>
          </div>
          {data.length > 0 && (
            <span className="text-[11px] font-medium text-slate-500">
              {data.length} {data.length === 1 ? "cajero" : "cajeros"} encontrados
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="px-4 py-2.5 text-center w-28">Cód. Cajero</th>
                <th className="px-4 py-2.5">Nombre Cajero</th>
                <th className="px-4 py-2.5 text-center w-36">N° Operaciones</th>
                <th className="px-4 py-2.5 text-right w-44">Importe Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <Loader2 size={24} className="mx-auto mb-2 animate-spin text-sat-cyan" />
                    Cargando información de recaudación...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <SearchX size={32} className="mb-2 text-slate-300" />
                      <p className="font-medium">
                        {searched
                          ? "No se encontraron registros para las fechas seleccionadas."
                          : "Seleccione un rango de fechas y haga clic en Buscar."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {data.map((row) => (
                    <tr
                      key={row.codigoCajero}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-2 text-center font-mono font-medium text-slate-600">
                        {row.codigoCajero}
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {row.nombreCajero}
                      </td>
                      <td className="px-4 py-2 text-center font-semibold text-slate-700">
                        {row.numeroOperaciones}
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">
                        S/ {row.importe.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {/* Fila de Totales */}
                  <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                    <td colSpan={2} className="px-4 py-3 text-right uppercase tracking-wider text-[11px]">
                      Total General:
                    </td>
                    <td className="px-4 py-3 text-center text-sat-navy text-xs">
                      {totalOperaciones}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-sat-navy">
                      S/ {totalImporte.toFixed(2)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Visor de Reporte para Impresión y Descarga */}
      <ReporteViewerModal
        isOpen={reporteHtml !== null}
        onClose={() => {
          setReporteHtml(null);
          setReportePdf(null);
        }}
        html={reporteHtml ?? ""}
        pdfConfig={reportePdf}
      />
    </div>
  );
}
