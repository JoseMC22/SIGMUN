"use client";

import { useMemo } from "react";
import {
  escapeHtml,
  llenarPlantilla,
  reemplazarBloques,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";
import ReporteViewerModal from "@/components/reportes/reporte-viewer-modal";
import type {
  CabeceraProyectado,
  CatalogosProyectado,
  DetalleEstadoCuentaFilters,
  DetalleReciboProyectado,
  EstadoDetalleProyectado,
  ReciboEmitidoProyectado,
} from "@/actions/administracion-tributaria/estado-cuenta-proyectado";

export interface EstadoCuentaProyectadoReporteProps {
  isOpen: boolean;
  onClose: () => void;
  codigo: string;
  cabecera: CabeceraProyectado;
  catalogos: CatalogosProyectado;
  detalle: DetalleReciboProyectado[];
  recibos: ReciboEmitidoProyectado[];
  filters: DetalleEstadoCuentaFilters;
}

// Mismas 12 columnas visibles de la grilla (sin Descripción, ver T22).
const COLUMNAS_DETALLE: readonly string[] = [
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

const ESTADO_LABELS: Readonly<Record<EstadoDetalleProyectado, string>> = {
  "0": "Pendiente",
  "1": "Cancelado",
  "%": "Todos",
};

// Etiquetas legibles de los valores legacy agrupados de conceptos/arbitrios.
const CONCEPTO_LABELS: Readonly<Record<string, string>> = {
  "*02.01*,*00.16*,*30.02*,*30.03*,*30.04*,*00.46*": "Predial",
  "*11.00*,*00.47*": "Arbitrio",
  "*12.23*": "Fracc.",
  "*00.38*": "Alcabala",
  "*00.30*,*25.10*,*00.48*": "Imp. Vehicular",
  "*30.66*,*30.82*": "Multa Tributaria",
  "*30.02*,*30.03*,*30.04*,*30.93*,*30.94*,*30.95*,*30.96*,*30.97*,*30.98*":
    "Costas",
  "*00.01*": "Fincas",
  "*25.19*": "Cert. NoAdeudo",
  "*11.11*": "Varios",
};

const ARBITRIO_LABELS: Readonly<Record<string, string>> = {
  "*11.02*": "Barrido Vías",
  "*11.01*": "Recol. Res.",
  "*11.03*": "Parq. Jard.",
  "*11.04*": "Serenazgo.",
};

const ESTILOS = `
@page { size: A4 landscape; margin: 8mm; }
body {
  margin: 0;
  padding: 0;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10px;
  color: #1b2b4a;
  background-color: #fff;
}
.ecp-documento { width: 100%; max-width: none; margin: 0; }
.ecp-encabezado { text-align: center; margin-bottom: 10px; }
.ecp-titulo {
  margin: 0;
  font-family: "Times New Roman", serif;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 0.4px;
}
.ecp-entidad { margin: 2px 0 0; font-size: 9px; color: #4b5b74; }
.ecp-linea { border: none; border-top: 1px solid #1b2b4a; margin: 6px 0 8px; }
.ecp-bloque { margin-bottom: 10px; page-break-inside: avoid; }
.ecp-section-title {
  margin: 0 0 3px;
  font-size: 9px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #1b2b4a;
}
.ecp-datos, .ecp-filtros {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.ecp-datos th, .ecp-filtros th {
  text-align: left;
  white-space: nowrap;
  padding: 2px 5px;
  background: #eef2f8;
  border: 1px solid #c8d2e0;
  color: #1b2b4a;
}
.ecp-datos td, .ecp-filtros td {
  padding: 2px 5px;
  border: 1px solid #c8d2e0;
  vertical-align: top;
}
.ecp-detalle { width: 100%; border-collapse: collapse; font-size: 9px; }
.ecp-detalle th, .ecp-detalle td {
  border: 1px solid #c8d2e0;
  padding: 2px 4px;
  text-align: center;
}
.ecp-detalle thead th {
  background: #1b2b4a;
  color: #fff;
  font-weight: bold;
  white-space: nowrap;
}
.ecp-detalle td.ecp-num { text-align: right; font-variant-numeric: tabular-nums; }
.ecp-detalle td.ecp-total { text-align: right; font-weight: bold; }
.ecp-detalle tr.ecp-totales td, .ecp-detalle tr.ecp-totales th {
  background: #eef2f8;
  font-weight: bold;
}
.ecp-detalle th.ecp-totales-label { text-align: left; }
.conv-footer {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  font-family: "Times New Roman", serif;
  font-size: 9px;
  color: #333;
  border-top: 1px solid #ccc;
  padding-top: 4px;
}
`;

const PLANTILLA = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Estado de Cuenta Proyectado</title>
<style>
${ESTILOS}
</style>
</head>
<body>
<div class="ecp-documento">
  <header class="ecp-encabezado">
    <h1 class="ecp-titulo">Estado de Cuenta Proyectado</h1>
    <p class="ecp-entidad">SAT ICA · Sistema Integral de Gestión Municipal</p>
  </header>
  <hr class="ecp-linea" />

  <section class="ecp-bloque">
    <h2 class="ecp-section-title">Datos del contribuyente</h2>
    <table class="ecp-datos">
      <tbody>
        <tr>
          <th>Código</th><td>{{codigo}}</td>
          <th>Contribuyente</th><td>{{nombre}}</td>
        </tr>
        <tr>
          <th>Dirección</th><td colspan="3">{{direccion}}</td>
        </tr>
        <tr>
          <th>Nro. Documento</th><td>{{documento}}</td>
          <th>Proyección</th><td>{{fechaProyeccion}}</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="ecp-bloque">
    <h2 class="ecp-section-title">Resumen de filtros</h2>
    <table class="ecp-filtros">
      <tbody>
        <tr>
          <th>Estado</th><td>{{estado}}</td>
          <th>Fecha de proyección</th><td>{{fechaFiltro}}</td>
        </tr>
        <tr>
          <th>Períodos</th><td>{{periodos}}</td>
          <th>Años</th><td>{{annos}}</td>
        </tr>
        <tr><th>Conceptos</th><td colspan="3">{{conceptos}}</td></tr>
        <tr><th>Arbitrios</th><td colspan="3">{{arbitrios}}</td></tr>
        <tr><th>Predio</th><td colspan="3">{{predio}}</td></tr>
      </tbody>
    </table>
  </section>

  <section class="ecp-bloque">
    <h2 class="ecp-section-title">Detalle de recibos</h2>
    <table class="ecp-detalle">
      <thead>
        <tr>${COLUMNAS_DETALLE.map((columna) => `<th>${columna}</th>`).join("")}</tr>
      </thead>
      <tbody>
        {{filasDetalle}}
        {{filaTotales}}
      </tbody>
    </table>
  </section>

  <div class="conv-footer">
    <span>Elaborado por: {{elaboradoPor}}</span>
    <span>Impreso: {{impreso}}</span>
  </div>
</div>
</body>
</html>`;

function formatMoney(value: string | number): string {
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return (Number.isFinite(parsed) ? parsed : 0).toFixed(2);
}

function formatCell(value: string): string {
  return value.trim() === "" ? "—" : value;
}

function ahora(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function etiquetas(
  valores: string[],
  mapa: Readonly<Record<string, string>>,
): string {
  const resultado = valores.map((valor) => mapa[valor] ?? valor);
  return resultado.length > 0 ? resultado.join(", ") : "";
}

export function construirHtmlEstadoCuentaProyectado(
  params: Omit<EstadoCuentaProyectadoReporteProps, "isOpen" | "onClose">,
): string {
  const { cabecera, catalogos, detalle, recibos, filters } = params;

  const filasDetalle =
    detalle.length > 0
      ? detalle
          .map(
            (fila) => `        <tr>
          <td>${escapeHtml(formatCell(fila.des_tipo))}</td>
          <td>${escapeHtml(formatCell(fila.anno))}</td>
          <td>${escapeHtml(formatCell(fila.cod_pred))}</td>
          <td>${escapeHtml(formatCell(fila.det_anexo))}</td>
          <td>${escapeHtml(formatCell(fila.periodo))}</td>
          <td class="ecp-num">${escapeHtml(formatMoney(fila.imp_insol))}</td>
          <td class="ecp-num">${escapeHtml(formatMoney(fila.imp_reaj))}</td>
          <td class="ecp-num">${escapeHtml(formatMoney(fila.mora))}</td>
          <td class="ecp-num">${escapeHtml(formatMoney(fila.costo_emis))}</td>
          <td class="ecp-num">${escapeHtml(formatMoney(fila.tot_pagado))}</td>
          <td class="ecp-num">${escapeHtml(formatMoney(fila.benefic))}</td>
          <td class="ecp-total">${escapeHtml(formatMoney(fila.total))}</td>
        </tr>`,
          )
          .join("\n")
      : `        <tr><td colspan="${COLUMNAS_DETALLE.length}">Sin registros de detalle.</td></tr>`;

  const totales = detalle.reduce(
    (acc, fila) => ({
      costoEmis: acc.costoEmis + Number(fila.costo_emis || 0),
      totPagado: acc.totPagado + Number(fila.tot_pagado || 0),
      benefic: acc.benefic + Number(fila.benefic || 0),
      total: acc.total + Number(fila.total || 0),
    }),
    { costoEmis: 0, totPagado: 0, benefic: 0, total: 0 },
  );
  const columnasEtiqueta = COLUMNAS_DETALLE.length - 4;
  const filaTotales = `        <tr class="ecp-totales">
          <th class="ecp-totales-label" colspan="${columnasEtiqueta}">TOTAL</th>
          <td>${escapeHtml(formatMoney(totales.costoEmis))}</td>
          <td>${escapeHtml(formatMoney(totales.totPagado))}</td>
          <td>${escapeHtml(formatMoney(totales.benefic))}</td>
          <td class="ecp-total">${escapeHtml(formatMoney(totales.total))}</td>
        </tr>`;

  const conBloques = reemplazarBloques(PLANTILLA, {
    filasDetalle,
    filaTotales,
  });

  const elaboradoPor =
    recibos.find((recibo) => recibo.operador.trim() !== "")?.operador ??
    "SAT ICA";

  return llenarPlantilla(conBloques, {
    codigo: cabecera.codigo,
    nombre: cabecera.nombre,
    direccion: cabecera.dirfiscal,
    documento: cabecera.num_doc,
    fechaProyeccion: catalogos.fechaProyectada,
    estado: ESTADO_LABELS[filters.estado],
    fechaFiltro: filters.fecha_proyectada,
    periodos: filters.perio.join(", "),
    annos: filters.annos.join(", "),
    conceptos: etiquetas(filters.tipos, CONCEPTO_LABELS),
    arbitrios: etiquetas(filters.tiporec, ARBITRIO_LABELS),
    predio: filters.predio.join(", "),
    elaboradoPor,
    impreso: ahora(),
  });
}

export function construirConfigPdfEstadoCuentaProyectado(
  params: Omit<EstadoCuentaProyectadoReporteProps, "isOpen" | "onClose">,
): ReportePdfConfig {
  const { cabecera, detalle } = params;
  const codigo = (cabecera.codigo || "").trim() || "contribuyente";
  return {
    filename: `estado-cuenta-proyectado-${codigo}.pdf`,
    titulo: "Estado de Cuenta Proyectado",
    orientacion: "landscape",
    subtitulo: [
      ["Código", cabecera.codigo],
      ["Contribuyente", cabecera.nombre],
      ["Documento", cabecera.num_doc],
    ],
    columnas: [...COLUMNAS_DETALLE],
    filas: detalle.map((fila) => [
      formatCell(fila.des_tipo),
      formatCell(fila.anno),
      formatCell(fila.cod_pred),
      formatCell(fila.det_anexo),
      formatCell(fila.periodo),
      formatMoney(fila.imp_insol),
      formatMoney(fila.imp_reaj),
      formatMoney(fila.mora),
      formatMoney(fila.costo_emis),
      formatMoney(fila.tot_pagado),
      formatMoney(fila.benefic),
      formatMoney(fila.total),
    ]),
  };
}

export default function EstadoCuentaProyectadoReporte({
  isOpen,
  onClose,
  codigo,
  cabecera,
  catalogos,
  detalle,
  recibos,
  filters,
}: EstadoCuentaProyectadoReporteProps) {
  const datos = useMemo(
    () => ({ codigo, cabecera, catalogos, detalle, recibos, filters }),
    [codigo, cabecera, catalogos, detalle, recibos, filters],
  );

  const html = useMemo(
    () => construirHtmlEstadoCuentaProyectado(datos),
    [datos],
  );
  const pdfConfig = useMemo(
    () => construirConfigPdfEstadoCuentaProyectado(datos),
    [datos],
  );

  return (
    <ReporteViewerModal
      isOpen={isOpen}
      onClose={onClose}
      html={html}
      pdfConfig={pdfConfig}
    />
  );
}
