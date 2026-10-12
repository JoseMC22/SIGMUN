import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { toIsoDateParam } from '../../common/utils/date-utils';
import { SearchCuadreCajaDto } from './dto/cuadre-caja.dto';
import { CuadreCajaRow, SpCuadreCajaRow } from './dto/cuadre-caja.types';

@Injectable()
export class CuadreCajaService {
  /**
   * Cuadre de caja del día vía `Data.usp_caja_cuadre @fecha, @tipo='cuadre'`.
   * Contrato del SP (fuente verificada reportes_web): devuelve UNA fila
   * (`recordset[0]`) con las cifras del cuadre; sin fila → null.
   * `@fecha` viaja normalizado a YYYYMMDD (DATEFORMAT-independiente).
   */
  private readonly SP_CAJA_CUADRE = 'Data.usp_caja_cuadre';

  private readonly logger = new Logger(CuadreCajaService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Consulta el cuadre de la fecha. Devuelve la fila mapeada a nombres
   * normalizados (minúsculas) o null si no hay cuadre.
   */
  async search(dto: SearchCuadreCajaDto): Promise<CuadreCajaRow | null> {
    const { fecha } = dto;

    const result = await this.db.executeProcedure<SpCuadreCajaRow>(
      this.SP_CAJA_CUADRE,
      {
        fecha: toIsoDateParam(fecha, (raw) =>
          this.logger.warn(
            `search: fecha inválida para SP ("${raw}") → se envía ''.`,
          ),
        ),
        tipo: 'cuadre',
      },
    );

    const row = (result.recordset ?? [])[0] ?? null;
    if (!row) {
      return null;
    }

    // Fallback de casing por campo (patrón mantenimiento-ingresos):
    // el SP fuente emite tipo8/tipo9/tipo8_06/tipo9_06/costas/sat100/
    // Total/Total_6/ingreso/Fivi; se toleran Title/UPPER ante el driver.
    return {
      tipo8: (row.tipo8 ?? row.Tipo8 ?? row.TIPO8 ?? 0) as number,
      tipo9: (row.tipo9 ?? row.Tipo9 ?? row.TIPO9 ?? 0) as number,
      tipo8_06: (row.tipo8_06 ?? row.Tipo8_06 ?? row.TIPO8_06 ?? 0) as number,
      tipo9_06: (row.tipo9_06 ?? row.Tipo9_06 ?? row.TIPO9_06 ?? 0) as number,
      costas: (row.costas ?? row.Costas ?? row.COSTAS ?? 0) as number,
      sat100: (row.sat100 ?? row.Sat100 ?? row.SAT100 ?? 0) as number,
      total: (row.Total ?? row.total ?? row.TOTAL ?? 0) as number,
      total_6: (row.Total_6 ?? row.total_6 ?? row.TOTAL_6 ?? 0) as number,
      ingreso: (row.ingreso ?? row.Ingreso ?? row.INGRESO ?? 0) as number,
      fivi: (row.Fivi ?? row.fivi ?? row.FIVI ?? 0) as number,
    };
  }
}
