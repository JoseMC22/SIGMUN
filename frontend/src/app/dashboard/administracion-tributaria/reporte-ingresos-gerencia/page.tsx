"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Printer,
  FileSpreadsheet,
  Loader2,
  Building,
  SearchX,
  AlertCircle,
  Receipt,
} from "lucide-react";
import {
  getAreasReporteIngresosGerenciaAction,
  getCajasReporteIngresosGerenciaAction,
  searchReporteIngresosGerenciaAction,
  type AreaOption,
  type CajaOption,
  type ReporteIngresosGerenciaRow,
} from "@/actions/administracion-tributaria/reporte-ingresos-gerencia";
import ReporteViewerModal from "@/components/reportes/reporte-viewer-modal";
import type { ReportePdfConfig } from "@/lib/reportes/reporte-service";

const NIVEL_OPTIONS = [
  { value: 0, label: "0 - TODOS" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
  { value: 6, label: "6 - TODOS" },
];

const TIPO_OPERACION_OPTIONS = [
  { value: "--", label: "TODOS" },
  { value: "1", label: "Sismuni" },
  { value: "2", label: "Tupa" },
  { value: "4", label: "Entrada" },
];

export default function ReporteIngresosGerenciaPage() {
  const hoy = new Date().toISOString().split("T")[0];

  // Filtros
  const [desde, setDesde] = useState<string>(hoy);
  const [hasta, setHasta] = useState<string>(hoy);
  const [area, setArea] = useState<string>("");
  const [cajero, setCajero] = useState<string>("--");
  const [tipoOperacion, setTipoOperacion] = useState<string>("--");
  const [nivel, setNivel] = useState<number>(0);

  // Combos
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [cajas, setCajas] = useState<CajaOption[]>([]);

  // Grid
  const [data, setData] = useState<ReporteIngresosGerenciaRow[]>([]);
  const [nombreArea, setNombreArea] = useState<string>("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Visor Reporte / Impresión
  const [reporteHtml, setReporteHtml] = useState<string | null>(null);
  const [reportePdf, setReportePdf] = useState<ReportePdfConfig | null>(null);

  // Cargar combos al montar
  useEffect(() => {
    getAreasReporteIngresosGerenciaAction().then((res) => {
      if (res.success) setAreas(res.data);
    });
    getCajasReporteIngresosGerenciaAction().then((res) => {
      if (res.success) setCajas(res.data);
    });
  }, []);

  const handleBuscar = async () => {
    if (!desde || !hasta) {
      setError("Debe seleccionar la fecha de inicio y fin.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await searchReporteIngresosGerenciaAction({
        desde,
        hasta,
        area,
        cajero,
        tipo_operacion: tipoOperacion,
        nivel,
      });
      if (res.success) {
        setData(res.data);
        setNombreArea(res.nombreArea);
        setTotal(res.total);
        setSearched(true);
      } else {
        setError(res.error);
        setData([]);
        setNombreArea("");
        setTotal(0);
      }
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al buscar.");
      setData([]);
      setNombreArea("");
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = () => {
    if (data.length === 0) return;

    const fechaActual = new Date().toLocaleDateString("es-PE");
    const horaActual = new Date().toLocaleTimeString("es-PE");
    const areaDesc = areas.find((a) => a.id === area)?.descripcion || nombreArea || "TODAS LAS ÁREAS";
    const cajaDesc = cajero === "--" ? "TODAS" : cajas.find((c) => c.id === cajero)?.descripcion || cajero;
    const nivelDesc = NIVEL_OPTIONS.find((n) => n.value === nivel)?.label || String(nivel);

    const filasHtml = data
      .map(
        (row) => `
        <tr>
          <td style="padding: 6px 10px; border-bottom: 1px dashed #cbd5e1; text-align: left; font-family: monospace;">${row.partida}</td>
          <td style="padding: 6px 10px; border-bottom: 1px dashed #cbd5e1; text-align: left;">${row.descripcion}</td>
          <td style="padding: 6px 10px; border-bottom: 1px dashed #cbd5e1; text-align: right; font-weight: 600;">S/ ${row.monto.toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ingresos por Gerencia</title>
        <style>
          @page { size: portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 20px; }
          .header-tbl { width: 100%; margin-bottom: 15px; border-collapse: collapse; }
          .title { font-size: 15px; font-weight: bold; text-align: center; color: #0f172a; text-transform: uppercase; margin: 5px 0; }
          .sub-title { font-size: 13px; font-weight: 700; text-align: center; color: #1e3a8a; margin-bottom: 15px; text-transform: uppercase; }
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
              Reporte de Recaudación TUPA e Ingresos
            </td>
            <td style="text-align: right; font-size: 9px; color: #64748b;">
              Fecha: ${fechaActual} &nbsp;|&nbsp; Hora: ${horaActual}
            </td>
          </tr>
        </table>

        <div class="title">Servicio de Administración Tributaria de Ica</div>
        <div class="sub-title">${areaDesc}</div>

        <div class="meta-box">
          <table style="width: 100%;">
            <tr>
              <td style="width: 50%;"><strong>Caja:</strong> ${cajaDesc}</td>
              <td style="width: 50%; text-align: right;"><strong>Nivel:</strong> ${nivelDesc}</td>
            </tr>
            <tr>
              <td><strong>Fecha Inicio:</strong> ${desde}</td>
              <td style="text-align: right;"><strong>Fecha Fin:</strong> ${hasta}</td>
            </tr>
          </table>
        </div>

        <table class="table-data">
          <thead>
            <tr>
              <th style="width: 25%; text-align: left;">Partida</th>
              <th style="width: 55%; text-align: left;">Descripción</th>
              <th style="width: 20%; text-align: right;">Monto Pagado</th>
            </tr>
          </thead>
          <tbody>
            ${filasHtml}
            <tr class="totales-row">
              <td colspan="2" style="text-align: right;">IMPORTE TOTAL:</td>
              <td style="text-align: right;">S/ ${total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const configPdf: ReportePdfConfig = {
      filename: `reporte-ingresos-gerencia-${desde}-${hasta}.pdf`,
      titulo: "REPORTE DE INGRESOS POR GERENCIA",
      subtitulo: [
        ["Área / Gerencia", areaDesc],
        ["Caja", cajaDesc],
        ["Nivel", nivelDesc],
        ["Fecha Inicio", desde],
        ["Fecha Fin", hasta],
        ["Importe Total", `S/ ${total.toFixed(2)}`],
      ],
      orientacion: "portrait",
      columnas: ["Partida", "Descripción", "Monto Pagado"],
      filas: [
        ...data.map((r) => [r.partida, r.descripcion, `S/ ${r.monto.toFixed(2)}`]),
        ["IMPORTE TOTAL", "", `S/ ${total.toFixed(2)}`],
      ],
    };

    setReporteHtml(html);
    setReportePdf(configPdf);
  };

  const handleExportExcel = () => {
    if (data.length === 0) return;

    try {
      const escapeXml = (str: string) =>
        str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

      const rowsXml = data
        .map((r) => {
          const isParent = (r.nivel_suma ?? 0) > 0;
          const isOrange = r.color === "orange";
          const isGreen = r.color === "green";
          const indentSpaces = " ".repeat(Math.min((r.espacio ?? 0) * 2, 20));

          let styleId = "sNormal";
          if (isOrange) {
            styleId = "sOrange";
          } else if (isGreen) {
            styleId = "sGreen";
          } else if (isParent) {
            styleId = "sBold";
          }

          let styleNumId = "sNumNormal";
          if (isOrange) {
            styleNumId = "sNumOrange";
          } else if (isGreen) {
            styleNumId = "sNumGreen";
          } else if (isParent) {
            styleNumId = "sNumBold";
          }

          return `
      <Row>
        <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(r.partida)}</Data></Cell>
        <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(indentSpaces + r.descripcion)}</Data></Cell>
        <Cell ss:StyleID="${styleNumId}"><Data ss:Type="Number">${r.monto.toFixed(2)}</Data></Cell>
      </Row>`;
        })
        .join("");

      const totalRowXml = `
      <Row>
        <Cell ss:StyleID="sTotal"><Data ss:Type="String">TOTAL GENERAL</Data></Cell>
        <Cell ss:StyleID="sTotal"><Data ss:Type="String"></Data></Cell>
        <Cell ss:StyleID="sNumTotal"><Data ss:Type="Number">${total.toFixed(2)}</Data></Cell>
      </Row>`;

      const excelXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="sHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
   </Borders>
  </Style>
  <Style ss:ID="sNormal">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#334155"/>
  </Style>
  <Style ss:ID="sBold">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A" ss:Bold="1"/>
  </Style>
  <Style ss:ID="sOrange">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#D97706" ss:Bold="1"/>
  </Style>
  <Style ss:ID="sGreen">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#059669" ss:Bold="1"/>
  </Style>
  <Style ss:ID="sNumNormal">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#334155"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="sNumBold">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A" ss:Bold="1"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="sNumOrange">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#D97706" ss:Bold="1"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="sNumGreen">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#059669" ss:Bold="1"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="sTotal">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#0F172A" ss:Bold="1"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0F172A"/>
   </Borders>
  </Style>
  <Style ss:ID="sNumTotal">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#0F172A" ss:Bold="1"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0.00"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0F172A"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Ingresos por Partidas">
  <Table>
   <Column ss:Width="140"/>
   <Column ss:Width="420"/>
   <Column ss:Width="130"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Partida</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Descripción</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Monto Pagado (S/)</Data></Cell>
   </Row>
   ${rowsXml}
   ${totalRowXml}
  </Table>
 </Worksheet>
</Workbook>`;

      const blob = new Blob([excelXml], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ingresos_gerencia_${desde}_al_${hasta}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
            backgroundImage: "radial-gradient(circle, #fff 0.5px, transparent 0.5px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
              <Building size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
                Reporte de Ingresos por Gerencia
              </h1>
              <p className="text-xs text-white/50 font-inter">
                Administración Tributaria — Detalle de recaudación por partidas según gerencia o área TUPA
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

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Caja */}
          <div className="md:col-span-3">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Caja
            </label>
            <select
              value={cajero}
              onChange={(e) => setCajero(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              <option value="--">— TODOS —</option>
              {cajas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.descripcion || c.id}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Desde */}
          <div className="md:col-span-2">
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
          <div className="md:col-span-2">
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

          {/* Tipo Operación */}
          <div className="md:col-span-3">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Tipo Operación
            </label>
            <select
              value={tipoOperacion}
              onChange={(e) => setTipoOperacion(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              {TIPO_OPERACION_OPTIONS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          {/* Nivel */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Nivel
            </label>
            <select
              value={nivel}
              onChange={(e) => setNivel(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              {NIVEL_OPTIONS.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleBuscar}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-navy px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sat-navy/90 focus:outline-none disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Buscar
          </button>

          <button
            type="button"
            onClick={handleImprimir}
            disabled={loading || data.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer size={14} className="text-blue-600" />
            Imprimir
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
              {nombreArea ? `Detalle de Partidas: ${nombreArea}` : "Detalle de Partidas por Gerencia"}
            </h2>
          </div>
          {data.length > 0 && (
            <span className="text-[11px] font-medium text-slate-500">
              {data.length} {data.length === 1 ? "partida" : "partidas"} encontradas
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="px-4 py-2.5 w-36">Partida</th>
                <th className="px-4 py-2.5">Descripción</th>
                <th className="px-4 py-2.5 text-right w-44">Monto Pagado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-400">
                    <Loader2 size={24} className="mx-auto mb-2 animate-spin text-sat-cyan" />
                    Cargando información de ingresos por gerencia...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <SearchX size={32} className="mb-2 text-slate-300" />
                      <p className="font-medium">
                        {searched
                          ? "No se encontraron registros para los filtros seleccionados."
                          : "Seleccione los filtros y haga clic en Buscar."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {data.map((row, idx) => {
                    const isParent = (row.nivel_suma ?? 0) > 0;
                    const isOrange = row.color === "orange";
                    const isGreen = row.color === "green";
                    const indentPx = (row.espacio ?? 0) * 8;

                    return (
                      <tr
                        key={`${row.partida}-${idx}`}
                        className={`transition-colors hover:bg-slate-50/80 ${
                          isParent ? "bg-slate-50/50 font-semibold" : ""
                        }`}
                      >
                        <td
                          className={`px-4 py-1.5 font-mono text-xs ${
                            isOrange
                              ? "text-amber-600 font-bold"
                              : isGreen
                              ? "text-emerald-600 font-bold"
                              : isParent
                              ? "text-slate-900 font-bold"
                              : "text-slate-700"
                          }`}
                        >
                          {row.partida}
                        </td>
                        <td
                          className={`px-4 py-1.5 text-xs ${
                            isOrange
                              ? "text-amber-600 font-bold"
                              : isGreen
                              ? "text-emerald-600 font-bold"
                              : isParent
                              ? "text-slate-900 font-bold"
                              : "text-slate-700"
                          }`}
                          style={{ paddingLeft: `${Math.max(16, 16 + indentPx)}px` }}
                        >
                          {row.descripcion}
                        </td>
                        <td
                          className={`px-4 py-1.5 text-right font-mono text-xs ${
                            isOrange
                              ? "text-amber-600 font-bold"
                              : isGreen
                              ? "text-emerald-600 font-bold"
                              : isParent
                              ? "text-slate-900 font-bold"
                              : "text-slate-900"
                          }`}
                        >
                          S/ {row.monto.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Fila de Totales */}
                  <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                    <td colSpan={2} className="px-4 py-3 text-right uppercase tracking-wider text-[11px]">
                      Importe Total:
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-sat-navy">
                      S/ {total.toFixed(2)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Visor de Reporte */}
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
