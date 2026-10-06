import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  ConsultaValoresRow,
  ConsultaValoresResult,
} from './consulta-valores.types';
import { SearchConsultaValoresDto } from './dto/search-consulta-valores.dto';

/** SP que alimenta la Consulta de Valores. */
const SP_CONSULTA_VALORES = 'Rentas.SP_Consultadocu';

/** pageSize de exportación: trae todo sin límite (inicio=0, final=0). */
const EXPORT_PAGE_SIZE = 100000;

/** Columnas que el SP devuelve y la grilla muestra (se descartan ROW y nestado). */
const DISPLAY_COLUMNS = [
  'codigo',
  'nombre',
  'nomb_val',
  'num_val',
  'ano_val',
  'MontoTotal',
  'fec_val',
  'id_valor',
  'num_exp',
  'ano_exp',
  'fec_vence',
  'observacion',
] as const;

/**
 * Mapea una fila cruda del SP a ConsultaValoresRow.
 * - Descarta ROW (artefacto de paginación) y nestado (siempre 1 por el WHERE fijo).
 * - Convierte null/undefined a '' para no mandar null al frontend.
 * - MontoTotal llega como number (decimal del SP); se preserva como number.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(raw: any): ConsultaValoresRow {
  const pick = (key: string): string => {
    const v = raw?.[key];
    return v === null || v === undefined ? '' : String(v).trim();
  };
  const monto = raw?.MontoTotal;
  return {
    codigo: pick('codigo'),
    nombre: pick('nombre'),
    nomb_val: pick('nomb_val'),
    num_val: pick('num_val'),
    ano_val: pick('ano_val'),
    MontoTotal:
      monto === null || monto === undefined || monto === ''
        ? 0
        : Number(monto),
    fec_val: pick('fec_val'),
    id_valor: pick('id_valor'),
    num_exp: pick('num_exp'),
    ano_exp: pick('ano_exp'),
    fec_vence: pick('fec_vence'),
    observacion: pick('observacion'),
  };
}

@Injectable()
export class ConsultaValoresService {
  private readonly logger = new Logger(ConsultaValoresService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(
    dto: SearchConsultaValoresDto,
  ): Promise<ConsultaValoresResult> {
    const baseParams = {
      codigo: dto.Codigo ?? '',
      unombre: dto.Unombre ?? '',
      num_val: dto.NumVal ?? '',
    };

    try {
      // Modo exportación: sin paginación (inicio=0 equivale a vacío en el SP).
      if (dto.pageSize === EXPORT_PAGE_SIZE) {
        const res = await this.db.executeProcedure(SP_CONSULTA_VALORES, {
          msquery: 1,
          ...baseParams,
          inicio: 0,
          final: 0,
        });
        const data: ConsultaValoresRow[] = (res.recordset ?? []).map(mapRow);
        return {
          success: true,
          data,
          total: data.length,
          page: 1,
          pageSize: EXPORT_PAGE_SIZE,
          totalPages: data.length > 0 ? 1 : 0,
        };
      }

      // Modo grilla: COUNT (@msquery=2) + página (@msquery=1 con inicio/final).
      // El SP pagina 1-based inclusivo: página N de 15 → filas (N-1)*15+1 .. N*15.
      const countRes = await this.db.executeProcedure(SP_CONSULTA_VALORES, {
        msquery: 2,
        ...baseParams,
      });
      const countRow = countRes.recordset?.[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const total = countRow
        ? Number(Object.values(countRow as any)[0] ?? 0)
        : 0;

      if (total === 0) {
        return {
          success: true,
          data: [],
          total: 0,
          page: dto.page,
          pageSize: dto.pageSize,
          totalPages: 0,
        };
      }

      const inicio = (dto.page - 1) * dto.pageSize + 1;
      const final = dto.page * dto.pageSize;
      const dataRes = await this.db.executeProcedure(SP_CONSULTA_VALORES, {
        msquery: 1,
        ...baseParams,
        inicio,
        final,
      });
      const data: ConsultaValoresRow[] = (dataRes.recordset ?? []).map(mapRow);

      return {
        success: true,
        data,
        total,
        page: dto.page,
        pageSize: dto.pageSize,
        totalPages: Math.ceil(total / dto.pageSize),
      };
    } catch (error) {
      this.logger.error(
        `[ConsultaValores] search SP error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        data: [],
        total: 0,
        page: dto.page,
        pageSize: dto.pageSize,
        totalPages: 0,
        error: 'Error al consultar los valores',
      };
    }
  }
}

// Re-export para que el spec pueda verificar las columnas mostradas.
export { DISPLAY_COLUMNS };
