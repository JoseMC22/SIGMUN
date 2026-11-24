import { HttpException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  SaveValorUnitarioDto,
  ValorUnitarioKeyDto,
} from './dto/save-valor-unitario.dto';
import { SaveValoresUnitariosBulkDto } from './dto/save-valores-unitarios-bulk.dto';
import { SearchValoresUnitariosDto } from './dto/search-valores-unitarios.dto';
import {
  ValoresUnitariosBulkResponse,
  ValoresUnitariosDeleteResponse,
  ValoresUnitariosMutationResponse,
  ValoresUnitariosSearchResponse,
  ValoresUnitariosYearsResponse,
  ValorUnitarioRow,
} from './dto/valores-unitarios.types';
import {
  conflictError,
  databaseUnavailableError,
  notFoundError,
} from './valores-unitarios.errors';

/** El año se expone como `anno`; `idsigma` es IDENTITY: no se expone ni se escribe. */
const TABLE = 'Calculo.Tblvaluni';
const COLUMNS =
  'region, [año] AS anno, codi, valor, operador, estacion, fechor_ing';
const KEY_WHERE = 'region = @region AND [año] = @anno AND codi = @codi';
/** Un solo batch: el trigger lee el contexto en la misma sesión que el DELETE. */
const DELETE_WITH_SESSION_CONTEXT = `SET NOCOUNT ON;
EXEC sys.sp_set_session_context @key = N'valuni_usuario', @value = @operador;
EXEC sys.sp_set_session_context @key = N'valuni_estacion', @value = @estacion;
DELETE FROM ${TABLE} WHERE ${KEY_WHERE};
SELECT @@ROWCOUNT AS affected;`;
const MAX_LOG_MESSAGE = 500;

/** Solo metadatos acotados: nunca SQL, parámetros ni credenciales. */
function databaseErrorDetails(error: unknown): Record<string, string | number> {
  if (!(error instanceof Error)) {
    return { reason: String(error).slice(0, MAX_LOG_MESSAGE) };
  }

  const metadata = error as Error & {
    code?: unknown;
    number?: unknown;
    state?: unknown;
  };
  const message = metadata.message
    .replace(/(password|pwd|token|secret)\s*[=:]\s*\S+/gi, '$1=[redacted]')
    .slice(0, MAX_LOG_MESSAGE);
  const details: Record<string, string | number> = {
    name: metadata.name,
    message,
  };
  if (typeof metadata.code === 'string' || typeof metadata.code === 'number') {
    details.code = metadata.code;
  }
  if (typeof metadata.number === 'number') {
    details.number = metadata.number;
  }
  if (typeof metadata.state === 'number') {
    details.state = metadata.state;
  }
  return details;
}

@Injectable()
export class ValoresUnitariosService {
  private readonly logger = new Logger(ValoresUnitariosService.name);

  constructor(private readonly db: DatabaseService) {}

  async years(): Promise<ValoresUnitariosYearsResponse> {
    try {
      const result = await this.db.queryWithParams<{ anno: string }>(
        `SELECT DISTINCT [año] AS anno FROM ${TABLE} ORDER BY [año] DESC`,
        {},
      );

      return {
        years: (result.recordset ?? []).map((row) => String(row.anno)),
      };
    } catch (error) {
      this.throwDatabaseError(error);
    }
  }

  async search(
    dto: SearchValoresUnitariosDto,
  ): Promise<ValoresUnitariosSearchResponse> {
    try {
      const params: Record<string, string> = { anno: dto.anno };
      let sql = `SELECT ${COLUMNS} FROM ${TABLE} WHERE [año] = @anno`;

      if (dto.region !== undefined) {
        sql += ' AND region = @region';
        params.region = dto.region;
      }

      const result = await this.db.queryWithParams<ValorUnitarioRow>(
        `${sql} ORDER BY codi`,
        params,
      );

      return { data: result.recordset ?? [] };
    } catch (error) {
      this.throwDatabaseError(error);
    }
  }

  async create(
    dto: SaveValorUnitarioDto,
    operador: string,
    estacion: string,
  ): Promise<ValoresUnitariosMutationResponse> {
    try {
      const existing = await this.findByKey(dto);
      if (existing) {
        conflictError('La fila ya existe');
      }

      await this.db.queryWithParams(
        `INSERT INTO ${TABLE} (region, [año], codi, valor, operador, estacion, fechor_ing)
         VALUES (@region, @anno, @codi, @valor, @operador, @estacion, GETDATE())`,
        {
          region: dto.region,
          anno: dto.anno,
          codi: dto.codi,
          valor: dto.valor,
          operador,
          estacion,
        },
      );

      return {
        message: 'Registro creado exitosamente',
        row: await this.readCreatedRow(dto),
      };
    } catch (error) {
      this.throwDatabaseError(error);
    }
  }

  /**
   * Inserts only the missing rows in a single atomic statement. Existing rows
   * are never updated. The SQL text contains only generated markers; every
   * codi/value is passed as a bound parameter.
   */
  async upsertMany(
    dto: SaveValoresUnitariosBulkDto,
    operador: string,
    estacion: string,
  ): Promise<ValoresUnitariosBulkResponse> {
    try {
      const values: string[] = [];
      const params: Record<string, string | number> = {
        region: dto.region,
        anno: dto.anno,
        operador,
        estacion,
      };

      dto.items.forEach((item, index) => {
        values.push(`(@codi${index}, CAST(@valor${index} AS decimal(7,2)))`);
        params[`codi${index}`] = item.codi;
        params[`valor${index}`] = item.valor;
      });

      const sql = `MERGE INTO ${TABLE} AS T
USING (VALUES ${values.join(', ')}) AS S (codi, valor)
ON T.region = @region AND T.[año] = @anno AND T.codi = S.codi
WHEN NOT MATCHED THEN INSERT (region, [año], codi, valor, operador, estacion, fechor_ing)
VALUES (@region, @anno, S.codi, S.valor, @operador, @estacion, GETDATE())
OUTPUT INSERTED.region, INSERTED.[año] AS anno, INSERTED.codi, INSERTED.valor, INSERTED.operador, INSERTED.estacion, INSERTED.fechor_ing;`;

      const result = await this.db.queryWithParams<ValorUnitarioRow>(sql, params);
      const rows = result.recordset ?? [];

      return {
        message: 'Valores unitarios guardados exitosamente',
        rows,
        affected: rows.length,
      };
    } catch (error) {
      this.throwDatabaseError(error);
    }
  }

  async update(
    dto: SaveValorUnitarioDto,
    operador: string,
    estacion: string,
  ): Promise<ValoresUnitariosMutationResponse> {
    try {
      const result = await this.db.queryWithParams(
        `UPDATE ${TABLE}
         SET valor = @valor, operador = @operador, estacion = @estacion
         WHERE ${KEY_WHERE}`,
        {
          region: dto.region,
          anno: dto.anno,
          codi: dto.codi,
          valor: dto.valor,
          operador,
          estacion,
        },
      );

      if (result.rowsAffected?.[0] === 0) {
        notFoundError('No se encontró la fila');
      }

      return {
        message: 'Registro actualizado exitosamente',
        row: await this.readCreatedRow(dto),
      };
    } catch (error) {
      this.throwDatabaseError(error);
    }
  }

  async remove(
    region: string,
    anno: string,
    codi: string,
    operador: string,
    estacion: string,
  ): Promise<ValoresUnitariosDeleteResponse> {
    try {
      const result = await this.db.queryWithParams<{ affected: number }>(
        DELETE_WITH_SESSION_CONTEXT,
        { region, anno, codi, operador, estacion },
      );

      if (result.recordset?.[0]?.affected === 0) {
        notFoundError('No se encontró la fila');
      }

      return { message: 'Registro eliminado exitosamente' };
    } catch (error) {
      this.throwDatabaseError(error);
    }
  }

  private async findByKey(
    dto: ValorUnitarioKeyDto,
  ): Promise<ValorUnitarioRow | undefined> {
    const result = await this.db.queryWithParams<ValorUnitarioRow>(
      `SELECT ${COLUMNS} FROM ${TABLE} WHERE ${KEY_WHERE}`,
      { region: dto.region, anno: dto.anno, codi: dto.codi },
    );

    return result.recordset?.[0];
  }

  private async readCreatedRow(dto: ValorUnitarioKeyDto): Promise<ValorUnitarioRow> {
    const row = await this.findByKey(dto);
    if (!row) {
      throw databaseUnavailableError();
    }
    return row;
  }

  /** Los HttpException del dominio se preservan; el resto nunca filtra SQL ni credenciales. */
  private throwDatabaseError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }
    this.logger.error(
      `Fallo de base de datos en valores-unitarios: ${JSON.stringify(
        databaseErrorDetails(error),
      )}`,
    );
    throw databaseUnavailableError();
  }
}
