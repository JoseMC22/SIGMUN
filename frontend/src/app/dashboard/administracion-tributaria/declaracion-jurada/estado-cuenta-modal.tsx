"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { X, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import {
  getEstadoCuentaFiltrosAction,
  getEstadoCuentaRecibosAction,
  generarLiquidacionDJAction,
  getLiquidacionReporteAction,
  getVerPagosAction,
  getDeudaConsolidadoAction,
  type EstadoCuentaPredioOption,
  type EstadoCuentaReciboRow,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { obtenerPlantillaReporteLiquidacionAction } from "@/actions/administracion-tributaria/reporte-liquidacion";
import { construirHtmlReporteLiquidacion } from "./reportes/Liquidacion/reporte-liquidacion";
import { obtenerPlantillaReporteVerPagosAction } from "@/actions/administracion-tributaria/reporte-ver-pagos";
import { construirHtmlVerPagos } from "./reportes/VerPagos/reporte-ver-pagos";
import { obtenerPlantillaReporteDeudaConsolidadaAction } from "@/actions/administracion-tributaria/reporte-deuda-consolidada";
import { construirHtmlDeudaConsolidada } from "./reportes/DeudaConsolidada/reporte-deuda-consolidada";
import { getStoredUser } from "@/lib/api";
import ReporteViewerModal from "@/components/reportes/reporte-viewer-modal";
import type { ReportePdfConfig } from "@/lib/reportes/reporte-service";

// ─── Types ────────────────────────────────────────────────

interface ContribuyenteBasico {
  codigo: string;
  nombre: string;
  documento: string;
  direccion: string;
}

/** Grid row = backend receipt row + local selection flag. */
type GridRow = EstadoCuentaReciboRow & { selected: boolean };

interface EstadoCuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  contribuyente: ContribuyenteBasico | null;
}

// ─── Legend items ──────────────────────────────────────────

const STATUS_LEGEND = [
  { color: "bg-white border border-slate-300", label: "Ordinario" },
  { color: "bg-red-500", label: "Cancelado" },
  { color: "bg-sky-300", label: "VT. Notificado" },
  { color: "bg-blue-500", label: "VT. Emitido" },
  { color: "bg-purple-500", label: "Coac." },
  { color: "bg-green-500", label: "Fracc." },
  { color: "bg-orange-500", label: "Fiscalización" },
  { color: "bg-yellow-400", label: "Compensado" },
];

// Row tint by receipt location code (ubica), matching the legend.
// Only the codes the legacy grid actually colored are mapped here.
const UBICA_ROW_COLORS: Record<string, string> = {
  VT: "bg-sky-100",
  VE: "bg-blue-100",
  CC: "bg-purple-100",
  FR: "bg-green-100",
  FT: "bg-orange-100",
};

// Bottom action bar. Buttons with a criterio trigger the debt query using
// the matching sp_EstCta_Rentas variant; the rest are pending features.
// primary = most frequently used actions, visually highlighted.
const ACTION_BUTTONS: {
  label: string;
  criterio?: number;
  primary?: boolean;
}[] = [
  { label: "Mostrar", criterio: 0, primary: true },
  { label: "Amnistía 2026", criterio: 12 },
  { label: "Sin Multa", criterio: 11 },
  { label: "Deuda Consolidada" },
  { label: "Ver Pagos" },
  { label: "Generar Liquidación", primary: true },
  { label: "Fraccionar" },
  { label: "Ver Fraccionamiento" },
  { label: "Mostrar Benef. Fracc." },
  { label: "Pasar a Coactivo" },
  { label: "Quitar Coactivo" },
  { label: "Generar Deuda" },
];

// ─── Filter groupboxes (placeholder data — will come from SPs) ──

// Legacy concept catalog (hardcoded, ported from the old SIGMUN PHP view).
// Each entry maps a display label to the concept-code pattern consumed by
// the backend queries, e.g. "*02.30*,*02.01*".
const CONCEPTOS: { label: string; value: string }[] = [
  { label: "Predial", value: "*02.30*,*02.01*,*00.16*,*30.02*,*30.03*,*30.04*,*30.82*,*25.04*" },
  { label: "Arbitrios", value: "*11.00*" },
  { label: "Fracciona...", value: "*12.23*" },
  { label: "Alcabala", value: "*02.30*,*00.38*" },
  { label: "Imp. Vehicular", value: "*00.30*,*25.10*" },
  { label: "Multas", value: "*50.01*,*30.66*,*30.82*,*46.35*" },
  {
    label: "Costas",
    value:
      "*30.70*,*30.02*,*30.03*,*30.04*,*30.93*,*30.94*,*30.95*,*30.96*,*30.97*,*30.98*,*44.96*,*44.97*,*44.98*,*44.99*,*45.00*,*45.01*,*45.02*,*45.03*,*45.04*,*45.05*,*45.06*,*45.07*,*45.08*,*45.09*,*45.10*,*45.11*,*45.12*,*45.13*,*45.14*,*45.15*,*45.16*,*45.17*,*45.18*,*45.19*,*45.20*,*45.21*,*45.22*,*45.23*,*45.24*,*45.25*,*00.97*",
  },
  { label: "Fincas", value: "*00.01*" },
  { label: "Cert. NoAdeudo", value: "*25.19*" },
  // { label: "Varios", value: "*99.99*" },
];
// Legacy arbitrios catalog (hardcoded, ported from the old SIGMUN PHP view).
// Período / Año / Predios / Vehículos / Fraccionamientos load from
// store_caja_framework when the modal opens.
const ARBITRIOS: { label: string; value: string }[] = [
  { label: "L.Publica/ Bar.Calle", value: "*11.01*" },
  { label: "Recolec Residuo", value: "*11.02*" },
  { label: "Parq. Jard.", value: "*11.03*" },
  { label: "Serenazgo.", value: "*11.04*" },
];

// ─── Checkbox group sub-component ─────────────────────────

// An option is either a plain string (label === value) or an object carrying
// an explicit backend value (e.g. concept codes).
type GroupItem = string | { label: string; value?: string };

function CheckGroup({
  title,
  items,
  values,
  onChange,
  searchPlaceholder,
  inlineSearch,
  loading,
}: {
  title: string;
  items: GroupItem[];
  values: Record<string, boolean>;
  onChange: (key: string, checked: boolean) => void;
  searchPlaceholder?: string;
  inlineSearch?: boolean;
  loading?: boolean;
}) {
  const options = items.map((i) =>
    typeof i === "string" ? { label: i, value: i } : i,
  );

  const allChecked =
    options.length > 0 && options.every((o) => values[o.label]);
  const [search, setSearch] = useState("");

  const toggleAll = () => {
    const next = !allChecked;
    options.forEach((o) => onChange(o.label, next));
  };

  const filtered = search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  return (
    <fieldset className="rounded border border-slate-200 bg-slate-50/50 p-2">
      <legend className="px-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
        {title}
      </legend>
      {inlineSearch ? (
        <div className="flex items-center gap-1 mb-1">
          <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              className="h-3 w-3 rounded border-slate-300 text-sat-cyan accent-sat-cyan"
            />
            Todos
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 placeholder-slate-400 focus:border-sat-cyan focus:outline-none"
          />
        </div>
      ) : (
        <>
          <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer mb-1">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              className="h-3 w-3 rounded border-slate-300 text-sat-cyan accent-sat-cyan"
            />
            Todos
          </label>
          {searchPlaceholder && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="mb-1 w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 placeholder-slate-400 focus:border-sat-cyan focus:outline-none"
            />
          )}
        </>
      )}
      <div className="max-h-24 space-y-0.5 overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-1.5 py-2 text-[10px] text-slate-400">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-slate-300 border-t-sat-cyan" />
            Cargando…
          </div>
        ) : (
          filtered.map((option) => (
            <label
              key={option.label}
              className="flex items-start gap-1.5 text-[11px] text-slate-600 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!!values[option.label]}
                onChange={(e) => onChange(option.label, e.target.checked)}
                className="mt-px h-3 w-3 shrink-0 rounded border-slate-300 accent-sat-cyan"
              />
              {option.label}
            </label>
          ))
        )}
      </div>
    </fieldset>
  );
}

// ─── Group block: concepto header + receipt rows + group summary ──

function GroupRows({
  name,
  rows,
  totals,
  fmt,
  onToggle,
  collapsed,
  onToggleHeader,
}: {
  name: string;
  rows: GridRow[];
  totals: { costo: number; pago: number; benef: number; total: number };
  fmt: (n: number) => string;
  onToggle: (idrecibo: string) => void;
  collapsed: boolean;
  onToggleHeader: () => void;
}) {
  return (
    <>
      {/* Accordion header: click collapses/expands the group's rows. */}
      <tr
        onClick={onToggleHeader}
        className="cursor-pointer select-none border-b border-slate-200 bg-slate-100/70 transition-colors hover:bg-slate-200/70"
      >
        <td colSpan={13} className="px-2 py-1 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-600">
          <span className="inline-flex items-center gap-1">
            {collapsed ? (
              <ChevronRight size={11} className="text-slate-400" />
            ) : (
              <ChevronDown size={11} className="text-slate-400" />
            )}
            {name}
          </span>
        </td>
      </tr>
      {!collapsed && (
        <>
          {rows.map((row) => {
        const ubicaTint = UBICA_ROW_COLORS[row.ubica] ?? "";
        return (
          <tr
            key={row.idrecibo}
            className={`border-b border-slate-100 transition-colors ${
              row.selected
                ? "bg-sat-cyan/5"
                : ubicaTint || "hover:bg-slate-50"
            }`}
          >
            <td className="px-2 py-1.5 text-center">
              <input
                type="checkbox"
                checked={row.selected}
                onChange={() => onToggle(row.idrecibo)}
                className="h-3 w-3 rounded border-slate-300 accent-sat-cyan"
              />
            </td>
            <td className="px-2 py-1.5 text-left font-medium text-slate-700">
              {row.desTipo}
            </td>
            <td className="px-2 py-1.5 text-left text-slate-600">{row.anno}</td>
            <td className="px-2 py-1.5 text-left text-slate-600">
              {row.codPred}
            </td>
            <td className="px-2 py-1.5 text-left text-slate-600">
              {row.detAnexo || row.anexo}
            </td>
            <td className="px-2 py-1.5 text-left text-slate-600">
              {row.periodo}
            </td>
            <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">
              {fmt(row.impInsol)}
            </td>
            <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">
              {fmt(row.impReaj)}
            </td>
            <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">
              {fmt(row.interes)}
            </td>
            <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">
              {fmt(row.costoEmision)}
            </td>
            <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">
              {fmt(row.totPagado)}
            </td>
            <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">
              {fmt(row.benefic)}
            </td>
            <td className="px-2 py-1.5 text-right tabular-nums font-medium text-slate-700">
              {fmt(row.total)}
            </td>
          </tr>
        );
          })}
          <tr className="border-b border-slate-200 bg-white font-semibold text-[10px] text-slate-500">
            <td colSpan={9} className="px-2 py-1 text-right uppercase tracking-wider">
              Total:
            </td>
            <td className="px-2 py-1 text-right tabular-nums">{fmt(totals.costo)}</td>
            <td className="px-2 py-1 text-right tabular-nums">{fmt(totals.pago)}</td>
            <td className="px-2 py-1 text-right tabular-nums">{fmt(totals.benef)}</td>
            <td className="px-2 py-1 text-right tabular-nums">{fmt(totals.total)}</td>
          </tr>
        </>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────

export default function EstadoCuentaModal({
  isOpen,
  onClose,
  contribuyente,
}: EstadoCuentaModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // ── Radio / filter state ──
  const [filtroEstado, setFiltroEstado] = useState<string>("pendiente");
  const [consolidado, setConsolidado] = useState(false);
  const [verResumen, setVerResumen] = useState(true);
  const [verDetalle, setVerDetalle] = useState(true);
  const [agruparConcepto, setAgruparConcepto] = useState(false);
  const [soloCoactivo, setSoloCoactivo] = useState(false);

  // ── Checkbox group states ──
  // Legacy behavior: "Multas" starts checked (ported from the old view).
  const [conceptos, setConceptos] = useState<Record<string, boolean>>({
    Multas: true,
  });
  const [periodos, setPeriodos] = useState<Record<string, boolean>>({});
  const [arbitrios, setArbitrios] = useState<Record<string, boolean>>({});
  const [anios, setAnios] = useState<Record<string, boolean>>({});
  const [predios, setPredios] = useState<Record<string, boolean>>({});
  const [vehiculos, setVehiculos] = useState<Record<string, boolean>>({});
  const [fraccionamientos, setFraccionamientos] = useState<
    Record<string, boolean>
  >({});

  // ── Dynamic filter items (loaded from store_caja_framework) ──
  const [periodoItems, setPeriodoItems] = useState<string[]>([]);
  const [anioItems, setAnioItems] = useState<string[]>([]);
  const [predioItems, setPredioItems] = useState<EstadoCuentaPredioOption[]>(
    [],
  );
  const [vehiculoItems, setVehiculoItems] = useState<string[]>([]);
  const [fraccionamientoItems, setFraccionamientoItems] = useState<string[]>(
    [],
  );
  const [loadingFiltros, setLoadingFiltros] = useState(false);

  // ── Grid state ──
  const [rows, setRows] = useState<GridRow[]>([]);
  const [loadingDeuda, setLoadingDeuda] = useState(false);
  const [loadingLiquidacion, setLoadingLiquidacion] = useState(false);
  const [liquidacionReporteHtml, setLiquidacionReporteHtml] = useState<string | null>(null);
  const [liquidacionReportePdf, setLiquidacionReportePdf] = useState<ReportePdfConfig | null>(null);
  const [loadingVerPagos, setLoadingVerPagos] = useState(false);
  const [verPagosReporteHtml, setVerPagosReporteHtml] = useState<string | null>(null);
  const [verPagosReportePdf, setVerPagosReportePdf] = useState<ReportePdfConfig | null>(null);
  const [loadingConsolidado, setLoadingConsolidado] = useState(false);
  const [consolidadoReporteHtml, setConsolidadoReporteHtml] = useState<string | null>(null);
  const [consolidadoReportePdf, setConsolidadoReportePdf] = useState<ReportePdfConfig | null>(null);
  const [deudaError, setDeudaError] = useState<string | null>(null);
  // Accordion: group cabecera -> collapsed?
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  // Monotonic id: lets us discard in-flight query results after the modal
  // closes (or after a newer query supersedes them).
  const queryIdRef = useRef(0);

  // ── Full state reset — runs when the modal closes so reopening feels fresh ──
  const resetState = useCallback(() => {
    queryIdRef.current += 1; // invalidate any in-flight query
    setFiltroEstado("pendiente");
    setConsolidado(false);
    setVerResumen(true);
    setVerDetalle(true);
    setAgruparConcepto(false);
    setSoloCoactivo(false);
    setConceptos({ Multas: true });
    setPeriodos({});
    setArbitrios({});
    setAnios({});
    setPredios({});
    setVehiculos({});
    setFraccionamientos({});
    setPeriodoItems([]);
    setAnioItems([]);
    setPredioItems([]);
    setVehiculoItems([]);
    setFraccionamientoItems([]);
    setRows([]);
    setCollapsedGroups({});
    setDeudaError(null);
    setLoadingDeuda(false);
    setLoadingLiquidacion(false);
    setLiquidacionReporteHtml(null);
    setLiquidacionReportePdf(null);
    setLoadingVerPagos(false);
    setVerPagosReporteHtml(null);
    setVerPagosReportePdf(null);
    setLoadingConsolidado(false);
    setConsolidadoReporteHtml(null);
    setConsolidadoReportePdf(null);
  }, []);

  useEffect(() => {
    if (!isOpen) resetState();
  }, [isOpen, resetState]);

  // ── Derived sums for selected rows ──
  const selected = rows.filter((r) => r.selected);
  const sumInsol = selected.reduce((s, r) => s + r.impInsol, 0);
  const sumReaj = selected.reduce((s, r) => s + r.impReaj, 0);
  const sumInteres = selected.reduce((s, r) => s + r.interes, 0);
  const sumCosto = selected.reduce((s, r) => s + r.costoEmision, 0);
  const sumTotal = selected.reduce((s, r) => s + r.total, 0);

  // ── Grid checkbox toggle (idrecibo is unique per row) ──
  const toggleRow = (idrecibo: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.idrecibo === idrecibo ? { ...r, selected: !r.selected } : r,
      ),
    );

  const allRowsChecked = rows.length > 0 && rows.every((r) => r.selected);
  const toggleAllRows = () => {
    const next = !allRowsChecked;
    setRows((prev) => prev.map((r) => ({ ...r, selected: next })));
  };

  // ── "Mostrar": query debt receipts (sp_EstCta_Rentas family) ──
  // Collects every checked filter value and posts it to the backend.
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const collectChecked = (
    items: GroupItem[],
    values: Record<string, boolean>,
  ): string[] =>
    items
      .filter((i) => values[typeof i === "string" ? i : i.label])
      .map((i) => (typeof i === "string" ? i : i.value ?? i.label));

  // Catalog values are legacy patterns like "*02.30*,*02.01*" but the backend
  // expects plain codes ("02.30","02.01") and wraps them itself.
  const toPlainCodes = (pattern: string): string[] =>
    pattern
      .split(",")
      .map((code) => code.trim().replace(/^\*|\*$/g, ""))
      .filter(Boolean);

  const handleMostrar = async (criterio: number) => {
    if (!contribuyenteCodigo || loadingDeuda) return;
    const queryId = ++queryIdRef.current;
    setLoadingDeuda(true);
    setDeudaError(null);
    try {
      const result = await getEstadoCuentaRecibosAction({
        codigo: contribuyenteCodigo,
        periodos: collectChecked(periodoItems, periodos),
        anios: collectChecked(anioItems, anios),
        conceptos: collectChecked(CONCEPTOS, conceptos).flatMap(toPlainCodes),
        arbitrios: collectChecked(ARBITRIOS, arbitrios).flatMap(toPlainCodes),
        predios: collectChecked(predioItems, predios),
        vehiculos: collectChecked(vehiculoItems, vehiculos),
        fraccionamientos: collectChecked(
          fraccionamientoItems,
          fraccionamientos,
        ),
        estado:
          filtroEstado === "pendiente"
            ? "0"
            : filtroEstado === "cancelado"
              ? "1"
              : filtroEstado === "por_compensar"
                ? "3"
                : "%",
        criterio,
        soloCoactivo,
      });
      // Discard the result if the modal closed or a newer query started.
      if (queryId !== queryIdRef.current) return;
      if (result.success) {
        setRows(result.data.map((r) => ({ ...r, selected: false })));
        setCollapsedGroups({}); // fresh results start fully expanded
      } else {
        setDeudaError(result.error);
        setRows([]);
      }
    } finally {
      if (queryId === queryIdRef.current) setLoadingDeuda(false);
    }
  };

  // ── "Generar Liquidación": collect selected receipts → POST → show report in modal ──
  const handleGenerarLiquidacion = async () => {
    if (!contribuyenteCodigo || loadingLiquidacion) return;

    const selectedRows = rows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      setDeudaError('Seleccione al menos un recibo para generar la liquidación.');
      return;
    }

    const totalp = selectedRows.reduce((s, r) => s + r.total, 0);

    // vt array: selected rows where ubica === 'VT' AND anno < '2025'
    const vt = selectedRows
      .filter((r) => r.ubica === 'VT' && r.anno < '2025')
      .map((r) => ({ codigo: r.codigo, idrecibo: r.idrecibo }));

    // liquidacion array: map each selected row to the payload shape
    const liquidacion = selectedRows.map((r) => ({
      idrecibo: r.idrecibo,
      codigo: r.codigo,
      anno: r.anno,
      cod_pred: r.codPred,
      anexo: r.anexo,
      sub_anexo: r.subAnexo,
      tipo: r.tipo,
      tipo_rec: r.tipoRec,
      periodo: r.periodo,
      total: r.total,
      imp_reaj: r.impReaj,
      mora: r.interes,
      costo_emis: r.costoEmision,
      fact_mora: 0,
      benefic: r.benefic,
      ubica: r.ubica,
    }));

    const user = getStoredUser();
    setLoadingLiquidacion(true);
    setDeudaError(null);

    try {
      const result = await generarLiquidacionDJAction({
        codigo: contribuyenteCodigo,
        totalp,
        liquidacion,
        vt,
        usuario: user?.username ?? '',
      });

      if (!result.success) {
        setDeudaError(result.error);
        return;
      }

      // Fetch report data + template in parallel and build HTML
      const [dataResult, plantillaResult] = await Promise.all([
        getLiquidacionReporteAction(result.idliqui),
        obtenerPlantillaReporteLiquidacionAction(),
      ]);

      if (!dataResult.success) {
        setDeudaError(dataResult.error);
        return;
      }
      if (!plantillaResult.success) {
        setLiquidacionReporteHtml(null);
        setLiquidacionReportePdf(null);
        setDeudaError(plantillaResult.error);
        return;
      }

      const html = construirHtmlReporteLiquidacion(dataResult.data, plantillaResult.data);
      setLiquidacionReporteHtml(html);
      setLiquidacionReportePdf({
        filename: `liquidacion-${result.nliqui || result.idliqui}.pdf`,
        titulo: 'Reporte de Liquidación',
        orientacion: 'portrait',
        subtitulo: [
          ['N° Liquidación', dataResult.data.nliqui],
          ['Código', dataResult.data.codigo],
          ['Nombre', dataResult.data.nombre],
          ['Fecha', dataResult.data.fecha],
        ],
        columnas: ['Año', 'Concepto', 'Monto'],
        filas: dataResult.data.detalles.map((d) => [
          d.anno,
          d.tipo_general,
          fmt(d.monto),
        ]),
      });
    } catch {
      setDeudaError('Error al generar la liquidación. Intente nuevamente.');
    } finally {
      setLoadingLiquidacion(false);
    }
  };

  // ── "Ver Pagos": fetch payments → build HTML → show in modal ──
  const handleVerPagos = async () => {
    if (!contribuyenteCodigo || loadingVerPagos) return;

    setLoadingVerPagos(true);
    setDeudaError(null);

    try {
      const [dataResult, plantillaResult] = await Promise.all([
        getVerPagosAction(contribuyenteCodigo),
        obtenerPlantillaReporteVerPagosAction(),
      ]);

      if (!dataResult.success) {
        setDeudaError(dataResult.error);
        return;
      }
      if (!plantillaResult.success) {
        setDeudaError(plantillaResult.error);
        return;
      }

      const html = construirHtmlVerPagos(dataResult.data, plantillaResult.data);
      setVerPagosReporteHtml(html);

      // Build flat PDF table from all receipts' details
      const pdfRows: Array<Array<string | number>> = [];
      for (const recibo of dataResult.data.recibos) {
        for (const d of recibo.detalles) {
          pdfRows.push([
            recibo.nroRecibo,
            d.anno,
            d.tributo,
            d.cuota,
            fmt(d.insoluto),
            fmt(d.intereses),
            fmt(d.emision),
            fmt(d.descuento),
            fmt(d.totalPagado),
            d.codReferencia,
          ]);
        }
      }
      setVerPagosReportePdf({
        filename: `pagos-${contribuyenteCodigo}.pdf`,
        titulo: 'Reporte de Pagos',
        orientacion: 'landscape',
        subtitulo: [['Código', contribuyenteCodigo]],
        columnas: ['N° Recibo', 'Año', 'Tributo', 'Cuota', 'Insoluto', 'Intereses', 'Emisión', 'Descuento', 'Total Pagado', 'Cod. Ref.'],
        filas: pdfRows,
      });
    } catch {
      setDeudaError('Error al obtener los pagos. Intente nuevamente.');
    } finally {
      setLoadingVerPagos(false);
    }
  };

  // ── "Deuda Consolidada": fetch consolidated debt → build HTML → show in modal ──
  const handleDeudaConsolidada = async () => {
    if (!contribuyenteCodigo || loadingConsolidado) return;

    const user = getStoredUser();
    setLoadingConsolidado(true);
    setDeudaError(null);

    try {
      const [dataResult, plantillaResult] = await Promise.all([
        getDeudaConsolidadoAction({
          codigo: contribuyenteCodigo,
          periodos: collectChecked(periodoItems, periodos),
          anios: collectChecked(anioItems, anios),
          conceptos: collectChecked(CONCEPTOS, conceptos).flatMap(toPlainCodes),
          arbitrios: collectChecked(ARBITRIOS, arbitrios).flatMap(toPlainCodes),
          predios: collectChecked(predioItems, predios),
          vehiculos: collectChecked(vehiculoItems, vehiculos),
          fraccionamientos: collectChecked(
            fraccionamientoItems,
            fraccionamientos,
          ),
          // The legacy "Deuda consolidado" button only prints pending accounts.
          estado: '0',
          criterio: 0,
          resumen: verResumen,
          detalle: verDetalle,
          agrupar: agruparConcepto,
        }),
        obtenerPlantillaReporteDeudaConsolidadaAction(),
      ]);

      if (!dataResult.success) {
        setDeudaError(dataResult.error);
        return;
      }
      if (!plantillaResult.success) {
        setDeudaError(plantillaResult.error);
        return;
      }

      const html = construirHtmlDeudaConsolidada(dataResult.data, plantillaResult.data, {
        usuario: user?.username ?? '',
      });
      setConsolidadoReporteHtml(html);

      // Build PDF table: flatten rows with a "Deuda Total por año" grouping.
      const pdfRows: Array<Array<string | number>> = [];
      const yearTotals = new Map<string, number>();
      for (const f of dataResult.data.filas) {
        yearTotals.set(f.anno, (yearTotals.get(f.anno) ?? 0) + f.saldo);
      }
      for (const anno of yearTotals.keys()) {
        pdfRows.push([anno, `Deuda Total para el A\u00f1o`, yearTotals.get(anno) ?? 0]);
      }
      pdfRows.push(['', 'Total Neto', dataResult.data.filas.reduce((s, f) => s + f.saldo, 0)]);

      setConsolidadoReportePdf({
        filename: `deuda-consolidada-${contribuyenteCodigo}.pdf`,
        titulo: 'Deuda Consolidada',
        orientacion: 'landscape',
        subtitulo: [
          ['Código', contribuyenteCodigo],
          ['Nombre', dataResult.data.cabecera.nombre],
        ],
        columnas: ['Año', 'Concepto', 'Importe'],
        filas: pdfRows,
      });
    } catch {
      setDeudaError('Error al obtener la deuda consolidada. Intente nuevamente.');
    } finally {
      setLoadingConsolidado(false);
    }
  };

  // ── Escape to close ──
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // ── Load filters (store_caja_framework) when opened for a contribuyente ──
  const contribuyenteCodigo = contribuyente?.codigo ?? "";
  useEffect(() => {
    if (!isOpen || !contribuyenteCodigo) return;
    let cancelled = false;

    // Clear stale data + selections from a previous open/contribuyente
    setPeriodoItems([]);
    setAnioItems([]);
    setPredioItems([]);
    setVehiculoItems([]);
    setFraccionamientoItems([]);
    setLoadingFiltros(false);
    setConceptos({ Multas: true });
    setPeriodos({});
    setArbitrios({});
    setAnios({});
    setPredios({});
    setVehiculos({});
    setFraccionamientos({});

    const load = async () => {
      setLoadingFiltros(true);
      const result = await getEstadoCuentaFiltrosAction(contribuyenteCodigo);
      if (cancelled) return;
      if (result.success) {
        setPeriodoItems(result.data.periodos);
        setAnioItems(result.data.anios);
        setPredioItems(result.data.predios);
        setVehiculoItems(result.data.vehiculos);
        setFraccionamientoItems(result.data.fraccionamientos);
      } else {
        console.error("[EstadoCuentaModal] filtros:", result.error);
      }
      setLoadingFiltros(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, contribuyenteCodigo]);

  const handleToggle = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>) =>
      (key: string, checked: boolean) =>
        setter((prev) => ({ ...prev, [key]: checked })),
    [],
  );

  if (!isOpen || !contribuyente) return null;

  // Group rows by concepto cabecera. The SP sorts by YEAR first, so the same
  // predio yields several row blocks (one per year) with identical cabecera;
  // merging by name keeps one group per predio with all its years inside,
  // matching the legacy grid. First-appearance order is preserved.
  const groupMap = new Map<string, GridRow[]>();
  for (const row of rows) {
    const name = row.desCabecera || "OTROS";
    const bucket = groupMap.get(name);
    if (bucket) {
      bucket.push(row);
    } else {
      groupMap.set(name, [row]);
    }
  }
  const groups: { name: string; rows: GridRow[] }[] = [...groupMap].map(
    ([name, groupRows]) => ({
      name,
      // Most recent year first inside each group (2026 → older). Stable
      // sort keeps the SP order (periodo asc) within the same year.
      rows: [...groupRows].sort((a, b) => Number(b.anno) - Number(a.anno)),
    }),
  );

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-70 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm animate-fade-in p-4 pt-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-275 rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl bg-linear-to-r from-emerald-700 via-emerald-800 to-slate-800 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-0.5 rounded-full bg-emerald-300" />
            <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
              Estado de Cuenta
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          {/* ── 1. Contribuyente info ── */}
          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <legend className="px-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Contribuyente
            </legend>
            <div className="grid grid-cols-[1.2fr_1fr_2.5fr] gap-3 text-[11px]">
              <div>
                <span className="text-slate-400">Nombre:</span>{" "}
                <span className="font-medium text-slate-700">
                  {contribuyente.nombre}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Documento:</span>{" "}
                <span className="font-medium text-slate-700">
                  {contribuyente.documento}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Dirección:</span>{" "}
                <span className="font-medium text-slate-700">
                  {contribuyente.direccion}
                </span>
              </div>
            </div>
          </fieldset>

          {/* ── 2. Filtros: Radio buttons + Legend + Options ── */}
          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">

            {/* Radio buttons + Legend in the same row */}
            <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1">
              {(["pendiente", "cancelado", "por_compensar", "todo"] as const).map(
                (opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="filtroEstado"
                      value={opt}
                      checked={filtroEstado === opt}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                      className="h-3 w-3 border-slate-300 text-sat-cyan accent-sat-cyan"
                    />
                    {opt === "pendiente"
                      ? "Pendiente"
                      : opt === "cancelado"
                        ? "Cancelado"
                        : opt === "por_compensar"
                          ? "Por compensar"
                          : "Todo"}
                  </label>
                ),
              )}

              {/* Separator */}
              <span className="hidden sm:inline-block h-4 w-px bg-slate-300" />

              {/* Legend items inline */}
              {STATUS_LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-sm ${item.color}`}
                  />
                  <span className="text-[10px] text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Option checkboxes row */}
            <div className="flex flex-wrap items-center gap-4">
              {[
                { label: "Deuda Consolidado", val: consolidado, set: setConsolidado },
                { label: "Ver Resumen Ctas.", val: verResumen, set: setVerResumen },
                { label: "Ver Detalle Ctas.", val: verDetalle, set: setVerDetalle },
                { label: "Agrupar detalle por concepto", val: agruparConcepto, set: setAgruparConcepto },
                { label: "Solo Coactivo", val: soloCoactivo, set: setSoloCoactivo },
              ].map((opt) => (
                <label
                  key={opt.label}
                  className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={opt.val}
                    onChange={(e) => opt.set(e.target.checked)}
                    className="h-3 w-3 rounded border-slate-300 text-sat-cyan accent-sat-cyan"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* ── 3. Filter groupboxes ── */}
          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex flex-wrap gap-2">
              <div className="w-27.5 shrink-0">
                <CheckGroup
                  title="Concepto"
                  items={CONCEPTOS}
                  values={conceptos}
                  onChange={handleToggle(setConceptos)}
                />
              </div>
              <div className="w-17.5 shrink-0">
                <CheckGroup
                  title="Período"
                  items={periodoItems}
                  values={periodos}
                  onChange={handleToggle(setPeriodos)}
                  loading={loadingFiltros}
                />
              </div>
              <div className="w-30 shrink-0">
                <CheckGroup
                  title="Arbitrios"
                  items={ARBITRIOS}
                  values={arbitrios}
                  onChange={handleToggle(setArbitrios)}
                />
              </div>
              <div className="w-20 shrink-0">
                <CheckGroup
                  title="Año"
                  items={anioItems}
                  values={anios}
                  onChange={handleToggle(setAnios)}
                  loading={loadingFiltros}
                />
              </div>
              <div className="flex-1 min-w-50">
                <CheckGroup
                  title="Predios"
                  items={predioItems}
                  values={predios}
                  onChange={handleToggle(setPredios)}
                  searchPlaceholder="Buscar predio..."
                  inlineSearch
                  loading={loadingFiltros}
                />
              </div>              
              <div className="w-25 shrink-0">
                <CheckGroup
                  title="Vehículo"
                  items={vehiculoItems}
                  values={vehiculos}
                  onChange={handleToggle(setVehiculos)}
                  loading={loadingFiltros}
                />
              </div>
              <div className="w-37.5 shrink-0">
                <CheckGroup
                  title="Fraccionamiento"
                  items={fraccionamientoItems}
                  values={fraccionamientos}
                  onChange={handleToggle(setFraccionamientos)}
                  loading={loadingFiltros}
                />
              </div>
            </div>
          </fieldset>

          {/* ── 4. Grid / Table ── */}
          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <legend className="px-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Detalle de Deuda
            </legend>
            {/* Capped height keeps the modal size stable regardless of how
                many rows come back; the table scrolls inside. */}
            {deudaError ? (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                {deudaError}
              </div>
            ) : (
            <div className="max-h-[420px] overflow-auto rounded border border-slate-200 bg-white">
              <table className="w-full border-separate border-spacing-0 text-[10px]">
                <thead>
                  <tr>
                    <th className="sticky top-0 z-10 w-8 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={allRowsChecked}
                        onChange={toggleAllRows}
                        className="h-3 w-3 rounded border-slate-300 accent-sat-cyan"
                      />
                    </th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Tributo</th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Año</th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Predio</th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Anexo</th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Periodo</th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500">Imp. Insol.</th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500">Imp. Reaj.</th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500">Interés</th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500">Costo Emisión</th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500">Tot. Pago</th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500">Benef.</th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDeuda ? (
                    <tr>
                      <td
                        colSpan={13}
                        className="px-3 py-6 text-center text-[11px] text-slate-400"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" />
                          Consultando deuda...
                        </span>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={13}
                        className="px-3 py-6 text-center text-[11px] text-slate-400"
                      >
                        No hay datos. Presione &quot;Mostrar&quot; para consultar.
                      </td>
                    </tr>
                  ) : (
                    groups.map((group) => {
                      const gCosto = group.rows.reduce(
                        (s, r) => s + r.costoEmision,
                        0,
                      );
                      const gPago = group.rows.reduce(
                        (s, r) => s + r.totPagado,
                        0,
                      );
                      const gBenef = group.rows.reduce(
                        (s, r) => s + r.benefic,
                        0,
                      );
                      const gTotal = group.rows.reduce((s, r) => s + r.total, 0);
                      return (
                        <GroupRows
                          key={group.name}
                          name={group.name}
                          rows={group.rows}
                          totals={{ costo: gCosto, pago: gPago, benef: gBenef, total: gTotal }}
                          fmt={fmt}
                          onToggle={toggleRow}
                          collapsed={!!collapsedGroups[group.name]}
                          onToggleHeader={() =>
                            setCollapsedGroups((prev) => ({
                              ...prev,
                              [group.name]: !prev[group.name],
                            }))
                          }
                        />
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            )}

            {/* Summary inputs + action buttons under grid */}
            <div className="mt-2 flex flex-wrap items-end gap-3">
              {/* Action buttons left */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    /* TODO: Mostrar logic */
                  }}
                  className="rounded bg-slate-600 px-2.5 py-1 text-[10px] font-medium text-white transition hover:bg-slate-700 active:scale-[0.98]"
                >
                  Ver Detalle VT
                </button>
                <button
                  type="button"
                  onClick={() => {
                    /* TODO: Eliminar Acog. logic */
                  }}
                  className="rounded bg-slate-600 px-2.5 py-1 text-[10px] font-medium text-white transition hover:bg-slate-700 active:scale-[0.98]"
                >
                  Eliminar Acog.
                </button>
              </div>

              {/* Summary decimal inputs */}
              <div className="ml-auto flex gap-2">
                {[
                  { label: "Imp. Insol.", value: sumInsol },
                  { label: "Imp. Reaj.", value: sumReaj },
                  { label: "Interés", value: sumInteres },
                  { label: "Costo Emisión", value: sumCosto },
                  { label: "Total", value: sumTotal },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-end">
                    <span className="mb-0.5 text-[8px] font-semibold uppercase tracking-wider text-slate-400">
                      {s.label}
                    </span>
                    <input
                      type="text"
                      readOnly
                      value={fmt(s.value)}
                      className="w-20 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-right text-[10px] tabular-nums text-slate-700"
                    />
                  </div>
                ))}
              </div>
            </div>
          </fieldset>

          {/* ── 5. Action buttons bar ── */}
          {/* "Generar Liquidación" is parked on the right as a single CTA;
              everything else shares a row on the left. Every button uses
              the same min-width so the bar looks visually balanced. */}
          <div className="flex flex-wrap items-center justify-between gap-y-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
            <div className="flex flex-wrap gap-1.5">
              {ACTION_BUTTONS.filter((b) => b.label !== "Generar Liquidación").map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  disabled={
                    loadingDeuda ||
                    (btn.label === "Ver Pagos" && loadingVerPagos) ||
                    (btn.label === "Deuda Consolidada" && loadingConsolidado)
                  }
                  onClick={() => {
                    if (btn.label === "Ver Pagos") {
                      handleVerPagos();
                    } else if (btn.label === "Deuda Consolidada") {
                      handleDeudaConsolidada();
                    } else if (btn.criterio !== undefined) {
                      handleMostrar(btn.criterio);
                    }
                  }}
                  className={`inline-flex min-w-[110px] items-center justify-center gap-1.5 rounded px-2.5 py-1 text-[10px] font-medium text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${
                    btn.primary
                      ? "bg-sat-cyan hover:bg-cyan-600"
                      : "bg-slate-600 hover:bg-slate-700"
                  }`}
                >
                  {((loadingDeuda && btn.criterio !== undefined) ||
                    (btn.label === "Ver Pagos" && loadingVerPagos) ||
                    (btn.label === "Deuda Consolidada" && loadingConsolidado)) && (
                    <Loader2 size={10} className="animate-spin" />
                  )}
                  {btn.label}
                </button>
              ))}
            </div>
            {(() => {
              const generar = ACTION_BUTTONS.find((b) => b.label === "Generar Liquidación");
              if (!generar) return null;
              return (
                <button
                  type="button"
                  disabled={loadingDeuda || loadingLiquidacion}
                  onClick={() => handleGenerarLiquidacion()}
                  className={`inline-flex min-w-[110px] items-center justify-center gap-1.5 rounded px-2.5 py-1 text-[10px] font-medium text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${
                    generar.primary
                      ? "bg-sat-cyan hover:bg-cyan-600"
                      : "bg-slate-600 hover:bg-slate-700"
                  }`}
                >
                  {loadingLiquidacion && (
                    <Loader2 size={10} className="animate-spin" />
                  )}
                  {generar.label}
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ══ Modal Vista Previa del Reporte de Liquidación ══ */}
      <ReporteViewerModal
        isOpen={liquidacionReporteHtml !== null}
        onClose={() => {
          setLiquidacionReporteHtml(null);
          setLiquidacionReportePdf(null);
        }}
        html={liquidacionReporteHtml ?? ""}
        pdfConfig={liquidacionReportePdf}
      />

      {/* ══ Modal Vista Previa del Reporte Ver Pagos ══ */}
      <ReporteViewerModal
        isOpen={verPagosReporteHtml !== null}
        onClose={() => {
          setVerPagosReporteHtml(null);
          setVerPagosReportePdf(null);
        }}
        html={verPagosReporteHtml ?? ""}
        pdfConfig={verPagosReportePdf}
      />

      {/* ══ Modal Vista Previa del Reporte Deuda Consolidada ══ */}
      <ReporteViewerModal
        isOpen={consolidadoReporteHtml !== null}
        onClose={() => {
          setConsolidadoReporteHtml(null);
          setConsolidadoReportePdf(null);
        }}
        html={consolidadoReporteHtml ?? ""}
        pdfConfig={consolidadoReportePdf}
      />
    </div>
  );
}
