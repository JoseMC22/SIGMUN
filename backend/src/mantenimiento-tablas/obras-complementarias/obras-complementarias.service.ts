import { HttpException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  CreateObraComplementariaDto,
  ObraComplementariaKeyDto,
  SearchObrasComplementariasDto,
  UpdateObraComplementariaDto,
} from './dto/obras-complementarias.dto';
import {
  ObraComplementariaRow,
  ObrasComplementariasDeleteResponse,
  ObrasComplementariasMutationResponse,
  ObrasComplementariasSearchResponse,
  ObrasComplementariasYearsResponse,
} from './dto/obras-complementarias.types';
import {
  conflictError,
  databaseUnavailableError,
  notFoundError,
} from './obras-complementarias.errors';

const TABLE = 'Calculo.TblInstala';
const COLUMNS =
  'id_instala, anno, instala, uni_med, valor, descri_gener, nestado, vhostnm, vusernm, ddatetm, categ';
const MAX_LOG_MESSAGE = 500;

type QueryParams = Record<string, string | number | null>;

function keyParams(key: ObraComplementariaKeyDto): QueryParams {
  return {
    id_instala: key.id_instala,
    anno: key.anno,
    categ: key.categ,
  };
}

/** La categoría anulable exige IS NULL: `= NULL` nunca coincide en SQL Server. */
function keyWhere(categ: string | null): string {
  return `id_instala = @id_instala AND anno = @anno AND ${
    categ === null ? 'categ IS NULL' : 'categ = @categ'
  }`;
}

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
export class ObrasComplementariasService {
  private readonly logger = new Logger(ObrasComplementariasService.name);

  constructor(private readonly db: DatabaseService) {}

  async years(): Promise<ObrasComplementariasYearsResponse> {
    try {
      const result = await this.db.queryWithParams<{ anno: string }>(
        `SELECT DISTINCT anno FROM ${TABLE} ORDER BY anno DESC`,
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
    dto: SearchObrasComplementariasDto,
  ): Promise<ObrasComplementariasSearchResponse> {
    try {
      const params: QueryParams = { anno: dto.anno };
      let sql = `SELECT ${COLUMNS} FROM ${TABLE} WHERE anno = @anno AND nestado = 1`;
      if (dto.categ !== undefined) {
        sql += dto.categ === null ? ' AND categ IS NULL' : ' AND categ = @categ';
        params.categ = dto.categ;
      }
      const result = await this.db.queryWithParams<ObraComplementariaRow>(
        `${sql} ORDER BY id_instala, categ`,
        params,
      );
      return { data: result.recordset ?? [] };
    } catch (error) {
      this.throwDatabaseError(error);
    }
  }

  async create(
    dto: CreateObraComplementariaDto,
    vusernm: string,
    vhostnm: string,
  ): Promise<ObrasComplementariasMutationResponse> {
    try {
      const existing = await this.findByKey(dto);
      if (existing) {
        conflictError('La fila ya existe');
      }

      await this.db.queryWithParams(
        `INSERT INTO ${TABLE}
         (id_instala, anno, instala, uni_med, valor, descri_gener, nestado, vhostnm, vusernm, ddatetm, categ)
         VALUES (@id_instala, @anno, @instala, @uni_med, @valor, @descri_gener, @nestado, @vhostnm, @vusernm, GETDATE(), @categ)`,
        {
          ...keyParams(dto),
          instala: dto.instala,
          uni_med: dto.uni_med,
          valor: dto.valor,
          descri_gener: dto.descri_gener,
          nestado: 1,
          vhostnm,
          vusernm,
        },
      );

      return {
        message: 'Registro creado exitosamente',
        row: await this.readPersistedRow(dto),
      };
    } catch (error) {
      this.throwDatabaseError(error);
    }
  }

  async update(
    dto: UpdateObraComplementariaDto,
    vusernm: string,
    vhostnm: string,
  ): Promise<ObrasComplementariasMutationResponse> {
    try {
      const result = await this.db.queryWithParams(
        `UPDATE ${TABLE}
         SET instala = @instala, uni_med = @uni_med, valor = @valor,
             descri_gener = @descri_gener, vusernm = @vusernm,
             vhostnm = @vhostnm, ddatetm = GETDATE()
         WHERE ${keyWhere(dto.key.categ)}`,
        {
          ...keyParams(dto.key),
          ...dto.data,
          vusernm,
          vhostnm,
        },
      );
      if (result.rowsAffected?.[0] === 0) {
        notFoundError('No se encontró la fila');
      }
      return {
        message: 'Registro actualizado exitosamente',
        row: await this.readPersistedRow(dto.key),
      };
    } catch (error) {
      this.throwDatabaseError(error);
    }
  }

  async remove(
    key: ObraComplementariaKeyDto,
    vusernm: string,
    vhostnm: string,
  ): Promise<ObrasComplementariasDeleteResponse> {
    try {
      const result = await this.db.queryWithParams(
        `UPDATE ${TABLE}
         SET nestado = 0, vusernm = @vusernm, vhostnm = @vhostnm,
             ddatetm = GETDATE()
         WHERE ${keyWhere(key.categ)}`,
        { ...keyParams(key), vusernm, vhostnm },
      );
      if (result.rowsAffected?.[0] === 0) {
        notFoundError('No se encontró la fila');
      }
      return { message: 'Registro desactivado exitosamente' };
    } catch (error) {
      this.throwDatabaseError(error);
    }
  }

  private async findByKey(
    key: ObraComplementariaKeyDto,
  ): Promise<ObraComplementariaRow | undefined> {
    const result = await this.db.queryWithParams<ObraComplementariaRow>(
      `SELECT TOP (1) ${COLUMNS} FROM ${TABLE} WHERE ${keyWhere(key.categ)}`,
      keyParams(key),
    );
    return result.recordset?.[0];
  }

  private async readPersistedRow(
    key: ObraComplementariaKeyDto,
  ): Promise<ObraComplementariaRow> {
    const row = await this.findByKey(key);
    if (!row) {
      databaseUnavailableError();
    }
    return row;
  }

  private throwDatabaseError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }
    this.logger.error(
      `Fallo de base de datos en obras-complementarias: ${JSON.stringify(
        databaseErrorDetails(error),
      )}`,
    );
    throw databaseUnavailableError();
  }
}
