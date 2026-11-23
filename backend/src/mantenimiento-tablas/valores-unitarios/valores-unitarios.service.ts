import { HttpException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  SaveValorUnitarioDto,
  ValorUnitarioKeyDto,
} from './dto/save-valor-unitario.dto';
import { SearchValoresUnitariosDto } from './dto/search-valores-unitarios.dto';
import {
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

/** El año se expone como `anno`; `idsigma` no identifica filas y nunca se expone. */
const TABLE = 'Calculo.Tblvaluni';
const COLUMNS =
  'region, [año] AS anno, codi, valor, operador, estacion, fechor_ing';
const KEY_WHERE = 'region = @region AND [año] = @anno AND codi = @codi';

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

  async update(
    dto: SaveValorUnitarioDto,
    operador: string,
    estacion: string,
  ): Promise<ValoresUnitariosMutationResponse> {
    try {
      const result = await this.db.queryWithParams(
        `UPDATE ${TABLE}
         SET valor = @valor, operador = @operador, estacion = @estacion, fechor_ing = GETDATE()
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

      if ((result.rowsAffected?.[0] ?? 0) === 0) {
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
  ): Promise<ValoresUnitariosDeleteResponse> {
    try {
      const result = await this.db.queryWithParams(
        `DELETE FROM ${TABLE} WHERE ${KEY_WHERE}`,
        { region, anno, codi },
      );

      if ((result.rowsAffected?.[0] ?? 0) === 0) {
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
    this.logger.error('Fallo de base de datos en valores-unitarios');
    throw databaseUnavailableError();
  }
}
