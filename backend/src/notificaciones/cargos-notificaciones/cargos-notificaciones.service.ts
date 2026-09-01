import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ValidarValorDto } from './dto/validar-valor.dto';
import { GrabarCargoDto } from './dto/grabar-cargo.dto';
import {
  TipoValorComboResult,
  NotificadoresComboResult,
  ParentescosComboResult,
  ValidarValorResult,
  GrabarCargoResult,
  TipoValorOption,
  NotificadorOption,
  ParentescoOption,
} from './cargos-notificaciones.types';

// ── Case-insensitive column accessor (mssql v12+ preserves SP casing) ──

function col(row: Record<string, any>, name: string): any {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key !== undefined ? row[key] : undefined;
}

/** Pad a numeric code to 7 chars with leading zeros (SP expects this width). */
function padNumValor(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(0, 7).padStart(7, '0');
}

@Injectable()
export class CargosNotificacionesService {
  private readonly SP_MAESTRO = 'notificacion.ssp_cargos_notificacion';
  private readonly SP_VALORES = '[Rentas].[ssp_mvalores]';
  private readonly SP_GRABAR = 'notificacion.sp_cargos_notificacion';
  private readonly TIPO_VALOR_TABLE = 'Contenedor.TblTipo_valor';
  private readonly PARENTESCO_TABLE = 'rentas.rc_tipo_relacion';
  private readonly logger = new Logger(CargosNotificacionesService.name);

  constructor(private readonly db: DatabaseService) {}

  /** Combo de Tipos de Valor (Contenedor.TblTipo_valor, año en curso). */
  async listarTiposValor(): Promise<TipoValorComboResult> {
    try {
      const sql =
        `SELECT id_valor, nomb_val FROM ${this.TIPO_VALOR_TABLE} ` +
        `WHERE estado = '1' and anno_gen = year(getdate()) ORDER BY 2`;
      const result = await this.db.query<any>(sql);
      const rows: TipoValorOption[] = (result.recordset || []).map(
        (row: any) => ({
          id_valor: String(col(row, 'id_valor') ?? ''),
          nomb_val: String(col(row, 'nomb_val') ?? ''),
        }),
      );
      return { success: true, data: rows };
    } catch (err) {
      this.logger.error(`[CargosNotificaciones] listarTiposValor error: ${err}`);
      return { success: false, data: [], error: 'Error al listar tipos de valor' };
    }
  }

  /** Combo de Notificadores (SP maestro @busc=11). */
  async listarNotificadores(): Promise<NotificadoresComboResult> {
    try {
      const result = await this.db.executeProcedure<any>(this.SP_MAESTRO, {
        busc: 11,
        nombre: '',
      });
      const rows: NotificadorOption[] = (result.recordset || []).map(
        (row: any) => ({
          codigo_autoridad: Number(col(row, 'codigo_autoridad') ?? 0),
          notificador: String(col(row, 'Notificador') ?? ''),
        }),
      );
      return { success: true, data: rows };
    } catch (err) {
      this.logger.error(`[CargosNotificaciones] listarNotificadores error: ${err}`);
      return { success: false, data: [], error: 'Error al listar notificadores' };
    }
  }

  /** Combo de Parentescos (rentas.rc_tipo_relacion, estado activo). */
  async listarParentescos(): Promise<ParentescosComboResult> {
    try {
      const sql =
        `SELECT tipo_relacion_id, descripcion FROM ${this.PARENTESCO_TABLE} ` +
        `WHERE estado_id = 1 ORDER BY 2`;
      const result = await this.db.query<any>(sql);
      const rows: ParentescoOption[] = (result.recordset || []).map(
        (row: any) => ({
          tipo_relacion_id: Number(col(row, 'tipo_relacion_id') ?? 0),
          descripcion: String(col(row, 'descripcion') ?? ''),
        }),
      );
      return { success: true, data: rows };
    } catch (err) {
      this.logger.error(`[CargosNotificaciones] listarParentescos error: ${err}`);
      return { success: false, data: [], error: 'Error al listar parentescos' };
    }
  }

  /**
   * Valida un valor tributario y retorna el detalle (contribuyente, dirección,
   * tributos) + monto. SP `[Rentas].[ssp_mvalores]` @msquery=9.
   */
  async validarValor(dto: ValidarValorDto): Promise<ValidarValorResult> {
    const { id_valor, num_valor, ano_valor } = dto;
    try {
      const result = await this.db.executeProcedure<any>(this.SP_VALORES, {
        msquery: 9,
        id_valor: id_valor || '',
        num_val: padNumValor(num_valor),
        ano_val: ano_valor ?? '',
      });
      return { success: true, data: result.recordset || [] };
    } catch (err) {
      this.logger.error(`[CargosNotificaciones] validarValor SP error: ${err}`);
      return { success: false, data: [], error: 'Error al validar el valor' };
    }
  }

  /**
   * Registra un cargo de notificación. SP `notificacion.sp_cargos_notificacion`
   * @busc=2. Recibe operador/estación inyectados desde el controller.
   */
  async grabarCargo(
    dto: GrabarCargoDto,
    operador: string,
    estacion: string,
  ): Promise<GrabarCargoResult> {
    const spParams: Record<string, any> = {
      busc: 2,
      codigo: dto.codigo || '',
      id_valor: dto.id_valor || '',
      num_valor: padNumValor(dto.num_valor),
      ano_valor: dto.ano_valor ?? '',
      num_cargo: dto.num_cargo || '',
      ano_cargo: dto.ano_cargo ?? '',
      id_notificador: dto.id_notificador ?? '',
      c_fachada: dto.c_fachada || '',
      flg_situacion: dto.flg_situacion || '',
      id_parentesco: dto.id_parentesco ?? '',
      nombre: dto.nombre || '',
      direc_fiscal: dto.direc_fiscal || '',
      observacion: dto.observacion || '',
      n_suministro: dto.n_suministro || '',
      usuario_reg: operador,
      estacion_reg: estacion,
      monto: dto.monto ?? '',
      f_visita1: dto.f_visita1 || '',
      f_visita2: dto.f_visita2 || '',
      h_visita1: dto.h_visita1 || '',
      h_visita2: dto.h_visita2 || '',
      nro_visita: dto.nro_visita || '',
      f_notifica: dto.f_notifica || '',
      nro_documento: dto.nro_documento || '',
      id_firma: dto.id_firma ?? '',
      f_cedulon: '',
      h_cedulon: '',
      dir_cedulon: '',
      n_pisos: dto.n_pisos ?? '',
      derivar_drft: dto.derivar_drft || '',
      estado: dto.estado ?? '',
      usuario_act: '',
      fecha_act: '',
      otros: dto.otros || '',
      fvencimiento: dto.fvencimiento || '',
      parentesco_detalle: dto.parentesco_detalle || '',
      ruta1: dto.ruta1 || '',
      imagen1: dto.imagen1 || '',
      ruta2: dto.ruta2 || '',
      imagen2: dto.imagen2 || '',
    };

    this.logger.log(`[CargosNotificaciones] grabarCargo SP params (resumen): ${JSON.stringify({
      busc: 2,
      id_valor: spParams.id_valor,
      num_valor: spParams.num_valor,
      ano_valor: spParams.ano_valor,
      id_notificador: spParams.id_notificador,
      operador,
    })}`);

    try {
      const result = await this.db.executeProcedure<any>(
        this.SP_GRABAR,
        spParams,
      );
      const row = result.recordset?.[0];
      const mensaje = row ? this.firstMensaje(row) : '';
      if (mensaje) {
        if (/error|ya existe|no se puede|invalid/i.test(mensaje)) {
          return { success: false, error: mensaje };
        }
        return { success: true, message: mensaje };
      }
      return { success: true, message: 'Cargo de notificación registrado correctamente' };
    } catch (err) {
      this.logger.error(`[CargosNotificaciones] grabarCargo SP error: ${err}`);
      return { success: false, error: 'Error al grabar el cargo de notificación' };
    }
  }

  /** Reads the first `mensaje` column from an SP result (case-insensitive). */
  private firstMensaje(row: Record<string, any>): string {
    const key = Object.keys(row).find((k) => k.toLowerCase() === 'mensaje');
    return key ? String(row[key] ?? '') : '';
  }
}
