"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, FileText, Search, SearchX } from "lucide-react";
import type {
  CabeceraProyectado,
  CatalogosProyectado,
  DetalleEstadoCuentaFilters,
  DetalleReciboProyectado,
  EstadoDetalleProyectado,
  RangoProyectado,
  ReciboEmitidoProyectado,
} from "@/actions/administracion-tributaria/estado-cuenta-proyectado";

export interface EstadoCuentaProyectadoDetalleViewProps {
  codigo: string;
  cabecera: CabeceraProyectado;
  catalogos: CatalogosProyectado;
  detalle: DetalleReciboProyectado[];
  recibos: ReciboEmitidoProyectado[];
  error: string | null;
  onMostrar: (filters: DetalleEstadoCuentaFilters) => void;
}

interface CheckboxOption {
  value: string;
  label: string;
  ariaLabel: string;
}

interface CheckboxGroupProps {
  legend: string;
  options: readonly CheckboxOption[];
  selected: string[];
  onToggle: (value: string) => void;
  wide?: boolean;
}

const PANEL_CLASS =
  "overflow-hidden rounded-lg border border-sat-navy/15 bg-clean-white shadow-sm";
const LEGEND_CLASS =
  "text-[10px] font-semibold uppercase tracking-wider text-sat-navy/70";
const TH_CLASS =
  "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-clean-white/90";
const TD_CLASS =
  "whitespace-nowrap px-3 py-2 text-left font-inter text-[11px] text-sat-navy";
const NUMERIC_CLASS = "tabular-nums text-right";
const CHECKBOX_CLASS =
  "h-4 w-4 rounded border-sat-navy/25 accent-sat-cyan focus:outline-none focus:ring-2 focus:ring-sat-cyan/40";

// Legacy values from rentascajaproyec/index.phtml:110-145 (conceptos) and
// :169-178 (arbitrios -> tiporec). Grouped codes stay in one checkbox value.
const CONCEPTOS: readonly CheckboxOption[] = [
  {
    value: "*02.01*,*00.16*,*30.02*,*30.03*,*30.04*,*00.46*",
    label: "Predial",
    ariaLabel: "Predial",
  },
  { value: "*11.00*,*00.47*", label: "Arbitrio", ariaLabel: "Arbitrio" },
  { value: "*12.23*", label: "Fracc.", ariaLabel: "Fracc." },
  { value: "*00.38*", label: "Alcabala", ariaLabel: "Alcabala" },
  {
    value: "*00.30*,*25.10*,*00.48*",
    label: "Imp. Vehicular",
    ariaLabel: "Imp. Vehicular",
  },
  {
    value: "*30.66*,*30.82*",
    label: "Multa Tributaria",
    ariaLabel: "Multa Tributaria",
  },
  {
    value: "*30.02*,*30.03*,*30.04*,*30.93*,*30.94*,*30.95*,*30.96*,*30.97*,*30.98*",
    label: "Costas",
    ariaLabel: "Costas",
  },
  { value: "*00.01*", label: "Fincas", ariaLabel: "Fincas" },
  {
    value: "*25.19*",
    label: "Cert. NoAdeudo",
    ariaLabel: "Cert. NoAdeudo",
  },
  { value: "*11.11*", label: "Varios", ariaLabel: "Varios" },
];

const ARBITRIOS: readonly CheckboxOption[] = [
  { value: "*11.02*", label: "Barrido Vías", ariaLabel: "Barrido Vías" },
  { value: "*11.01*", label: "Recol. Res.", ariaLabel: "Recol. Res." },
  { value: "*11.03*", label: "Parq. Jard.", ariaLabel: "Parq. Jard." },
  { value: "*11.04*", label: "Serenazgo.", ariaLabel: "Serenazgo." },
];

const ESTADOS: readonly { value: EstadoDetalleProyectado; label: string }[] = [
  { value: "0", label: "Pendiente" },
  { value: "1", label: "Cancelado" },
  { value: "%", label: "Todos" },
];

const DETALLE_COLUMNS: readonly string[] = [
  "Descripción",
  "Tributo",
  "Año",
  "Predio",
  "Anexo",
  "Período",
  "Imp. Insol",
  "Imp. Reaj",
  "Interés",
  "Costo Emis.",
  "Tot. Pago",
  "(Bnf)",
  "Total",
];

/** Port of the legacy min..max checkbox generation, including zero padding. */
function expandRange(range: RangoProyectado): string[] {
  const from = Number(range.minimo);
  const to = Number(range.maximo);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) return [];
  const width = range.minimo.trim().length;
  const pad =
    /^\d+$/.test(range.minimo) &&
    width === range.maximo.trim().length &&
    to - from < 500;
  const values: string[] = [];
  for (let value = from; value <= to && values.length < 500; value += 1) {
    values.push(pad ? String(value).padStart(width, "0") : String(value));
  }
  return values;
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

function formatCell(value: string): string {
  return value.trim() === "" ? "—" : value;
}

function toAmount(value: string | number): number {
  const parsed =
    typeof value === "number" ? value : Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: string | number): string {
  return toAmount(value).toFixed(2);
}

function CheckboxGroup({
  legend,
  options,
  selected,
  onToggle,
  wide = false,
}: CheckboxGroupProps) {
  return (
    <fieldset className="min-w-0">
      <legend className={`mb-2 ${LEGEND_CLASS}`}>{legend}</legend>
      <div
        className={`max-h-32 space-y-1 overflow-y-auto rounded-md border border-sat-navy/10 bg-sat-navy/[0.03] p-2 ${
          wide ? "min-w-[16rem]" : ""
        }`}
      >
        {options.length === 0 ? (
          <p className="font-inter text-[11px] text-sat-navy/70">Sin opciones</p>
        ) : (
          options.map((option) => (
            <label
              key={option.value}
              className="flex min-h-8 cursor-pointer items-center gap-2 text-[11px] font-medium text-sat-navy/80"
            >
              <input
                type="checkbox"
                value={option.value}
                aria-label={option.ariaLabel}
                checked={selected.includes(option.value)}
                onChange={() => onToggle(option.value)}
                className={CHECKBOX_CLASS}
              />
              {option.label}
            </label>
          ))
        )}
      </div>
    </fieldset>
  );
}

export default function EstadoCuentaProyectadoDetalleView({
  codigo,
  cabecera,
  catalogos,
  detalle,
  error,
  onMostrar,
}: EstadoCuentaProyectadoDetalleViewProps) {
  const [annos, setAnnos] = useState<string[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [tiporec, setTiporec] = useState<string[]>([]);
  const [perio, setPerio] = useState<string[]>([]);
  const [predio, setPredio] = useState<string[]>([]);
  const [estado, setEstado] = useState<EstadoDetalleProyectado>("0");
  const [fechaProyectada, setFechaProyectada] = useState(
    catalogos.fechaProyectada,
  );

  const annoOptions = useMemo(
    () =>
      expandRange(catalogos.annos).map((value) => ({
        value,
        label: value,
        ariaLabel: `Año ${value}`,
      })),
    [catalogos.annos],
  );
  const periodoOptions = useMemo(
    () =>
      expandRange(catalogos.periodos).map((value) => ({
        value,
        label: value,
        ariaLabel: `Período ${value}`,
      })),
    [catalogos.periodos],
  );
  const predioOptions = useMemo(
    () =>
      catalogos.predios.map((item) => ({
        value: item.cod_pred,
        label: `${item.cod_pred} · ${item.anexo1} · ${item.direccion}`,
        ariaLabel: `Predio ${item.cod_pred}`,
      })),
    [catalogos.predios],
  );

  const totals = useMemo(
    () =>
      detalle.reduce(
        (accumulator, row) => ({
          costoEmis: accumulator.costoEmis + toAmount(row.costo_emis),
          totPagado: accumulator.totPagado + toAmount(row.tot_pagado),
          benefic: accumulator.benefic + toAmount(row.benefic),
          total: accumulator.total + toAmount(row.total),
        }),
        { costoEmis: 0, totPagado: 0, benefic: 0, total: 0 },
      ),
    [detalle],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onMostrar({
      annos,
      tipos,
      tiporec,
      perio,
      predio,
      estado,
      fecha_proyectada: fechaProyectada,
    });
  };

  return (
    <div className="space-y-4">
      <section
        aria-labelledby="detalle-cabecera-title"
        className="overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy to-sat-navy/70 px-5 py-4 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              id="detalle-cabecera-title"
              className="font-outfit text-lg font-bold tracking-tight text-clean-white"
            >
              Estado de Cuenta Proyectado
            </h1>
            <p className="mt-0.5 font-inter text-xs text-clean-white/80">
              Consulta de solo lectura del contribuyente {codigo}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-clean-white/25 px-2.5 py-1 font-inter text-[10px] text-clean-white/90">
            <FileText size={13} aria-hidden="true" />
            Proyección {catalogos.fechaProyectada}
          </span>
        </div>
        <section aria-label="Datos del contribuyente">
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:w-1/2">
            <div>
              <dt className="font-inter text-[10px] uppercase tracking-wider text-clean-white/70">
                Código
              </dt>
              <dd className="mt-0.5 text-[11px] font-semibold tabular-nums text-clean-white">
                {cabecera.codigo}
              </dd>
            </div>
            <div>
              <dt className="font-inter text-[10px] uppercase tracking-wider text-clean-white/70">
                Contribuyente
              </dt>
              <dd className="mt-0.5 text-[11px] font-semibold text-clean-white">
                {cabecera.nombre}
              </dd>
            </div>
            <div>
              <dt className="font-inter text-[10px] uppercase tracking-wider text-clean-white/70">
                Dirección
              </dt>
              <dd className="mt-0.5 font-inter text-[11px] text-clean-white/90">
                {cabecera.dirfiscal}
              </dd>
            </div>
            <div>
              <dt className="font-inter text-[10px] uppercase tracking-wider text-clean-white/70">
                Nro. Documento
              </dt>
              <dd className="mt-0.5 font-inter text-[11px] tabular-nums text-clean-white/90">
                {cabecera.num_doc}
              </dd>
            </div>
          </dl>
        </section>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-sat-amber/40 bg-sat-amber/10 px-4 py-3 font-inter text-sm text-sat-navy"
        >
          <AlertCircle size={16} aria-hidden="true" />
          {error}
        </div>
      )}

      <section className={PANEL_CLASS} aria-labelledby="detalle-filtros-title">
        <div className="flex items-center gap-2 border-b border-sat-navy/10 bg-gradient-to-r from-sat-navy/5 to-clean-white px-3 py-2">
          <span className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
          <h2
            id="detalle-filtros-title"
            className="text-[10px] font-semibold uppercase tracking-widest text-sat-navy/70"
          >
            Filtros
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <fieldset>
            <legend className={`mb-2 ${LEGEND_CLASS}`}>Estado</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {ESTADOS.map((option) => (
                <label
                  key={option.value}
                  className="inline-flex min-h-11 items-center gap-2 text-[11px] font-medium text-sat-navy/80"
                >
                  <input
                    type="radio"
                    name="estadoDetalle"
                    value={option.value}
                    checked={estado === option.value}
                    onChange={() => setEstado(option.value)}
                    className={CHECKBOX_CLASS}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="fechaProyectada"
              className="text-[9px] font-semibold uppercase tracking-wider text-sat-navy/70"
            >
              Fecha de proyección
            </label>
            <input
              id="fechaProyectada"
              name="fechaProyectada"
              type="text"
              value={fechaProyectada}
              onChange={(event) => setFechaProyectada(event.target.value)}
              className="h-9 w-40 rounded-md border border-sat-navy/25 bg-clean-white px-2.5 font-inter text-[11px] text-sat-navy tabular-nums focus:border-sat-cyan focus:outline-none focus:ring-2 focus:ring-sat-cyan/30"
            />
          </div>

          <div className="flex flex-wrap items-start gap-4">
            <CheckboxGroup
              legend="Concepto"
              options={CONCEPTOS}
              selected={tipos}
              onToggle={(value) => setTipos((current) => toggleValue(current, value))}
            />
            <CheckboxGroup
              legend="Arbitrio"
              options={ARBITRIOS}
              selected={tiporec}
              onToggle={(value) => setTiporec((current) => toggleValue(current, value))}
            />
            <CheckboxGroup
              legend="Período"
              options={periodoOptions}
              selected={perio}
              onToggle={(value) => setPerio((current) => toggleValue(current, value))}
            />
            <CheckboxGroup
              legend="Año"
              options={annoOptions}
              selected={annos}
              onToggle={(value) => setAnnos((current) => toggleValue(current, value))}
            />
            <CheckboxGroup
              legend="Predio"
              options={predioOptions}
              selected={predio}
              onToggle={(value) => setPredio((current) => toggleValue(current, value))}
              wide
            />
          </div>

          <div className="flex justify-end border-t border-sat-navy/10 pt-3">
            <button
              type="submit"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-2 text-[11px] font-semibold text-sat-navy shadow-sm transition hover:bg-sat-cyan/90 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
            >
              <Search size={14} aria-hidden="true" />
              Mostrar
            </button>
          </div>
        </form>
      </section>

      <section className={PANEL_CLASS} aria-labelledby="detalle-grid-title">
        <div className="flex items-center gap-2 border-b border-sat-navy/10 bg-gradient-to-r from-sat-navy/5 to-clean-white px-3 py-2">
          <span className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
          <h2
            id="detalle-grid-title"
            className="text-[10px] font-semibold uppercase tracking-widest text-sat-navy/70"
          >
            Recibos del contribuyente
          </h2>
        </div>
        <div className="overflow-x-auto p-2.5">
          <table className="w-full min-w-[1180px] table-fixed border-collapse">
            <caption className="sr-only" id="detalle-table-caption">
              Detalle de recibos
            </caption>
            <thead className="bg-gradient-to-r from-sat-navy to-sat-navy/80">
              <tr>
                {DETALLE_COLUMNS.map((column) => (
                  <th key={column} scope="col" className={TH_CLASS}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-sat-navy/10">
              {detalle.length === 0 ? (
                <tr>
                  <td
                    colSpan={DETALLE_COLUMNS.length}
                    className="py-10 text-center"
                  >
                    <SearchX
                      size={22}
                      className="mx-auto text-sat-navy/70"
                      aria-hidden="true"
                    />
                    <span className="mt-2 block font-inter text-sm font-medium text-sat-navy/80">
                      No se encontraron registros de detalle
                    </span>
                  </td>
                </tr>
              ) : (
                <>
                  {detalle.map((row, index) => (
                    <tr
                      key={`${row.idrecibo}-${index}`}
                      className="transition hover:bg-sat-navy/5"
                    >
                      <td className={TD_CLASS}>{formatCell(row.des_cabecera)}</td>
                      <td className={TD_CLASS}>{formatCell(row.des_tipo)}</td>
                      <td className={`${TD_CLASS} tabular-nums`}>{formatCell(row.anno)}</td>
                      <td className={`${TD_CLASS} tabular-nums`}>{formatCell(row.cod_pred)}</td>
                      <td className={TD_CLASS}>{formatCell(row.det_anexo)}</td>
                      <td className={`${TD_CLASS} tabular-nums`}>{formatCell(row.periodo)}</td>
                      <td className={`${TD_CLASS} ${NUMERIC_CLASS}`}>{formatMoney(row.imp_insol)}</td>
                      <td className={`${TD_CLASS} ${NUMERIC_CLASS}`}>{formatMoney(row.imp_reaj)}</td>
                      <td className={`${TD_CLASS} ${NUMERIC_CLASS}`}>{formatMoney(row.mora)}</td>
                      <td className={`${TD_CLASS} ${NUMERIC_CLASS}`}>{formatMoney(row.costo_emis)}</td>
                      <td className={`${TD_CLASS} ${NUMERIC_CLASS}`}>{formatMoney(row.tot_pagado)}</td>
                      <td className={`${TD_CLASS} ${NUMERIC_CLASS}`}>{formatMoney(row.benefic)}</td>
                      <td className={`${TD_CLASS} ${NUMERIC_CLASS} font-semibold`}>{formatMoney(row.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-sat-navy/5 font-semibold">
                    <th scope="row" colSpan={DETALLE_COLUMNS.length - 4} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-sat-navy">
                      TOTAL
                    </th>
                    <td className={`${TD_CLASS} ${NUMERIC_CLASS} font-semibold`}>{formatMoney(totals.costoEmis)}</td>
                    <td className={`${TD_CLASS} ${NUMERIC_CLASS} font-semibold`}>{formatMoney(totals.totPagado)}</td>
                    <td className={`${TD_CLASS} ${NUMERIC_CLASS} font-semibold`}>{formatMoney(totals.benefic)}</td>
                    <td className={`${TD_CLASS} ${NUMERIC_CLASS} font-semibold`}>{formatMoney(totals.total)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
