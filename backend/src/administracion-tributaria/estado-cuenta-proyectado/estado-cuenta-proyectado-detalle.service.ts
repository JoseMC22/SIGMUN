import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ConsultaDetalleEstadoCuentaProyectadoDto } from './dto/get-estado-cuenta-proyectado.dto';
import {
  CabeceraProyectado,
  CatalogosProyectado,
  DetalleReciboProyectado,
  PredioProyectado,
  RangoProyectado,
  ReciboEmitidoProyectado,
  SpDetalleReciboProyectadoRow,
  SpNamedRow,
} from './estado-cuenta-proyectado-detalle.types';

const SP_CABECERA = 'dbo.store_caja_framework';
const SP_FECHA = 'dbo.sp_ActualizaInteres_proyectada';
const SP_RECIBOS = 'Caja.sp_Recibos_emitidos';
const SP_DETALLE = 'Caja.sp_EstCta_Rentas_proyectado_2022';

const DETALLE_TIPO_CON_ANEXO = '11.00';
const CRITERIO_LEGACY = '0';

/** Named-object result of a stored procedure call. */
interface ProcedureResult {
  recordset?: readonly SpNamedRow[];
}

function toText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function readText(row: SpNamedRow | undefined, column: string): string {
  return toText(row?.[column]);
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readNumber(row: SpNamedRow | undefined, column: string): number {
  return toNumber(row?.[column]);
}

/** Half-away-from-zero rounding to two decimals, matching legacy round(x, 2). */
function round2(value: number): number {
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(value) * 100 + Number.EPSILON)) / 100;
}

/** A bare SELECT expression is returned by mssql under the empty column name. */
function readScalar(result: ProcedureResult): string {
  const row = result.recordset?.[0];
  if (!row) {
    return '';
  }
  if (row[''] !== undefined) {
    return toText(row['']);
  }
  const keys = Object.keys(row);
  return keys.length === 1 ? toText(row[keys[0]]) : '';
}

function mapCabecera(row: SpNamedRow | undefined): CabeceraProyectado {
  return {
    codigo: readText(row, 'codigo'),
    nombre: readText(row, 'nombre'),
    dirfiscal: readText(row, 'dirfiscal'),
    num_doc: readText(row, 'num_doc'),
    flag_fraccionamiento: readText(row, 'flag_fraccionamiento'),
  };
}

function mapRango(row: SpNamedRow | undefined): RangoProyectado {
  return {
    minimo: readText(row, 'minimo'),
    maximo: readText(row, 'maximo'),
  };
}

function mapPredio(row: SpNamedRow): PredioProyectado {
  return {
    cod_pred: readText(row, 'cod_pred'),
    anexo1: readText(row, 'anexo1'),
    direccion: readText(row, 'direccion'),
    anno: readText(row, 'anno'),
  };
}

/**
 * @estado is duplicated in the SP SELECT (numeric then text). mssql keeps the
 * last alias, but both variants are normalized explicitly so the raw numeric
 * value is never exposed to the API.
 */
export function normalizeEstadoRecibo(value: unknown): string {
  const text = toText(value).trim();
  const upper = text.toUpperCase();
  if (text === '0' || text === '0.00' || upper.includes('ANULADO')) {
    return 'Anulado';
  }
  if (text === '1' || text === '1.00' || upper.includes('CANCELADO')) {
    return 'Cancelado';
  }
  return text;
}

function mapReciboEmitido(row: SpNamedRow): ReciboEmitidoProyectado {
  return {
    num_ingr: readText(row, 'num_ingr'),
    codigo: readText(row, 'codigo'),
    caja: readText(row, 'caja'),
    fec_pago: readText(row, 'fec_pago'),
    monto: readText(row, 'monto'),
    estado: normalizeEstadoRecibo(row?.['estado']),
    operador: readText(row, 'operador'),
  };
}

/**
 * Name-based mapping of the @SELECT DISTINCT * plus the legacy derived fields
 * from RentascajareccontriproyecController.php:150-173. In particular the grid
 * `ubica` comes from `ubica_2`, not from the SP column named `ubica`.
 */
export function mapDetalleReciboProyectado(
  row: SpDetalleReciboProyectadoRow,
): DetalleReciboProyectado {
  const cells: SpNamedRow = row ?? {};
  const tipo = readText(cells, 'tipo').trim();
  const totPago = readNumber(cells, 'tot_pago');

  return {
    idrecibo: readText(cells, 'idrecibo'),
    codigo: readText(cells, 'codigo'),
    tipo: readText(cells, 'tipo'),
    anno: readText(cells, 'anno'),
    cod_pred: readText(cells, 'cod_pred'),
    anexo: readText(cells, 'anexo'),
    sub_anexo: readText(cells, 'sub_anexo'),
    tipo_rec: readText(cells, 'tipo_rec'),
    periodo: readText(cells, 'periodo'),
    imp_insol: readText(cells, 'imp_insol'),
    imp_reaj: readText(cells, 'imp_reaj'),
    mora: readText(cells, 'mora'),
    costo_emis: readText(cells, 'costo_emis'),
    des_tipo: readText(cells, 'des_tipo'),
    des_cabecera: readText(cells, 'des_cabecera'),
    det_anexo:
      tipo === DETALLE_TIPO_CON_ANEXO
        ? `${readText(cells, 'anexo').trim()}-${readText(cells, 'sub_anexo').trim()}`
        : '',
    total: round2(
      readNumber(cells, 'imp_reaj') +
        readNumber(cells, 'mora') +
        readNumber(cells, 'costo_emis') -
        totPago,
    ),
    benefic: round2(readNumber(cells, 'descuento')),
    tot_pagado: round2(totPago),
    ubica: readText(cells, 'ubica_2'),
  };
}

@Injectable()
export class EstadoCuentaProyectadoDetalleService {
  constructor(private readonly db: DatabaseService) {}

  /** store_caja_framework @msquery=1: taxpayer header for the detail screen. */
  async getCabecera(codigo: string): Promise<CabeceraProyectado> {
    const result = await this.db.executeProcedure<SpNamedRow>(SP_CABECERA, {
      msquery: 1,
      codigo,
    });
    return mapCabecera(result.recordset?.[0]);
  }

  /**
   * Period/year ranges, predios and the projection date. Every call uses
   * named parameters; no caller input is ever concatenated into SQL text.
   */
  async getCatalogos(codigo: string): Promise<CatalogosProyectado> {
    const periodosResult = await this.db.executeProcedure<SpNamedRow>(
      SP_CABECERA,
      { msquery: 5, codigo },
    );
    const annosResult = await this.db.executeProcedure<SpNamedRow>(SP_CABECERA, {
      msquery: 6,
      codigo,
    });
    const prediosResult = await this.db.executeProcedure<SpNamedRow>(
      SP_CABECERA,
      { msquery: 15, codigo },
    );
    const fechaResult = await this.db.executeProcedure<SpNamedRow>(SP_FECHA, {
      buscar: 2,
    });

    return {
      periodos: mapRango(periodosResult.recordset?.[0]),
      annos: mapRango(annosResult.recordset?.[0]),
      predios: (prediosResult.recordset ?? []).map(mapPredio),
      fechaProyectada: readScalar(fechaResult),
    };
  }

  /** Caja.sp_Recibos_emitidos @buscar=1: receipts already issued. */
  async getRecibos(codigo: string): Promise<ReciboEmitidoProyectado[]> {
    const result = await this.db.executeProcedure<SpNamedRow>(SP_RECIBOS, {
      buscar: 1,
      codigo,
    });
    return (result.recordset ?? []).map(mapReciboEmitido);
  }

  /** Detail grid: filters are joined into strings before named binding. */
  async consulta(
    dto: ConsultaDetalleEstadoCuentaProyectadoDto,
  ): Promise<DetalleReciboProyectado[]> {
    const result = await this.db.executeProcedure<SpDetalleReciboProyectadoRow>(
      SP_DETALLE,
      {
        codigo: dto.codigo,
        annos: dto.annos.join(','),
        tipos: dto.tipos.join(','),
        tiporec: dto.tiporec,
        perio: dto.perio,
        predio: dto.predio,
        estado: dto.estado,
        criterio: CRITERIO_LEGACY,
        fecha_proyectada: dto.fecha_proyectada,
      },
    );
    return (result.recordset ?? []).map(mapDetalleReciboProyectado);
  }
}
