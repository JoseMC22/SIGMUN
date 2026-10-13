import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { toIsoDateParam } from '../../common/utils/date-utils';
import {
  OrdenanzaRow,
  OrdenanzaDetalleRow,
  SpOrdenanzaRow,
  SpOrdenanzaDetalleRow,
} from './dto/ordenanzas.types';
import { CrearOrdenanzaDto } from './dto/crear-ordenanza.dto';

/**
 * Listado de ordenanzas de caja (master CAJA.MORDENANZAS).
 *
 * Fuente: caja.sp_ordenanzas @msquery=3 (SELECT del master). OJO (S2): el SP
 * define @msquery=1 = ALTA (INSERT) — desde el listado NUNCA se llama 1.
 *
 * Contrato del SP (firma leída en vivo): @descripcion, @fdesde, @fhasta,
 * @observacion, @operador y @estacion NO tienen default y deben viajar en
 * TODA llamada (aunque vacíos); si falta alguno, SQL Server responde
 * "expects parameter '@descripcion'...". El set exacto de params está
 * validado en vivo (devuelve las 25 filas del master).
 */

/**
 * Campos char llegan con padding → trim; null/undefined → ''.
 */
function trimChar(value: string | null | undefined): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

/**
 * Fechas en passthrough ISO: Date → toISOString(); null → ''.
 * (Patrón anular-valor.getMotivo para datetime del driver.)
 */
function toIsoPassthrough(value: string | Date | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapRow(row: SpOrdenanzaRow): OrdenanzaRow {
  return {
    idordenanza: Number(row.idordenanza ?? 0),
    criterio: trimChar(row.criterio),
    descripcion: trimChar(row.descripcion),
    fec_desde: toIsoPassthrough(row.fec_desde),
    fec_hasta: toIsoPassthrough(row.fec_hasta),
    observacion: trimChar(row.observacion),
    estado: trimChar(row.estado),
    operador: trimChar(row.operador),
    estacion: trimChar(row.estacion),
    fech_ing: toIsoPassthrough(row.fech_ing),
  };
}

/**
 * Montos decimal del detalle → number (el driver puede entregar string);
 * null/undefined → 0.
 */
function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function mapDetalleRow(row: SpOrdenanzaDetalleRow): OrdenanzaDetalleRow {
  return {
    idordenanza: Number(row.idordenanza ?? 0),
    cidordenanza: Number(row.cidordenanza ?? 0),
    anno: trimChar(row.anno),
    tipo: trimChar(row.tipo),
    tipo_rec: trimChar(row.tipo_rec),
    imp_insol: toNumber(row.imp_insol),
    imp_reaj: toNumber(row.imp_reaj),
    mora: toNumber(row.mora),
    costo_emis: toNumber(row.costo_emis),
    observacion: trimChar(row.observacion),
    estado: trimChar(row.estado),
    fec_venc: toIsoPassthrough(row.fec_venc),
    operador: trimChar(row.operador),
    estacion: trimChar(row.estacion),
    fech_ing: toIsoPassthrough(row.fech_ing),
  };
}

@Injectable()
export class OrdenanzasService {
  private readonly logger = new Logger(OrdenanzasService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Listado master (@msquery=3). Sin paginación (25 filas); lista vacía →
   * { data: [] } sin excepción (contrato S3).
   */
  async listar(): Promise<{ data: OrdenanzaRow[] }> {
    try {
      const result = await this.db.executeProcedure<SpOrdenanzaRow>(
        'caja.sp_ordenanzas',
        {
          msquery: 3, // 3 = consulta master; 1 = ALTA (INSERT), nunca listar.
          criterio: 11,
          // Obligatorios aunque vacíos (el SP no les da default).
          descripcion: '',
          fdesde: '',
          fhasta: '',
          observacion: '',
          operador: '',
          estacion: '',
        },
      );

      const data: OrdenanzaRow[] = (result.recordset ?? []).map(mapRow);
      return { data };
    } catch (error) {
      this.logger.error('Error al listar ordenanzas', error);
      throw error;
    }
  }

  /**
   * Alta de ordenanza master (@msquery=1 = INSERT en CAJA.MORDENANZAS).
   *
   * OJO (S2): msquery=1 es ALTA — desde el listado NUNCA se llama; este es
   * el único uso legítimo del modo 1.
   *
   * El SP exige los 6 parámetros sin default presentes con valor real en el
   * INSERT (descripcion, fdesde, fhasta, operador, estacion; observacion
   * puede viajar vacía). Las fechas llegan YYYY-MM-DD (Zod) y se normalizan
   * a YYYYMMDD (unambiguous para smalldatetime) con toIsoDateParam.
   */
  async crear(
    dto: CrearOrdenanzaDto,
    operador: string,
  ): Promise<{ message: string }> {
    try {
      await this.db.executeProcedure('caja.sp_ordenanzas', {
        msquery: 1, // 1 = ALTA master (INSERT); 3 = consulta (listar).
        criterio: dto.criterio,
        descripcion: dto.descripcion,
        fdesde: toIsoDateParam(dto.fdesde),
        fhasta: toIsoDateParam(dto.fhasta),
        observacion: dto.observacion,
        operador,
        estacion: dto.estacion,
      });

      return { message: 'Ordenanza creada exitosamente' };
    } catch (error) {
      this.logger.error('Error al crear ordenanza', error);
      throw error;
    }
  }

  /**
   * Consulta de detalle master-detalle (T7, @msquery=4 = SELECT * FROM
   * CAJA.DORDENANZAS).
   *
   * OJO (T4/S4): el SP NO filtra server-side — devuelve TODAS las filas
   * (~3210); el filtro por cidordenanza (el idordenanza del master) es
   * SIEMPRE en memoria. @idordenanza viaja igual (pedido verbatim del
   * usuario; el SP lo define =0 aunque no lo usa para filtrar) y es
   * inofensivo: la consulta es read-only.
   *
   * Sin filas del master pedido → { data: [] } SIN excepción (contrato S3).
   */
  async detalle(
    idordenanza: number,
  ): Promise<{ data: OrdenanzaDetalleRow[] }> {
    try {
      const result = await this.db.executeProcedure<SpOrdenanzaDetalleRow>(
        'caja.sp_ordenanzas',
        {
          msquery: 4, // 4 = consulta detalle (SELECT * de DOrdenanzas).
          criterio: 11,
          // Obligatorios aunque vacíos (el SP no les da default).
          descripcion: '',
          fdesde: '',
          fhasta: '',
          observacion: '',
          operador: '',
          estacion: '',
          idordenanza, // FK al master (el filtro real es en memoria).
        },
      );

      const data: OrdenanzaDetalleRow[] = (result.recordset ?? [])
        // Filtro en memoria por cidordenanza (TIPO detalle → idordenanza del
        // master; el SP no filtra).
        .filter((row) => Number(row.cidordenanza ?? 0) === idordenanza)
        .map(mapDetalleRow);
      return { data };
    } catch (error) {
      this.logger.error('Error al consultar el detalle de ordenanzas', error);
      throw error;
    }
  }
}
