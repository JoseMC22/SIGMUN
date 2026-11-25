import { HttpException, Injectable, Logger } from '@nestjs/common';
import * as mssql from 'mssql';
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

const SP_NAME = '[Calculo].[sp_MInstala]';
const MAX_LOG_MESSAGE = 500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SP_TYPES: Record<string, any> = {
  Accion: mssql.VarChar(20),
  id_instala: mssql.Char(3),
  anno: mssql.Char(4),
  categ: mssql.NChar(2),
  FiltroCateg: mssql.Bit,
  instala: mssql.VarChar(200),
  uni_med: mssql.VarChar(15),
  valor: mssql.Decimal(12, 2),
  descri_gener: mssql.VarChar(200),
  nestado: mssql.TinyInt,
  vusernm: mssql.VarChar(25),
  vhostnm: mssql.VarChar(25),
};

function isMssqlError(
  error: unknown,
): error is Error & { number?: number; code?: string | number } {
  return error instanceof Error && typeof (error as { number?: unknown }).number === 'number';
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
      const result = await this.db.executeProcedure<{ anno: string }>(
        SP_NAME,
        { Accion: 'ANIOS', vusernm: '', vhostnm: '' },
        SP_TYPES,
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
      const params: Record<string, unknown> = {
        Accion: 'CONSULTA',
        anno: dto.anno,
        FiltroCateg: dto.categ === undefined ? 0 : 1,
        vusernm: '',
        vhostnm: '',
      };
      if (dto.categ !== undefined) {
        params.categ = dto.categ;
      }

      const result = await this.db.executeProcedure<ObraComplementariaRow>(
        SP_NAME,
        params,
        SP_TYPES,
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
      const result = await this.db.executeProcedure<ObraComplementariaRow>(
        SP_NAME,
        {
          Accion: 'ALTA',
          id_instala: dto.id_instala,
          anno: dto.anno,
          categ: dto.categ,
          instala: dto.instala,
          uni_med: dto.uni_med,
          valor: dto.valor,
          descri_gener: dto.descri_gener,
          nestado: 1,
          vusernm,
          vhostnm,
        },
        SP_TYPES,
      );

      const row = result.recordset?.[0];
      if (!row) {
        databaseUnavailableError();
      }

      return {
        message: 'Registro creado exitosamente',
        row,
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
      const result = await this.db.executeProcedure<ObraComplementariaRow>(
        SP_NAME,
        {
          Accion: 'MODIFICACION',
          id_instala: dto.key.id_instala,
          anno: dto.key.anno,
          categ: dto.key.categ,
          instala: dto.data.instala,
          uni_med: dto.data.uni_med,
          valor: dto.data.valor,
          descri_gener: dto.data.descri_gener,
          vusernm,
          vhostnm,
        },
        SP_TYPES,
      );

      const row = result.recordset?.[0];
      if (!row) {
        databaseUnavailableError();
      }

      return {
        message: 'Registro actualizado exitosamente',
        row,
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
      await this.db.executeProcedure<ObraComplementariaRow>(
        SP_NAME,
        {
          Accion: 'BAJA',
          id_instala: key.id_instala,
          anno: key.anno,
          categ: key.categ,
          vusernm,
          vhostnm,
        },
        SP_TYPES,
      );

      return { message: 'Registro desactivado exitosamente' };
    } catch (error) {
      this.throwDatabaseError(error);
    }
  }

  private throwDatabaseError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (isMssqlError(error)) {
      if (error.number === 50009) {
        conflictError('La fila ya existe');
      }
      if (error.number === 50010) {
        notFoundError('No se encontró la fila');
      }
    }

    this.logger.error(
      `Fallo de base de datos en obras-complementarias: ${JSON.stringify(
        databaseErrorDetails(error),
      )}`,
    );
    throw databaseUnavailableError();
  }
}
