import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchReportePagosDto } from './dto/search-reporte-pagos.dto';
import { ReportePagoRow, ReportePagosResult } from './reporte-pagos.types';

/**
 * Acceso case-insensitive a columnas del recordset: el driver mssql puede
 * devolver los alias del SP con distinto casing según la versión.
 */
function col(row: Record<string, any>, name: string): any {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key !== undefined ? row[key] : undefined;
}

/** `YYYY-MM-DD` (input date del navegador) → `DD/MM/YYYY` (SP con dateformat dmy). */
function toSpDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function asText(value: any): string {
  return value === null || value === undefined ? '' : String(value);
}

function asNumber(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Reporte de Pagos — grilla "Parte Diario" del legacy `tesoreportes/reppagos`.
 *
 * Consume `Caja.sp_rptTesoreria` con `@buscar = 9`. El SP hace
 * `set dateformat dmy`, por eso las fechas viajan como `DD/MM/YYYY`.
 *
 * Semántica heredada del legacy (se replica tal cual):
 *  - `@movimiento` recibe el N° de recibo (`num_ingr`).
 *  - `@descrip` filtra `a.observacion`, no el nombre del contribuyente, y el
 *    SP solo lo aplica cuando no hay placa ni papeleta.
 *  - `@papeleta` se compone como `año-talonario-número`; si el string
 *    resultante tiene 8 caracteres o menos se envía vacío (guarda del
 *    controlador legacy).
 */
@Injectable()
export class ReportePagosService {
  private readonly SP_NAME = 'Caja.sp_rptTesoreria';
  private readonly logger = new Logger(ReportePagosService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(dto: SearchReportePagosDto): Promise<ReportePagosResult> {
    const spParams: Record<string, any> = {
      buscar: 9,
      fec_desde: toSpDate(dto.fecha_inicio),
      fec_hasta: toSpDate(dto.fecha_fin),
      codigo: dto.codigo ?? '',
      descrip: dto.contribuyente ?? '',
      movimiento: dto.recibo ?? '',
      placa: dto.placa ?? '',
      papeleta: this.buildPapeleta(dto),
    };

    this.logger.log(`[ReportePagos] SP params: ${JSON.stringify(spParams)}`);

    try {
      const result = await this.db.executeProcedure<any>(
        this.SP_NAME,
        spParams,
      );
      const rawRows: any[] = result.recordset ?? [];
      this.logger.log(`[ReportePagos] SP returned ${rawRows.length} rows`);

      const data: ReportePagoRow[] = rawRows.map((row) => ({
        recibo: asText(col(row, 'num_ingr')),
        fecha_pago: asText(col(row, 'hora_pago')),
        clasificacion: asText(col(row, 'tipo_operacion')),
        codigo: asText(col(row, 'codigo')),
        contribuyente: asText(col(row, 'nombres')),
        tributo: asText(col(row, 'tributo')),
        monto: asNumber(col(row, 'monto')),
        tipo_pago: asText(col(row, 'tipo_pago')),
        estado: asText(col(row, 'estado')),
        tipo_operacion: asText(col(row, 'tipo_operacion1')),
        tipo_rec: asText(col(row, 'tipo')),
        caja: asText(col(row, 'caja')),
      }));

      const montoTotal = Math.round(
        data.reduce((sum, row) => sum + row.monto, 0) * 100,
      ) / 100;

      return {
        success: true,
        data,
        total: data.length,
        monto_total: montoTotal,
      };
    } catch (err) {
      this.logger.error(`[ReportePagos] search SP error: ${err}`);
      return {
        success: false,
        data: [],
        total: 0,
        monto_total: 0,
        error: 'Error al consultar el reporte de pagos',
      };
    }
  }

  /**
   * Compone `año-talonario-número` como el legacy. Sin número de papeleta no
   * hay filtro: el legacy descarta cualquier valor de 8 caracteres o menos
   * (caso por defecto `2026-01-`).
   */
  private buildPapeleta(dto: SearchReportePagosDto): string {
    const numero = (dto.papeleta ?? '').trim();
    if (!numero) {
      return '';
    }
    const anio = (dto.anio ?? '').trim() || String(new Date().getFullYear());
    const talonario = (dto.talonario ?? '').trim() || '01';
    const papeleta = `${anio}-${talonario}-${numero}`;
    return papeleta.length <= 8 ? '' : papeleta;
  }
}
