"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, History, RotateCcw } from "lucide-react";
import {
  getHistorialBajaCabeceraAction,
  getHistorialPuAction,
  getHistorialPisosAction,
  getHistorialInstalacionesAction,
  restaurarBajaPredioAction,
  type HistorialBajaCabecera,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import ConfirmDialog from "@/components/confirm-dialog";
import { getStoredUser, getPcName } from "@/lib/api";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";

// Legacy popup rentas/historicobajapredio (frmbajapredio + js_historicobajapredio.js):
// header "Datos Generales del Predios:" + 3 grids (PU, Pisos, Instalaciones)
// + checkbox selection on PU highlighting same-year rows in the other grids.
// Restaurar = legacy rentas/restaurarregistro: one POST per selected PU row,
// then the popup closes and the parent list refetches.

interface CabeceraInput {
  codigo: string;
  codPred: string;
  anno: string;
  anexo: string;
  subAnexo: string;
  codhistorial: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cabecera: CabeceraInput | null;
  // Called after a successful restore so the parent can refetch its list.
  onRestored?: () => void;
}

// ─── Row types (field names = legacy Ext models; filled in phase 2) ──

export interface HistorialPuRow {
  anno: string;
  uso: string;
  condi: string;
  estado: string;
  tipo: string;
  num_pisos: string;
  frontis: string;
  total_area_constru: string;
  area_terreno: string;
  area_comun: string;
  arancel: string;
  val_total_terreno: string;
  val_total_constru: string;
  val_total_instala: string;
  val_autoavaluo: string;
  // Drift fix: the legacy controller emits `porc_propiedad` (row[15]); the
  // phase-1 scaffold's `porcen_propiedad` never matched, so the legacy grid
  // silently showed blank for this column.
  porc_propiedad: string;
  total_autoavaluo: string;
  fecha_de_baja: string;
  cod_baja: string;
}

export interface HistorialPisoRow {
  anno: string;
  niv_piso: string;
  ano_cons: string;
  anno_antig: string;
  depcla: string;
  depmat: string;
  depcon: string;
  cate_muros: string;
  cate_techos: string;
  cate_pisos: string;
  cate_puert: string;
  cate_reves: string;
  cate_banno: string;
  cate_insel: string;
  val_unitar: string;
  incremento: string;
  por_deprec: string;
  val_deprec: string;
  val_un_dep: string;
  area_const: string;
  valo_const: string;
  const_afec: string;
  porc_propiedad: string;
  fecha_de_baja: string;
  cod_baja: string;
}

export interface HistorialInstalacionRow {
  anno: string;
  item_instalacion: string;
  descri_gener: string;
  ano_cons: string;
  anno_antig: string;
  depcla: string;
  depmat: string;
  depcon: string;
  alto: string;
  largo: string;
  ancho: string;
  val_estima: string;
  val_unitar: string;
  por_deprec: string;
  val_deprec: string;
  val_un_dep: string;
  cantidad: string;
  val_instalac: string;
  insta_afect: string;
  fecha_de_baja: string;
  cod_baja: string;
}

// ─── Column specs (exact legacy column sets; cod_baja hidden) ────────

interface Col<TRow> {
  key: keyof TRow & string;
  header: string;
  numeric?: boolean;
}

const PU_COLS: Col<HistorialPuRow>[] = [
  { key: "anno", header: "Año" },
  { key: "uso", header: "Uso" },
  { key: "condi", header: "Cond. Prop." },
  { key: "estado", header: "Estado Prop." },
  { key: "tipo", header: "Tipo Predio" },
  { key: "num_pisos", header: "N° Pisos", numeric: true },
  { key: "frontis", header: "Frontis", numeric: true },
  { key: "total_area_constru", header: "T. Area Const.", numeric: true },
  { key: "area_terreno", header: "Area Terreno", numeric: true },
  { key: "area_comun", header: "Area Comun.", numeric: true },
  { key: "arancel", header: "Arancel", numeric: true },
  { key: "val_total_terreno", header: "Val. T. Terreno", numeric: true },
  { key: "val_total_constru", header: "Val. T. Const.", numeric: true },
  { key: "val_total_instala", header: "Val. T. Inst.", numeric: true },
  { key: "val_autoavaluo", header: "V. Autovaluo", numeric: true },
  { key: "porc_propiedad", header: "Porc. prop.", numeric: true },
  { key: "total_autoavaluo", header: "T. Autoavaluo.", numeric: true },
  { key: "fecha_de_baja", header: "F. de Baja" },
];

const PISOS_COLS: Col<HistorialPisoRow>[] = [
  { key: "anno", header: "Año" },
  { key: "niv_piso", header: "Niv. Pisos" },
  { key: "ano_cons", header: "Año Const." },
  { key: "anno_antig", header: "Año Antig." },
  { key: "depcla", header: "Clasif." },
  { key: "depmat", header: "Material" },
  { key: "depcon", header: "Condicion" },
  { key: "cate_muros", header: "Muros" },
  { key: "cate_techos", header: "Techos" },
  { key: "cate_pisos", header: "Pisos" },
  { key: "cate_puert", header: "Puertas" },
  { key: "cate_reves", header: "Revest." },
  { key: "cate_banno", header: "Baños" },
  { key: "cate_insel", header: "Inst. Electr." },
  { key: "porc_propiedad", header: "Porc. prop.", numeric: true },
  { key: "val_unitar", header: "Val. Unitario", numeric: true },
  { key: "incremento", header: "Incremento", numeric: true },
  { key: "por_deprec", header: "Porc. Deprec.", numeric: true },
  { key: "val_deprec", header: "Val. Deprec.", numeric: true },
  { key: "val_un_dep", header: "Val. Un. Deprec.", numeric: true },
  { key: "area_const", header: "A. Const.", numeric: true },
  { key: "valo_const", header: "Val. Const.", numeric: true },
  { key: "const_afec", header: "Const. Afec." },
  { key: "fecha_de_baja", header: "Fecha de Baja" },
];

const INSTAL_COLS: Col<HistorialInstalacionRow>[] = [
  { key: "anno", header: "Año" },
  { key: "item_instalacion", header: "Item Inst." },
  { key: "descri_gener", header: "Descripcion" },
  { key: "ano_cons", header: "Año Const." },
  { key: "anno_antig", header: "Año Antig." },
  { key: "depcla", header: "Clasif." },
  { key: "depmat", header: "Material" },
  { key: "depcon", header: "Condicion" },
  { key: "alto", header: "Alto", numeric: true },
  { key: "ancho", header: "Ancho", numeric: true },
  { key: "val_estima", header: "Val. Estima.", numeric: true },
  { key: "val_unitar", header: "Val. Unit.", numeric: true },
  { key: "por_deprec", header: "Porc. Deprec.", numeric: true },
  { key: "val_deprec", header: "Val. Deprec.", numeric: true },
  { key: "cantidad", header: "Cantidad", numeric: true },
  { key: "val_instalac", header: "Val. Instalac.", numeric: true },
  { key: "fecha_de_baja", header: "Fecha de Baja" },
];

const thClass =
  "whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100";
const tdClass = "whitespace-nowrap px-2 py-1 text-[10px] text-slate-700";

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center text-[11px] text-slate-400">
        Sin datos
      </td>
    </tr>
  );
}

// Generic small grid: legacy-style white table, row-number column.
function HistorialGrid<TRow extends { anno: string }>({
  title,
  cols,
  rows,
  extraFirstCol,
  highlightAnnos,
  loading,
  error,
}: {
  title: string;
  cols: Col<TRow>[];
  rows: TRow[];
  extraFirstCol?: (row: TRow, idx: number) => React.ReactNode;
  highlightAnnos?: Set<string>;
  loading?: boolean;
  error?: string | null;
}) {
  const colSpan = cols.length + 1 + (extraFirstCol ? 1 : 0);
  return (
    <div>
      <h3 className="mb-1 text-[11px] font-semibold text-sat-navy">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className={`${thClass} w-8`}>N°</th>
              {extraFirstCol && <th className={`${thClass} w-8`} />}
              {cols.map((c) => (
                <th key={c.key} className={thClass}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-6 text-center text-[11px] text-slate-400">
                  <Loader2 size={14} className="mx-auto mb-1 animate-spin text-sat-cyan" />
                  Cargando...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-6 text-center text-[11px] text-red-500">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={colSpan} />
            ) : (
              rows.map((row, idx) => {
                const highlighted = highlightAnnos?.has(row.anno) ?? false;
                return (
                  <tr
                    key={idx}
                    className={highlighted ? "bg-sky-100" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
                  >
                    <td className={`${tdClass} text-center text-slate-500`}>{idx + 1}</td>
                    {extraFirstCol && extraFirstCol(row, idx)}
                    {cols.map((c) => (
                      <td
                        key={c.key}
                        className={`${tdClass} ${c.numeric ? "text-right" : "text-left"}`}
                      >
                        {String(row[c.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HistorialBajaPredioModal({ isOpen, onClose, cabecera, onRestored }: Props) {
  const [cab, setCab] = useState<HistorialBajaCabecera | null>(null);
  const [loadingCab, setLoadingCab] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Grid data (phase 2): each grid loads independently; a failed grid shows
  // an error row inside its own table.
  const [puRows, setPuRows] = useState<HistorialPuRow[]>([]);
  const [pisosRows, setPisosRows] = useState<HistorialPisoRow[]>([]);
  const [instalRows, setInstalRows] = useState<HistorialInstalacionRow[]>([]);
  const [loadingGrids, setLoadingGrids] = useState(false);
  const [puError, setPuError] = useState<string | null>(null);
  const [pisosError, setPisosError] = useState<string | null>(null);
  const [instalError, setInstalError] = useState<string | null>(null);

  // Restaurar flow (legacy btnRestaurar + confirm).
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restaurarMsg, setRestaurarMsg] = useState<{ kind: "error" | "warn"; text: string } | null>(null);

  // Legacy CheckboxModel on PU: selecting PU rows highlights same-anno rows
  // in Pisos and Instalaciones.
  const [checkedPuKeys, setCheckedPuKeys] = useState<Set<string>>(new Set());
  const puKey = (r: HistorialPuRow, idx: number) => `${r.anno}-${idx}`;
  const selectedAnnos = new Set(
    puRows.filter((r, idx) => checkedPuKeys.has(puKey(r, idx))).map((r) => r.anno),
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const modalId = useModalStack(isOpen);
  const topModal = isTopModal(modalId);

  // Escape closes this modal only when it is the top of the stack.
  useEffect(() => {
    if (!isOpen || !topModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, topModal, onClose]);

  // Load header on open
  useEffect(() => {
    if (!isOpen || !cabecera) return;
    setCab(null);
    setError(null);
    setCheckedPuKeys(new Set());
    setPuRows([]);
    setPisosRows([]);
    setInstalRows([]);
    setPuError(null);
    setPisosError(null);
    setInstalError(null);
    setRestaurarMsg(null);
    setConfirmOpen(false);
    let cancelled = false;
    (async () => {
      // Header + 3 grids load in parallel; each grid failure is local.
      setLoadingCab(true);
      setLoadingGrids(true);
      const [cabRes, puRes, pisosRes, instalRes] = await Promise.all([
        getHistorialBajaCabeceraAction({
          codigo: cabecera.codigo,
          codPred: cabecera.codPred,
          anno: cabecera.anno,
          anexo: cabecera.anexo,
          subAnexo: cabecera.subAnexo,
          codhistorial: cabecera.codhistorial,
        }),
        getHistorialPuAction(cabecera.codhistorial),
        getHistorialPisosAction(cabecera.codhistorial),
        getHistorialInstalacionesAction(cabecera.codhistorial),
      ]);
      if (cancelled) return;
      if (cabRes.success) setCab(cabRes.data);
      else setError(cabRes.error);
      if (puRes.success) setPuRows(puRes.data);
      else setPuError(puRes.error);
      if (pisosRes.success) setPisosRows(pisosRes.data);
      else setPisosError(pisosRes.error);
      if (instalRes.success) setInstalRows(instalRes.data);
      else setInstalError(instalRes.error);
      setLoadingCab(false);
      setLoadingGrids(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, cabecera]);

  useEffect(() => {
    if (isOpen) rootRef.current?.focus();
  }, [isOpen]);

  // Legacy btnRestaurar: requires at least one selected PU row.
  const handleRestaurarClick = () => {
    if (checkedPuKeys.size === 0) {
      setRestaurarMsg({ kind: "warn", text: "Seleccione al menos una fila para restaurar." });
      return;
    }
    setRestaurarMsg(null);
    setConfirmOpen(true);
  };

  // Legacy rentas/restaurarregistro: one POST per selected row, sequential
  // like js_historicobajapredio.js. On full success the popup closes.
  const handleConfirmRestaurar = async () => {
    if (!cabecera) return;
    setRestoring(true);
    setRestaurarMsg(null);
    const usuarioRestaura = getStoredUser()?.username?.toUpperCase() ?? "";
    const pcRestaura = getPcName?.() ?? "";
    const errores: string[] = [];
    for (const [row, idx] of puRows.map((r, i) => [r, i] as const)) {
      if (!checkedPuKeys.has(puKey(row, idx))) continue;
      const res = await restaurarBajaPredioAction({
        cod_baja: row.cod_baja,
        anno: row.anno,
        cod_pred: cab ? cab.cod_pred : cabecera.codPred,
        anexo: cab ? cab.anexo : cabecera.anexo,
        sub_anexo: cab ? cab.sub_anexo : cabecera.subAnexo,
        codigo: cab ? cab.codigo : cabecera.codigo,
        annobaja: cab ? cab.anno : cabecera.anno,
        usuariorestaura: usuarioRestaura,
        pcrestaura: pcRestaura,
      });
      if (!res.success) errores.push(res.error);
    }
    setRestoring(false);
    if (errores.length > 0) {
      setConfirmOpen(false);
      setRestaurarMsg({ kind: "error", text: errores.join(" | ") });
      return;
    }
    setConfirmOpen(false);
    onRestored?.();
    onClose();
  };

  if (!isOpen || !cabecera) return null;

  const labelClass = "text-[10px] font-semibold text-slate-400 uppercase tracking-wider";
  const valueClass = "text-[11px] font-medium text-slate-700";

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
      tabIndex={-1}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-6xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* ── Header (legacy popup title "Historial Baja de Predios") ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
            <History size={15} className="text-white/80" />
            <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
              Historial Baja de Predios
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

        {/* ── Body ── */}
        <div className="overflow-y-auto px-4 py-3 space-y-3">
          {/* Datos Generales del Predio */}
          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-3 pb-2.5 pt-0.5">
            <legend className="px-1 text-[10px] font-semibold text-sat-navy">
              Datos Generales del Predio:
            </legend>
            {loadingCab ? (
              <div className="flex items-center gap-2 py-3 text-[11px] text-slate-400">
                <Loader2 size={14} className="animate-spin text-sat-cyan" /> Cargando datos generales...
              </div>
            ) : error ? (
              <div className="py-3 text-[11px] text-red-500">{error}</div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 py-1 md:grid-cols-3">
                <div className="flex items-baseline gap-1.5">
                  <span className={labelClass}>Código:</span>
                  <span className={valueClass}>{cab?.codigo ?? cabecera.codigo}</span>
                </div>
                <div className="col-span-2 flex items-baseline gap-1.5">
                  <span className={labelClass}>Contribuyente:</span>
                  <span className={valueClass}>{cab?.nombre ?? ""}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={labelClass}>Código Pred.:</span>
                  <span className={valueClass}>{cab?.cod_pred ?? cabecera.codPred}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={labelClass}>Anexo:</span>
                  <span className={valueClass}>
                    {(cab ? cab.anexo : cabecera.anexo) + "-" + (cab ? cab.sub_anexo : cabecera.subAnexo)}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={labelClass}>Año:</span>
                  <span className={valueClass}>{cab?.anno ?? cabecera.anno}</span>
                </div>
                <div className="col-span-2 md:col-span-3 flex items-baseline gap-1.5">
                  <span className={labelClass}>Dirección Pred.:</span>
                  <span className={valueClass}>{cab?.direccion ?? ""}</span>
                </div>
              </div>
            )}
          </fieldset>

          {/* Grid PU (checkbox selection highlights same-anno rows below) */}
          <HistorialGrid<HistorialPuRow>
            title="Historial de Bajas de Predios"
            cols={PU_COLS}
            rows={puRows}
            loading={loadingGrids}
            error={puError}
            extraFirstCol={(row, idx) => (
              <td className="px-1 py-1 text-center">
                <input
                  type="checkbox"
                  checked={checkedPuKeys.has(puKey(row, idx))}
                  onChange={() =>
                    setCheckedPuKeys((prev) => {
                      const next = new Set(prev);
                      const key = puKey(row, idx);
                      if (next.has(key)) next.delete(key); else next.add(key);
                      return next;
                    })
                  }
                  className="h-3.5 w-3.5 accent-cyan-600 cursor-pointer"
                  aria-label={`Seleccionar año ${row.anno}`}
                />
              </td>
            )}
          />

          {/* Grid Pisos */}
          <HistorialGrid<HistorialPisoRow>
            title="Historial de Bajas de Pisos"
            cols={PISOS_COLS}
            rows={pisosRows}
            loading={loadingGrids}
            error={pisosError}
            highlightAnnos={selectedAnnos}
          />

          {/* Grid Instalaciones */}
          <HistorialGrid<HistorialInstalacionRow>
            title="Historial de Bajas de Instalaciones"
            cols={INSTAL_COLS}
            rows={instalRows}
            loading={loadingGrids}
            error={instalError}
            highlightAnnos={selectedAnnos}
          />
        </div>

        {/* ── Footer (legacy btnCerrar + btnRestaurar) ── */}
        <div className="flex items-center justify-end gap-2 rounded-b-xl border-t border-slate-200 bg-slate-50/60 px-4 py-2 shrink-0">
          {restaurarMsg && (
            <span
              className={`mr-auto text-[11px] ${restaurarMsg.kind === "error" ? "text-red-500" : "text-amber-600"}`}
              role="alert"
            >
              {restaurarMsg.text}
            </span>
          )}
          <button
            type="button"
            onClick={handleRestaurarClick}
            disabled={restoring || loadingGrids}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {restoring ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            Restaurar
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={restoring}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* ── Confirm restaurar (z-[200], above this z-[80] modal) ── */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Restaurar"
        message="¿Está seguro que desea restaurar los registros seleccionados?"
        confirmLabel="Sí"
        cancelLabel="No"
        loading={restoring}
        onConfirm={handleConfirmRestaurar}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
