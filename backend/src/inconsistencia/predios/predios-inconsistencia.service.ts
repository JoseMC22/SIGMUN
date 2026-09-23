import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchInconsistenciaPrediosDto } from './dto/search-inconsistencia-predios.dto';
import {
  PaginatedResponse,
  PredioInconsistenciaRow,
  SpTipoInconsistenciaRow,
  SpUsoPredioRow,
  TipoInconsistenciaOption,
  UsoPredioOption,
} from './predios-inconsistencia.types';

// ── Constantes de paginación, exportación y mapeo ──

/** Filas por página de la grilla. Fijo por contrato. */
export const GRID_PAGE_SIZE = 10;
/** Tope de filas para la re-consulta completa de la exportación. */
export const EXPORT_MAX_ROWS = 100000;
/** @msquery de la llamada de total (no respeta el tipo de inconsistencia). */
export const TOTAL_MSQUERY = 2;
/** Q1: enviar {anno, inicio, final} junto con @msquery=2 (espeja el legacy). */
export const TOTAL_CALL_INCLUDE_FILTERS = true;

const SP_INCONSISTENCIAS = '[Rentas].[sp_inconsistencias]';

/** Mapeo del id_acceso del combo al @msquery de la llamada de datos. */
export const TIPO_MSQUERY_MAP: Record<string, number> = {
  '30.01.01': 1,
  '30.01.02': 3,
  '30.01.03': 5,
  '30.01.04': 7,
  '30.01.05': 9,
};

// SQL estático (sin input de usuario → sin concatenación).
const TIPOS_INCONSISTENCIA_SQL =
  "SELECT id_acceso, nombre FROM Acceso.Macceso WHERE id_acceso LIKE '30.01.%' AND nestado = '3'";
const USOS_PREDIO_SQL =
  'SELECT id_uso, uso FROM Contenedor.TblUsoPredio WHERE tipo_pred = 1 ORDER BY uso';

// ── Helpers puros ──

/** Resuelve el @msquery del tipo de inconsistencia; `undefined` si no está mapeado. */
export function resolveMsquery(idAcceso: string): number | undefined {
  return TIPO_MSQUERY_MAP[idAcceso];
}

/** Rango de filas de la grilla (siempre 10 por página): p1 → 1..10, p2 → 11..20. */
export function gridRange(page: number): { inicio: number; final: number } {
  return {
    inicio: (page - 1) * GRID_PAGE_SIZE + 1,
    final: page * GRID_PAGE_SIZE,
  };
}

/** Rango completo para la exportación: 1..EXPORT_MAX_ROWS. */
export function exportRange(): { inicio: number; final: number } {
  return { inicio: 1, final: EXPORT_MAX_ROWS };
}

/** Único punto de selección de rango; discrimina por el `pageSize` recibido. */
export function resolveRange(
  page: number,
  pageSize: number,
): { inicio: number; final: number } {
  return pageSize > GRID_PAGE_SIZE ? exportRange() : gridRange(page);
}

/**
 * Parámetros de la llamada de total. El total debe ser independiente de la
 * página, por eso se envía siempre el rango completo (no el rango de la página).
 */
function buildTotalParams(anno: number): Record<string, number> {
  if (!TOTAL_CALL_INCLUDE_FILTERS) {
    return { msquery: TOTAL_MSQUERY };
  }
  const range = exportRange();
  return {
    msquery: TOTAL_MSQUERY,
    anno,
    inicio: range.inicio,
    final: range.final,
  };
}

/** Lectura posicional del total: primer valor del primer registro. */
function readTotal(result: {
  recordset?: Record<string, unknown>[];
}): number {
  const firstRow = result.recordset?.[0];
  const raw = firstRow ? Object.values(firstRow)[0] : undefined;
  return Number(raw ?? 0);
}

/** Acceso case-insensitive y tipado a una columna del recordset. */
function col<T>(row: Record<string, unknown>, name: string): T | undefined {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key === undefined ? undefined : (row[key] as T);
}

// ── Servicio ──

@Injectable()
export class PrediosInconsistenciaService {
  constructor(private readonly db: DatabaseService) {}

  async search(
    dto: SearchInconsistenciaPrediosDto,
  ): Promise<PaginatedResponse<PredioInconsistenciaRow>> {
    const { idAcceso, anno, page, pageSize } = dto;

    const msquery = resolveMsquery(idAcceso);
    if (msquery === undefined) {
      throw new BadRequestException({
        code: 'validation_error',
        message: 'Validation failed',
        details: {
          errors: [
            {
              path: 'idAcceso',
              message: `Tipo de inconsistencia no soportado: ${idAcceso}`,
            },
          ],
        },
      });
    }

    const range = resolveRange(page, pageSize);

    const dataResult = await this.db.executeProcedure<Record<string, unknown>>(
      SP_INCONSISTENCIAS,
      {
        msquery,
        anno,
        inicio: range.inicio,
        final: range.final,
      },
    );

    const data: PredioInconsistenciaRow[] = (dataResult.recordset ?? []).map(
      (row) => this.mapRow(row),
    );

    const totalResult = await this.db.executeProcedure<Record<string, unknown>>(
      SP_INCONSISTENCIAS,
      buildTotalParams(anno),
    );

    const total = readTotal(totalResult);
    const totalPages = Math.ceil(total / GRID_PAGE_SIZE);

    return { data, total, page, pageSize, totalPages };
  }

  async getTiposInconsistencia(): Promise<TipoInconsistenciaOption[]> {
    const result = await this.db.query<SpTipoInconsistenciaRow>(
      TIPOS_INCONSISTENCIA_SQL,
    );

    return (result.recordset ?? []).map((row) => ({
      id_acceso: col<string>(row, 'id_acceso') ?? '',
      nombre: col<string>(row, 'nombre') ?? '',
    }));
  }

  async getUsosPredio(): Promise<UsoPredioOption[]> {
    const result = await this.db.query<SpUsoPredioRow>(USOS_PREDIO_SQL);

    return (result.recordset ?? []).map((row) => ({
      id_uso: col<string>(row, 'id_uso') ?? '',
      uso: col<string>(row, 'uso') ?? '',
    }));
  }

  private mapRow(row: Record<string, unknown>): PredioInconsistenciaRow {
    return {
      codigo: col<string>(row, 'codigo') ?? '',
      nombre: col<string>(row, 'nombre') ?? '',
      cod_pred: col<string>(row, 'cod_pred') ?? '',
      anexo: col<string>(row, 'anexo') ?? '',
      sub_anexo: col<string>(row, 'sub_anexo') ?? '',
      direcion: col<string>(row, 'direcion') ?? '',
      uso: col<string>(row, 'uso') ?? '',
      area_terreno: col<number>(row, 'area_terreno') ?? 0,
      porcen_propiedad: col<number>(row, 'porcen_propiedad') ?? 0,
      val_total_terreno: col<number>(row, 'val_total_terreno') ?? 0,
      val_total_constru: col<number>(row, 'val_total_constru') ?? 0,
      total_autoavaluo: col<number>(row, 'total_autoavaluo') ?? 0,
      ROW: col<number>(row, 'ROW') ?? 0,
    };
  }
}
