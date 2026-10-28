"use client";

import { useEffect, useState } from "react";
import {
  FileSearch,
  Search,
  Loader2,
  SearchX,
  AlertCircle,
  ReceiptText,
} from "lucide-react";
import {
  buscarLiquidacionAction,
  type LiquidacionCabecera,
  type LiquidacionDetalleRow,
} from "@/actions/administracion-tributaria/compara-liquidacion";

// ─── Helpers ────────────────────────────────────────────────

// Formato de moneda del módulo (convención administracion-tributaria):
// es-PE con 2 decimales + prefijo S/.
// Solo se bloquea el número vacío a nivel cliente; la validación del
// formato (^\d{2}-\d{8}$) la hace el backend y desemboca en error.

const toNum = (value: unknown) => (typeof value === "number" ? value : Number(value) || 0);

export const fmtMoney = (value: unknown) =>
  toNum(value).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const fecha = iso.slice(0, 10);
  const [y, m, d] = fecha.split("-");
  return d && m && y ? `${d}/${m}/${y}` : "—";
};

// Datos que cada panel expone a la página para el exportador a PDF.
export interface PanelExportData {
  titulo: string;
  cabecera: LiquidacionCabecera | null;
  detalle: LiquidacionDetalleRow[];
}

type PanelState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; error: string }
  | { kind: "validacion"; error: string }
  | { kind: "no-encontrada" }
  | { kind: "cargada"; cabecera: LiquidacionCabecera; detalle: LiquidacionDetalleRow[] };

const detalleColumns: { key: keyof LiquidacionDetalleRow; label: string; align?: "right" }[] = [
  { key: "secuencia", label: "Sec." },
  { key: "tipo", label: "Tipo" },
  { key: "tipoRec", label: "Rec." },
  { key: "anno", label: "Año" },
  { key: "periodo", label: "Período" },
  { key: "impInsol", label: "Imp. Insoluto", align: "right" },
  { key: "impMora", label: "Imp. Mora", align: "right" },
  { key: "costoEmi", label: "Costo Emi.", align: "right" },
  { key: "total", label: "Total", align: "right" },
  { key: "nombre", label: "Nombre" },
  { key: "femision", label: "F. Emisión" },
];

const cellText = (row: LiquidacionDetalleRow, key: keyof LiquidacionDetalleRow) => {
  const value = row[key];
  return value === null || value === undefined || value === "" ? "—" : String(value);
};

// ─── Cabecera ───────────────────────────────────────────────

function CabeceraBlock({ cabecera, testId }: { cabecera: LiquidacionCabecera; testId: string }) {
  const fields: { label: string; value: string; mono?: boolean }[] = [
    { label: "Contribuyente (Código)", value: cabecera.codigo || "—", mono: true },
    { label: "Monto", value: `S/. ${fmtMoney(cabecera.monto)}` },
    { label: "Estado", value: cabecera.estado || "—" },
    { label: "Usuario", value: cabecera.usuario || "—" },
    { label: "Terminal", value: cabecera.terminal || "—", mono: true },
    { label: "F. Registro", value: fmtDate(cabecera.fregistro) },
    { label: "F. Vencimiento", value: fmtDate(cabecera.fvencimiento) },
    { label: "Observación", value: cabecera.observacion || "—" },
  ];

  return (
    <div data-testid={testId}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Cabecera
        </span>
        <span className="ml-auto text-xs font-semibold text-slate-700 font-outfit">
          {cabecera.numero}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-3 py-2.5">
        {fields.map((f) => {
          // La Observación es una cadena larga tipo %*,*-delimitada sin
          // espacios: ocupa las dos columnas del grid y quebra carácter a
          // carácter en lugar de truncarse.
          const isObservacion = f.label === "Observación";
          return (
            <div key={f.label} className={isObservacion ? "col-span-2" : "min-w-0"}>
              <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                {f.label}
              </dt>
              <dd
                className={`${
                  isObservacion ? "break-all" : "truncate"
                } text-[11px] text-slate-700 ${f.mono ? "font-mono" : ""} ${
                  f.label === "Monto" ? "font-semibold text-slate-800" : ""
                }`}
                title={f.value}
              >
                {f.value}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

// ─── Estados ────────────────────────────────────────────────

function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
      <div className="mb-3 rounded-full bg-sat-cyan/10 p-3">
        <FileSearch size={20} className="text-sat-cyan" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        Ingrese un número de liquidación
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Formato 26-00000001 y presione Buscar
      </p>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
      <div className="mb-3 rounded-full bg-red-100 p-3">
        <AlertCircle size={20} className="text-red-400" />
      </div>
      <p className="text-sm font-medium text-red-600">{error}</p>
    </div>
  );
}

function NoEncontradaState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <SearchX size={20} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        No existe una liquidación con el número ingresado
      </p>
    </div>
  );
}

// ─── Detalle ────────────────────────────────────────────────

function DetalleTable({ detalle }: { detalle: LiquidacionDetalleRow[] }) {
  return (
    <div className="border-t border-slate-100">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Detalle
        </span>
        <span className="ml-auto text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">{detalle.length}</span> registros
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse" data-testid="detalle-table">
          <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
            <tr>
              {detalleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`text-[10px] font-semibold text-white/90 uppercase px-2 py-2 border-b border-white/5 whitespace-nowrap ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {detalle.map((row, idx) => (
              <tr
                key={row.secuencia ?? idx}
                className={`transition hover:bg-slate-50 ${
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                }`}
              >
                {detalleColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-2 py-2 text-[11px] truncate whitespace-nowrap text-slate-600 ${
                      col.align === "right"
                        ? "text-right tabular-nums"
                        : "text-left"
                    }`}
                  >
                    {col.align === "right" ? fmtMoney(row[col.key]) : cellText(row, col.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Panel ──────────────────────────────────────────────────

interface ComparacionPanelProps {
  titulo: string;
  testIdPrefix: string;
  /** Informa a la página qué datos tiene cargados (o null) para el exportador a PDF. */
  onLoadedData?: (data: PanelExportData | null) => void;
}

export function ComparacionPanel({ titulo, testIdPrefix, onLoadedData }: ComparacionPanelProps) {
  const [numero, setNumero] = useState("");
  const [state, setState] = useState<PanelState>({ kind: "idle" });

  const loading = state.kind === "loading";

  useEffect(() => {
    if (!onLoadedData) return;
    onLoadedData(
      state.kind === "cargada"
        ? { titulo, cabecera: state.cabecera, detalle: state.detalle }
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, titulo]);

  const handleBuscar = async () => {
    const trimmed = numero.trim();
    if (!trimmed) {
      setState({ kind: "validacion", error: "Ingrese un número de liquidación válido" });
      return;
    }

    setState({ kind: "loading" });
    try {
      const result = await buscarLiquidacionAction(trimmed);
      if (!result.success) {
        setState({ kind: "error", error: result.error ?? "Error desconocido" });
        return;
      }
      if (result.cabecera === null) {
        setState({ kind: "no-encontrada" });
        return;
      }
      setState({ kind: "cargada", cabecera: result.cabecera, detalle: result.detalle });
    } catch {
      setState({ kind: "error", error: "Error de conexión" });
    }
  };

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col"
      data-testid={`panel-${testIdPrefix}`}
    >
      {/* Buscador del panel */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          {titulo}
        </span>
      </div>
      <div className="flex items-end gap-2 p-3">
        <div className="flex-1">
          <label
            htmlFor={`numero-${testIdPrefix}`}
            className="mb-1 block text-[9px] font-semibold uppercase tracking-wider text-slate-400"
          >
            Número de Liquidación
          </label>
          <input
            id={`numero-${testIdPrefix}`}
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="26-00000001"
            disabled={loading}
            className={`w-full rounded-md border px-2.5 py-1.5 text-[11px] font-mono text-slate-700 transition focus:outline-none focus:ring-2 ${
              state.kind === "validacion"
                ? "border-red-300 focus:border-red-400 focus:ring-red-200/60"
                : "border-slate-300 bg-white focus:border-sat-cyan focus:ring-sat-cyan/20"
            }`}
          />
        </div>
        <button
          type="button"
          onClick={handleBuscar}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <Search size={14} />
              Buscar
            </>
          )}
        </button>
      </div>

      {/* Resultado del panel */}
      <div className="flex-1">
        {state.kind === "idle" && <IdleState />}
        {state.kind === "validacion" && <ErrorState error={state.error} />}
        {state.kind === "error" && <ErrorState error={state.error} />}
        {state.kind === "no-encontrada" && <NoEncontradaState />}
        {state.kind === "cargada" && (
          <div className="animate-fade-in">
            <CabeceraBlock cabecera={state.cabecera} testId={`cabecera-${testIdPrefix}`} />
            <DetalleTable detalle={state.detalle} />
          </div>
        )}
      </div>
    </section>
  );
}
