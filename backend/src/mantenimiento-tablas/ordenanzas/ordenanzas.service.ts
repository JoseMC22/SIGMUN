import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { toIsoDateParam } from '../../common/utils/date-utils';
import {
  EditarDetalleInput,
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

/**
 * Fila del detalle re-modelado (iteración 4 + llaves T3): el recordset llega
 * con claves del SELECT del JOIN — `IDORDENANZA` (PK del detalle),
 * `CIDORDENANZA` (master), `Año` (alias entre corchetes, exacto, con ñ),
 * TIPO_REC y CONCEPTO (textos) + IMP_INSOL/IMP_REAJ/MORA/COSTO_EMIS
 * (montos). char/varchar → trim (null → ''); montos → Number (null → 0);
 * llaves → Number (null → 0).
 */
function mapDetalleRow(row: SpOrdenanzaDetalleRow): OrdenanzaDetalleRow {
  return {
    idDetalle: Number(row.IDORDENANZA ?? 0),
    cidordenanza: Number(row.CIDORDENANZA ?? 0),
    anno: trimChar(row['Año']),
    tipoRec: trimChar(row.TIPO_REC),
    concepto: trimChar(row.CONCEPTO),
    impInsol: toNumber(row.IMP_INSOL),
    impReaj: toNumber(row.IMP_REAJ),
    mora: toNumber(row.MORA),
    costoEmis: toNumber(row.COSTO_EMIS),
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
   * Update de ordenanza master (T6, @msquery=7 = UPDATE en
   * CAJA.MORDENANZAS). Misma forma de llamada que el modo 4 + valores
   * editados: criterio, descripcion, fdesde/fhasta (YYYY-MM-DD → YYYYMMDD
   * con toIsoDateParam), observacion, operador (de sesión), estacion, y la
   * llave idordenanza del WHERE. NO toca estado.
   */
  async editar(
    idordenanza: number,
    dto: CrearOrdenanzaDto,
    operador: string,
  ): Promise<{ message: string }> {
    try {
      await this.db.executeProcedure('caja.sp_ordenanzas', {
        msquery: 7, // 7 = UPDATE master; NO toca estado.
        criterio: dto.criterio,
        descripcion: dto.descripcion,
        fdesde: toIsoDateParam(dto.fdesde),
        fhasta: toIsoDateParam(dto.fhasta),
        observacion: dto.observacion,
        operador,
        estacion: dto.estacion,
        idordenanza, // Llave del WHERE (modo 4 + valores editados).
      });

      return { message: 'Ordenanza actualizada exitosamente' };
    } catch (error) {
      this.logger.error('Error al actualizar ordenanza', error);
      throw error;
    }
  }

  /**
   * Update de fila del detalle (T3, @msquery=8 = UPDATE en CAJA.DOrdenanzas
   * `WHERE IDORDENANZA = @idordenanza`). Se envían SOLO los params con valor
   * conocido: cidordenanza, anno/tipo_rec (char → trim), los 4 montos,
   * operador (de sesión), estacion e idordenanza (PK del detalle).
   * tipo/observacion/estado NO se envían: el modo 4 no los devuelve y el
   * modo 8 los pisaría en blanco.
   *
   * Anti-duplicidad (año, tipo_rec) dentro del master, excluyendo la propia
   * fila: la base NO tiene unique constraint en (cidordenanza, anno,
   * tipo_rec) — solo la PK idordenanza — así que la verificación es
   * responsabilidad del backend (una lectura modo 4) y rechaza con 409.
   */
  async editarDetalle(
    idordenanza: number,
    input: EditarDetalleInput,
    operador: string,
  ): Promise<{ message: string }> {
    const anno = trimChar(input.anno);
    const tipoRec = trimChar(input.tipoRec);
    const { data: filas } = await this.detalle(input.cidordenanza);
    const duplicada = filas.some(
      (f) =>
        f.idDetalle !== idordenanza &&
        f.anno === anno &&
        f.tipoRec === tipoRec,
    );
    if (duplicada) {
      throw new ConflictException(
        `Ya existe otra fila con año ${anno} y tipo ${tipoRec} en esta ordenanza`,
      );
    }

    try {
      await this.db.executeProcedure('caja.sp_ordenanzas', {
        msquery: 8, // 8 = UPDATE detalle.
        cidordenanza: input.cidordenanza,
        anno,
        tipo_rec: tipoRec,
        imp_insol: input.impInsol,
        imp_reaj: input.impReaj,
        mora: input.mora,
        costo_emis: input.costoEmis,
        operador,
        estacion: input.estacion,
        idordenanza, // PK del detalle (llave del WHERE).
      });

      return { message: 'Detalle de ordenanza actualizado exitosamente' };
    } catch (error) {
      this.logger.error('Error al actualizar el detalle de ordenanza', error);
      throw error;
    }
  }

  /**
   * Consulta de detalle master-detalle (T9, @msquery=4 re-modelado: SELECT
   * con JOIN a CAJA.TIPO_INGRESOS_DET — `do.ANNO [Año], do.TIPO_REC,
   * det.CONCEPTO, do.IMP_INSOL, do.IMP_REAJ, do.MORA, do.COSTO_EMIS`).
   *
   * El cambio de SP por DBA (re-lectura en vivo 13/10 ~16:32) AHORA FILTRA
   * server-side con `WHERE CIDORDENANZA = @idordenanza`: el filtro en
   * memoria del SP viejo se ELIMINÓ y el passthrough de las N filas es
   * directo (el volumen ya lo acota el SP: idordenanza=1 → 115 filas).
   *
   * Los 6 parámetros sin default siguen viajando '' en TODA llamada
   * (contrato del SP) e `idordenanza` (int) es ya el filtro requisito.
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
          msquery: 4, // 4 = consulta detalle (JOIN TIPO_INGRESOS_DET).
          criterio: 11,
          // Obligatorios aunque vacíos (el SP no les da default).
          descripcion: '',
          fdesde: '',
          fhasta: '',
          observacion: '',
          operador: '',
          estacion: '',
          idordenanza, // Filtro server-side: WHERE CIDORDENANZA = @idordenanza.
        },
      );

      // El SP ya filtra server-side: TODAS las filas del recordset son del
      // master pedido → mapeo directo, sin filtro en memoria.
      const data: OrdenanzaDetalleRow[] = (result.recordset ?? []).map(
        mapDetalleRow,
      );
      return { data };
    } catch (error) {
      this.logger.error('Error al consultar el detalle de ordenanzas', error);
      throw error;
    }
  }
}
