import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { EmitirConstanciaExigibilidadDto } from './dto/emitir-constancia-exigibilidad.dto';
import { ImpresionConstanciaExigibilidadDto } from './dto/impresion-constancia-exigibilidad.dto';
import { ValidarConstanciaExigibilidadDto } from './dto/validar-constancia-exigibilidad.dto';
import {
  ConstanciaExigibilidadResult,
  ConstanciaExigibilidadValue,
  EmitirConstanciaExigibilidadData,
  EmitirConstanciaExigibilidadResult,
  ImpresionConstanciaExigibilidadData,
  ImpresionConstanciaExigibilidadResult,
  TipoValorComboResult,
  TipoValorOption,
  ValidarConstanciaExigibilidadData,
  ValidarConstanciaExigibilidadResult,
} from './constancia-exigibilidad.types';

const SP_NAME = 'COACTIVO.USP_EXIGIBILIDAD';
const ESTACION = 'WEB';
const OBSERVACION =
  'Constancia de Exigibilidad Generada desde el Sistema de Notificaciones';
const BUSINESS_DAYS_REQUIRED = 7;
const BUSINESS_DAYS_ERROR =
  'Deben transcurrir al menos 7 días hábiles desde la fecha de notificación para generar la constancia.';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type SqlParamValue = string | number | Date | null;
type SpParams = Record<string, SqlParamValue>;
type DatabaseRow = Record<string, SqlParamValue | undefined>;

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

function success<T>(data: T[]): ConstanciaExigibilidadResult<T> {
  return { success: true, data, total: data.length };
}

function failure<T>(error: string): ConstanciaExigibilidadResult<T> {
  return { success: false, data: [], total: 0, error };
}

function column(row: DatabaseRow, name: string): SqlParamValue | undefined {
  const key = Object.keys(row).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  );
  return key === undefined ? undefined : row[key];
}

function text(value: SqlParamValue | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function nullableDate(value: SqlParamValue | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return text(value) || null;
}

function numberValue(value: SqlParamValue | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapValue(row: DatabaseRow): ConstanciaExigibilidadValue {
  return {
    administrado: text(column(row, 'Administrado')),
    fecVal: nullableDate(column(row, 'FEC_VAL')),
    monto: numberValue(column(row, 'Monto')),
    cargo: text(column(row, 'Cargo')),
    fNotifica: nullableDate(column(row, 'Fnotifica')),
    nroExigibilidad: text(column(row, 'NroExigibilidad')),
    fExigibilidad: nullableDate(column(row, 'FExigibilidad')),
    codigo: text(column(row, 'CODIGO')),
    idValor: text(column(row, 'ID_VALOR')),
    anoVal: text(column(row, 'ANO_VAL')),
    numVal: text(column(row, 'NUM_VAL')),
  };
}

function parseCalendarDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function utcTimestamp(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}

/** Counts weekdays after the notification date through today, inclusive. */
function elapsedBusinessDays(
  notificationDate: CalendarDate,
  today: CalendarDate,
): number {
  const start = utcTimestamp(notificationDate) + DAY_IN_MS;
  const end = utcTimestamp(today);
  if (start > end) return 0;

  const totalDays = Math.floor((end - start) / DAY_IN_MS) + 1;
  const fullWeeks = Math.floor(totalDays / 7);
  const remainingDays = totalDays % 7;
  let businessDays = fullWeeks * 5;

  for (let index = 0; index < remainingDays; index += 1) {
    const timestamp = start + (fullWeeks * 7 + index) * DAY_IN_MS;
    const weekday = new Date(timestamp).getUTCDay();
    if (weekday !== 0 && weekday !== 6) businessDays += 1;
  }

  return businessDays;
}

@Injectable()
export class ConstanciaExigibilidadService {
  private readonly logger = new Logger(ConstanciaExigibilidadService.name);

  constructor(private readonly db: DatabaseService) {}

  async listarTiposValor(): Promise<TipoValorComboResult> {
    const sql =
      'SELECT id_valor, nomb_val FROM Contenedor.TblTipo_valor ' +
      "WHERE estado = '1' AND anno_gen = YEAR(GETDATE()) ORDER BY 2";

    try {
      const result = await this.db.query<DatabaseRow>(sql);
      const rows: TipoValorOption[] = (result.recordset ?? []).map((row) => ({
        id_valor: text(column(row, 'id_valor')),
        nomb_val: text(column(row, 'nomb_val')),
      }));
      return success(rows);
    } catch {
      this.logger.error({
        event: 'constancia_exigibilidad_tipos_valor_error',
      });
      return failure<TipoValorOption>('Error al listar tipos de valor');
    }
  }

  async validar(
    dto: ValidarConstanciaExigibilidadDto,
  ): Promise<ValidarConstanciaExigibilidadResult> {
    const params: SpParams = {
      opcion: 2,
      id_valor: dto.tipoValor,
      num_val: dto.numero,
      ano_val: String(dto.anio),
    };

    try {
      const result = await this.db.executeProcedure<DatabaseRow>(
        SP_NAME,
        params,
      );
      const row = result.recordset?.[0];

      if (!row) {
        return failure<ValidarConstanciaExigibilidadData>(
          'El valor no se encuentra registrado',
        );
      }

      const estado = text(column(row, 'Estado'));
      if (estado === '9' || estado === '2') {
        return failure<ValidarConstanciaExigibilidadData>(
          'El valor se encuentra en estado Cancelado. No se puede generar la constancia.',
        );
      }

      const value = mapValue(row);
      if (value.cargo === '0') {
        return success([
          {
            ...value,
            canGenerate: false,
            canPrint: false,
            message: 'El valor no cuenta con Cargo de Notificación',
          },
        ]);
      }

      const hasConstancia =
        value.nroExigibilidad !== '' && value.nroExigibilidad !== '0';
      const data: ValidarConstanciaExigibilidadData = {
        ...value,
        canGenerate: !hasConstancia,
        canPrint: hasConstancia,
        message: hasConstancia
          ? 'Ya cuenta con Constancia de Exigibilidad'
          : 'Proceder con la Generación de la Constancia',
      };

      return success([data]);
    } catch {
      this.logger.error({
        event: 'constancia_exigibilidad_sp_error',
        opcion: 2,
      });
      return failure<ValidarConstanciaExigibilidadData>(
        'Error al validar el valor',
      );
    }
  }

  async emitir(
    dto: EmitirConstanciaExigibilidadDto,
    operador: string,
  ): Promise<EmitirConstanciaExigibilidadResult> {
    const lookupParams: SpParams = {
      opcion: 2,
      id_valor: dto.tipoValor,
      num_val: dto.numero,
      ano_val: String(dto.anio),
    };

    let row: DatabaseRow | undefined;
    try {
      const result = await this.db.executeProcedure<DatabaseRow>(
        SP_NAME,
        lookupParams,
      );
      row = result.recordset?.[0];
    } catch {
      this.logger.error({
        event: 'constancia_exigibilidad_sp_error',
        opcion: 2,
      });
      return failure<EmitirConstanciaExigibilidadData>(
        'Error al generar la constancia de exigibilidad',
      );
    }

    if (!row) {
      return failure<EmitirConstanciaExigibilidadData>(
        'El valor no se encuentra registrado',
      );
    }

    const estado = text(column(row, 'Estado'));
    if (estado === '9' || estado === '2') {
      return failure<EmitirConstanciaExigibilidadData>(
        'El valor se encuentra en estado Cancelado. No se puede generar la constancia.',
      );
    }

    const value = mapValue(row);
    if (value.cargo === '0') {
      return failure<EmitirConstanciaExigibilidadData>(
        'El valor no cuenta con Cargo de Notificación',
      );
    }

    if (value.nroExigibilidad !== '' && value.nroExigibilidad !== '0') {
      return failure<EmitirConstanciaExigibilidadData>(
        'Ya cuenta con Constancia de Exigibilidad',
      );
    }

    const fnotifica = value.fNotifica;
    const notificationDate = fnotifica
      ? parseCalendarDate(fnotifica)
      : null;
    if (!fnotifica || !notificationDate) {
      return failure<EmitirConstanciaExigibilidadData>(
        'La fecha de notificación es inválida.',
      );
    }

    const now = new Date();
    const today: CalendarDate = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };
    if (elapsedBusinessDays(notificationDate, today) < BUSINESS_DAYS_REQUIRED) {
      return failure<EmitirConstanciaExigibilidadData>(BUSINESS_DAYS_ERROR);
    }

    if (!operador.trim()) {
      return failure<EmitirConstanciaExigibilidadData>(
        'No se pudo identificar al operador autenticado.',
      );
    }

    const anoexig = String(now.getFullYear());
    const params: SpParams = {
      opcion: 3,
      anoexig,
      codigo: value.codigo,
      nombre: value.administrado,
      lote: '0',
      montota: value.monto,
      observacion: OBSERVACION,
      operador: operador.trim(),
      estacion: ESTACION,
      id_valor: value.idValor || dto.tipoValor,
      ano_val: value.anoVal || String(dto.anio),
      num_val: value.numVal || dto.numero,
      cargo: value.cargo,
      fnotifica,
    };

    try {
      const result = await this.db.executeProcedure<DatabaseRow>(
        SP_NAME,
        params,
      );
      const emissionRow = result.recordset?.[0];
      const numexig = emissionRow ? text(column(emissionRow, 'numexig')) : '';
      if (!numexig) {
        return failure<EmitirConstanciaExigibilidadData>(
          'No se pudo obtener el número de constancia generado.',
        );
      }

      return success([{ numexig, anoexig }]);
    } catch {
      this.logger.error({
        event: 'constancia_exigibilidad_sp_error',
        opcion: 3,
      });
      return failure<EmitirConstanciaExigibilidadData>(
        'Error al generar la constancia de exigibilidad',
      );
    }
  }

  async impresion(
    dto: ImpresionConstanciaExigibilidadDto,
  ): Promise<ImpresionConstanciaExigibilidadResult> {
    const params: SpParams = {
      opcion: 4,
      numexig: dto.numexig,
      anoexig: dto.anoexig,
    };

    try {
      const result = await this.db.executeProcedure<DatabaseRow>(
        SP_NAME,
        params,
      );
      const row = result.recordset?.[0];
      if (!row) {
        return failure<ImpresionConstanciaExigibilidadData>(
          'La exigibilidad no existe.',
        );
      }

      const data: ImpresionConstanciaExigibilidadData = {
        nombre: text(column(row, 'Nombre')),
        constancia: text(column(row, 'Constancia')),
        valor: text(column(row, 'Valor')),
        fnotifica: nullableDate(column(row, 'Fnotifica')),
        cargo: text(column(row, 'Cargo')),
      };
      return success([data]);
    } catch {
      this.logger.error({
        event: 'constancia_exigibilidad_sp_error',
        opcion: 4,
      });
      return failure<ImpresionConstanciaExigibilidadData>(
        'Error al consultar la constancia de exigibilidad',
      );
    }
  }
}
