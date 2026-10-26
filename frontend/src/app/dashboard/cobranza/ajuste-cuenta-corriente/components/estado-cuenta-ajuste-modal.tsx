"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { X, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";
import {
  getEstadoCuentaFiltrosAction,
  getEstadoCuentaRecibosAction,
  type EstadoCuentaPredioOption,
  type EstadoCuentaReciboRow,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import {
  getTiposDocSustentoAction,
  imputarMontoAction,
  type TipoDocSustentoItem,
  type ReciboCompensarItem,
  type ImputarMontoPayload,
} from "@/actions/cobranza/ajuste-cuenta-corriente";
import { getStoredUser } from "@/lib/api";
import ConfirmDialog from "@/components/confirm-dialog";
import { toNum } from "@/lib/num";

// ─── Types ────────────────────────────────────────────────

interface ContribuyenteBasico {
  codigo: string;
  nombre: string;
  documento: string;
  direccion: string;
}

/** Grid row = backend receipt row + local selection flag. */
type GridRow = EstadoCuentaReciboRow & { selected: boolean };

/**
 * Fila de la grilla + los campos crudos que el backend agrega al row del
 * Estado de Cuenta para la imputación del ajuste (estado, fec_venc, ...).
 * El tipo del action de DJ no los declara, así que se puentean como
 * opcionales: llegan en el JSON del backend, con '' cuando el SP no trae
 * la columna.
 */
type ImputarGridRow = GridRow & {
  estado?: string;
  fecVenc?: string;
  fecPago?: string;
  numIngr?: string;
  fechIngr?: string;
  factReaj?: string;
  factMora?: string;
};

/**
 * Fila seleccionada → claves EXACTAS del legacy sp_Compensarrecibosjson
 * (el array que el PHP mandaba como @dataxml). Los números van como
 * números: la grilla ya es numérica, sin separadores de miles.
 */
function toReciboCompensar(r: ImputarGridRow): ReciboCompensarItem {
  return {
    idrecibo: r.idrecibo,
    codigo: r.codigo,
    anno: r.anno,
    cod_pred: r.codPred,
    anexo: r.anexo,
    sub_anexo: r.subAnexo,
    tipo: r.tipo,
    tipo_rec: r.tipoRec,
    periodo: r.periodo,
    imp_insol: r.impInsol,
    fact_reaj: r.factReaj ?? "",
    imp_reaj: r.impReaj,
    fact_mora: r.factMora ?? "",
    imp_mora: r.interes,
    costo_emis: r.costoEmision,
    estado: r.estado ?? "",
    ubica: r.ubica,
    fec_venc: r.fecVenc ?? "",
    fec_pago: r.fecPago ?? "",
    num_ingr: r.numIngr ?? "",
    fech_ing: r.fechIngr ?? "",
    montotal: r.total,
  };
}

interface EstadoCuentaAjusteModalProps {
  isOpen: boolean;
  onClose: () => void;
  contribuyente: ContribuyenteBasico | null;
}

// ─── Legend items ──────────────────────────────────────────


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
// Sanitiza "Total a Ajustar" (modo ajuste): solo dígitos y un punto,
// con máximo dos decimales ("1234.5" ok; "1234.567" se corta a "1234.56";
// "12.3.4" y letras se limpian).
const sanitizeMontoAjuste = (raw: string): string => {
  let value = raw.replace(/[^\d.]/g, "");
  const punto = value.indexOf(".");
  if (punto !== -1) {
    value =
      value.slice(0, punto + 1) + value.slice(punto + 1).replace(/\./g, "");
  }
  const [entera, decimales] = value.split(".");
  return decimales !== undefined ? `${entera}.${decimales.slice(0, 2)}` : value;
};

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

export default function EstadoCuentaAjusteModal({
  isOpen,
  onClose,
  contribuyente,
}: EstadoCuentaAjusteModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // ── Radio / filter state ──
  const [filtroEstado, setFiltroEstado] = useState<string>("pendiente");
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

  // ── Documento de Sustento (modo ajuste: ajuste de cuenta
  // corriente). Los tres controles alimentan la imputación de monto
  // (nro/doc/tipo viajan al SP como @nro_doc_sustento/@doc_sustento/
  // @tipo_doc_sustento). ──
  const [tiposDocSustento, setTiposDocSustento] = useState<
    TipoDocSustentoItem[]
  >([]);
  const [tiposDocLoading, setTiposDocLoading] = useState(false);
  const [tipoDocSustentoId, setTipoDocSustentoId] = useState("");
  const [nroDocSustento, setNroDocSustento] = useState("");
  const [docSustento, setDocSustento] = useState("");

  // ── Imputación de monto (modo ajuste): "Total a Ajustar" +
  // botón "Imputar Monto". Tras validar, pide confirmación y registra la
  // compensación contra Rentas.sp_Compensarrecibosjson. ──
  const [totalAjustar, setTotalAjustar] = useState("");
  const [imputarAviso, setImputarAviso] = useState<string | null>(null);
  // Cargando el POST de la imputación (spinner + botón deshabilitado).
  const [imputando, setImputando] = useState(false);
  // Confirmación legacy antes de grabar (mensaje según pago a cuenta).
  const [imputarConfirmOpen, setImputarConfirmOpen] = useState(false);
  // Payload armado por handleImputarMonto a la espera del "Sí".
  const [imputarPendiente, setImputarPendiente] =
    useState<ImputarMontoPayload | null>(null);
  // Banner verde de éxito; se limpia en la siguiente acción del flujo.
  const [imputarExito, setImputarExito] = useState<string | null>(null);

  // ── Grid state ──
  const [rows, setRows] = useState<GridRow[]>([]);
  const [loadingDeuda, setLoadingDeuda] = useState(false);
  /** Last criterion used by handleMostrar — used to refresh the grid after
   *  side-effect actions (e.g. "Generar Deuda") that mutate the underlying
   *  debt records. null = no grid loaded yet. */
  const [lastCriterio, setLastCriterio] = useState<number | null>(null);
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
    setFiltroEstado("todo");
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
    setTiposDocSustento([]);
    setTiposDocLoading(false);
    setTipoDocSustentoId("");
    setNroDocSustento("");
    setDocSustento("");
    setTotalAjustar("");
    setImputarAviso(null);
    setImputando(false);
    setImputarConfirmOpen(false);
    setImputarPendiente(null);
    setImputarExito(null);
    setRows([]);
    setCollapsedGroups({});
    setLastCriterio(null);
    setDeudaError(null);
    setLoadingDeuda(false);
  }, []);

  useEffect(() => {
    if (!isOpen) resetState();
  }, [isOpen, resetState]);

  // ── Derived sums for selected rows ──
  const selected = rows.filter((r) => r.selected);
  const sumInsol = selected.reduce((s, r) => toNum(s) + toNum(r.impInsol), 0);
  const sumReaj = selected.reduce((s, r) => toNum(s) + toNum(r.impReaj), 0);
  const sumInteres = selected.reduce((s, r) => toNum(s) + toNum(r.interes), 0);
  const sumCosto = selected.reduce((s, r) => toNum(s) + toNum(r.costoEmision), 0);
  const sumTotal = selected.reduce((s, r) => toNum(s) + toNum(r.total), 0);

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
  const fmt = (n: unknown) => toNum(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        // La grilla del ajuste solo muestra recibos pendientes (estado 0)
        // con total mayor que cero y ubicación EM (emisión): un recibo en
        // cero no tiene deuda que imputar y cualquier otro estado/ubicación
        // (cancelado, por compensar, VT, etc.) queda fuera.
        const visibleRows = result.data.filter((r) => {
          const estado = (r as ImputarGridRow).estado ?? "";
          const ubica = (r.ubica ?? "").trim().toUpperCase();
          return toNum(r.total) > 0 && estado.trim() === "0" && ubica === "EM";
        });
        setRows(visibleRows.map((r) => ({ ...r, selected: false })));
        setCollapsedGroups({}); // fresh results start fully expanded
        setLastCriterio(criterio);
      } else {
        setDeudaError(result.error);
        setRows([]);
      }
    } finally {
      if (queryId === queryIdRef.current) setLoadingDeuda(false);
    }
  };

  // ── "Imputar Monto" (modo ajuste): valida los campos del
  // documento de sustento y que haya deuda seleccionada en la tabla, arma
  // el payload legacy de sp_Compensarrecibosjson (las filas marcadas como
  // @dataxml, el total a ajustar como @montoacuenta y el total de la
  // selección como @monto) y pide confirmación antes de grabar. ──
  const handleImputarMonto = () => {
    setImputarExito(null);
    if (!nroDocSustento.trim()) {
      setImputarAviso("Ingrese el Nro. Doc. de sustento.");
      return;
    }
    if (!docSustento.trim()) {
      setImputarAviso("Ingrese el Doc. Sustento.");
      return;
    }
    if (!tipoDocSustentoId) {
      setImputarAviso("Seleccione el Tipo Doc.");
      return;
    }
    if (!totalAjustar.trim()) {
      setImputarAviso("Ingrese el Total a Ajustar.");
      return;
    }
    if (!rows.some((r) => r.selected)) {
      setImputarAviso("Seleccione al menos un recibo de la tabla de deuda.");
      return;
    }
    setImputarAviso(null);
    // Misma selección que sumTotal: el total de las filas marcadas viaja
    // como @monto (legacy txt_total) y el "Total a Ajustar" como
    // @montoacuenta (legacy txtMontoajustar).
    const montoTotal = sumTotal;
    const montoAjustar = Number(totalAjustar);
    setImputarPendiente({
      codigo: contribuyente?.codigo ?? contribuyenteCodigo,
      nroDocSustento,
      docSustento,
      tipoDocSustento: tipoDocSustentoId,
      montoAjustar,
      montoTotal,
      operador: getStoredUser()?.username ?? "",
      recibos: selected.map(toReciboCompensar),
    });
    setImputarConfirmOpen(true);
  };

  /** Segunda mitad de handleImputarMonto: registra la imputación y al
   *  éxito limpia el sustento, refresca la grilla con el mismo criterio
   *  (igual que onSaved de GenerarDeudaModal) y muestra el banner verde. */
  async function ejecutarImputacion(payload: ImputarMontoPayload) {
    setImputando(true);
    try {
      const result = await imputarMontoAction(payload);
      if (!result.success) {
        setImputarAviso(result.error ?? "No se pudo registrar la imputación.");
        return;
      }
      setImputarAviso(null);
      setImputarExito("Imputación registrada correctamente.");
      // Limpieza del documento de sustento y del total para la
      // siguiente imputación.
      setNroDocSustento("");
      setDocSustento("");
      setTipoDocSustentoId("");
      setTotalAjustar("");
      // Re-consulta de la grilla con el criterio vigente para reflejar
      // la compensación de los recibos (legacy: mostrarRecContri()).
      if (lastCriterio !== null) await handleMostrar(lastCriterio);
    } catch (error) {
      // La Server Action puede rechazar en el transporte (payload no
      // serializable, error del server de Next, corte de red) antes de
      // devolver el objeto { success }. Sin este catch el finally apagaba
      // el spinner y el usuario no veía ningún mensaje.
      setImputarAviso(
        error instanceof Error && error.message
          ? `Error al registrar la imputación: ${error.message}`
          : "Error inesperado al registrar la imputación.",
      );
    } finally {
      setImputando(false);
      setImputarPendiente(null);
    }
  }

  // ── "Generar Liquidación": collect selected receipts → POST → show report in modal ──

  const modalId = useModalStack(isOpen);

  // ── Escape to close ──
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopModal(modalId)) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, modalId, onClose]);

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

  // ── Documento de Sustento: combo de tipos (solo en modo ajuste) ──
  // Se carga una vez al abrir el modal del ajuste; el combo es accesorio,
  // así que un fallo solo se registra en consola y no bloquea el modal.
  // Se difiere un tick para no llamar setState sincrónicamente dentro del
  // efecto (mismo workaround que la búsqueda automática de cobranza).
  useEffect(() => {
    if (!isOpen || !contribuyenteCodigo) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setTiposDocLoading(true);
      const result = await getTiposDocSustentoAction();
      if (cancelled) return;
      if (result.success) {
        setTiposDocSustento(result.data);
      } else {
        console.error("[EstadoCuentaAjusteModal] tipos doc sustento:", result.error);
      }
      setTiposDocLoading(false);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
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
          {/* Modo Ajuste: padding vertical reducido ~30% (12px → 8px) para
              compactar el grupo;  */}
          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
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

          {/* ── 1b. Documento de Sustento (solo en modo ajuste: ajuste
              de cuenta corriente; en DJ no existe). Los tres controles
              alimentan la imputación de monto (nro/doc/tipo viajan al SP
              sp_Compensarrecibosjson). ── */}
                    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
            <legend className="px-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Documento de Sustento
            </legend>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex w-32 flex-col gap-0.5">
                <label
                  htmlFor="ajuste-nro-doc"
                  className="text-[10px] font-semibold text-slate-400 uppercase"
                >
                  Nro. Doc.
                </label>
                <input
                  id="ajuste-nro-doc"
                  type="text"
                  value={nroDocSustento}
                  onChange={(e) => setNroDocSustento(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700"
                />
              </div>
              {/* Doc. Sustento. ocupa la mitad del ancho que venía tomando
                  (antes era flex-1 y estiraba todo el sobrante de la fila). */}
              <div className="flex w-75 flex-col gap-0.5">
                <label
                  htmlFor="ajuste-doc-sustento"
                  className="text-[10px] font-semibold text-slate-400 uppercase"
                >
                  Doc. Sustento.
                </label>
                <input
                  id="ajuste-doc-sustento"
                  type="text"
                  value={docSustento}
                  onChange={(e) => setDocSustento(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700"
                />
              </div>
              {/* Combo Tipo Doc. ampliado un 50% (w-47.5 → w-71.25). */}
              <div className="flex w-71.25 flex-col gap-0.5">
                <label
                  htmlFor="ajuste-tipo-doc"
                  className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase"
                >
                  {tiposDocLoading && (
                    <Loader2 size={10} className="animate-spin" />
                  )}
                  Tipo Doc.
                </label>
                <select
                  id="ajuste-tipo-doc"
                  value={tipoDocSustentoId}
                  onChange={(e) => setTipoDocSustentoId(e.target.value)}
                  disabled={tiposDocLoading}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {/* Placeholder legacy del combo #tipo_doc_sustento del PHP. */}
                  <option value="">[Seleccione]</option>
                  {tiposDocSustento.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* ── 1c. Imputación de monto (solo en modo ajuste: caja
              "Total a Ajustar" + botón "Imputar Monto". Tras confirmar,
              registra la compensación contra Rentas.sp_Compensarrecibosjson
              con las filas seleccionadas). ── */}
                    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
            <legend className="px-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Imputación de Monto
            </legend>
            <div className="flex flex-wrap items-end gap-3">
              {/* "Total a Ajustar" en la misma línea que su caja: label +
                  input en fila (antes el label iba arriba). */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="ajuste-total"
                  className="whitespace-nowrap text-[10px] font-semibold text-slate-400 uppercase"
                >
                  Total a Ajustar
                </label>
                <input
                  id="ajuste-total"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={totalAjustar}
                  onChange={(e) => setTotalAjustar(sanitizeMontoAjuste(e.target.value))}
                  onBlur={() =>
                    // Punto colgante: "123." se normaliza a "123".
                    setTotalAjustar((prev) => prev.replace(/\.$/, ""))
                  }
                  className="w-40 rounded border border-slate-300 bg-white px-2 py-1 text-right text-[11px] text-slate-700"
                />
              </div>
              <button
                type="button"
                aria-label="Imputar Monto"
                title="Imputar Monto"
                disabled={!totalAjustar.trim() || imputando}
                onClick={() => handleImputarMonto()}
                className="inline-flex min-w-[110px] items-center justify-center gap-1.5 rounded px-2.5 py-1 text-[10px] font-medium text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 bg-sat-cyan hover:bg-cyan-600"
              >
                {imputando && <Loader2 size={10} className="animate-spin" />}
                Imputar Monto
              </button>
              {/* Aviso/éxito en la MISMA línea que los controles: ocupan el
                  sobrante de la fila y bajan solo si no hay ancho (wrap). */}
              {imputarAviso && (
                <div className="min-w-[180px] flex-1 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] text-red-700">
                  {imputarAviso}
                </div>
              )}
              {imputarExito && (
                <div className="min-w-[180px] flex-1 rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] text-emerald-700">
                  {imputarExito}
                </div>
              )}
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
            {/* Modo Ajuste: altura FIJA (no max-h) para que la ventana no
                cambie de tamaño al mostrar resultados; el alto alcanza para
                la cabecera de la tabla + una cabecera de grupo + 5
                registros, y el resto se navega con scroll interno. En DJ se
                */}
            {deudaError ? (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                {deudaError}
              </div>
            ) : (
            <div className="overflow-auto rounded border border-slate-200 bg-white h-[184px] mb-[18px]">
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

          {/* ── 5. Barra de acciones del ajuste: solo "Mostrar" ── */}
          <div className="flex flex-wrap items-center justify-between gap-y-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
            <div className="flex flex-wrap gap-1.5">
              {ACTION_BUTTONS.filter((b) => b.label === "Mostrar").map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  disabled={loadingDeuda}
                  onClick={() => {
                    if (btn.criterio !== undefined) {
                      handleMostrar(btn.criterio);
                    }
                  }}
                  className={`inline-flex min-w-[110px] items-center justify-center gap-1.5 rounded px-2.5 py-1 text-[10px] font-medium text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${
                    btn.primary
                      ? "bg-sat-cyan hover:bg-cyan-600"
                      : "bg-slate-600 hover:bg-slate-700"
                  }`}
                >
                  {loadingDeuda && btn.criterio !== undefined && (
                    <Loader2 size={10} className="animate-spin" />
                  )}
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* ══ Confirm: imputación de monto (modo ajuste). Mensajes
          legacy del PHP: si el total a ajustar no cubre el total
          seleccionado (pago a cuenta) avisa antes de cancelar. ══ */}
      <ConfirmDialog
        isOpen={imputarConfirmOpen}
        title="Imputar Monto"
        message={
          imputarPendiente
            ? imputarPendiente.montoTotal > imputarPendiente.montoAjustar &&
                imputarPendiente.montoAjustar > 0
              ? "Se realizara pago a cuenta, Seguro de Cancelar?"
              : "Seguro de Cancelar?"
            : ""
        }
        confirmLabel="Sí"
        cancelLabel="No"
        onConfirm={() => {
          const payload = imputarPendiente;
          setImputarConfirmOpen(false);
          if (!payload) {
            // Sin payload no hay nada que enviar: avisar en vez de
            // cerrar el diálogo en silencio.
            setImputarAviso(
              "No se pudo preparar la imputación. Verifique los datos e intente nuevamente.",
            );
            return;
          }
          void ejecutarImputacion(payload);
        }}
        onCancel={() => {
          setImputarConfirmOpen(false);
          setImputarPendiente(null);
        }}
      />


    </div>
  );
}
