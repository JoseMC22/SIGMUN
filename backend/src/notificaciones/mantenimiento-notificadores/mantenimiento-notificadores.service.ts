import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  GuardarNotificadorDto,
  ActualizarNotificadorDto,
  ActivarEliminarNotificadorDto,
} from './dto/mantenimiento-notificadores.dto';
import {
  ListarNotificadorResult,
  MantenimientoResult,
} from './mantenimiento-notificadores.types';

@Injectable()
export class MantenimientoNotificadoresService {
  private readonly SP_NAME = '[notificacion].[ssp_cargos_notificacion]';
  private readonly logger = new Logger(MantenimientoNotificadoresService.name);

  constructor(private readonly db: DatabaseService) {}

  /** Case-insensitive column lookup (mssql v12+ preserves SP output casing). */
  private col(row: Record<string, any>, name: string): any {
    const key = Object.keys(row).find((k) => k.toLowerCase() === name.toLowerCase());
    return key !== undefined ? row[key] : undefined;
  }

  /** Reads the first `mensaje` column from the SP result (case-insensitive). */
  private firstMensaje(result: any): string {
    const row = result?.recordset?.[0];
    if (!row) return '';
    const key = Object.keys(row).find((k) => k.toLowerCase() === 'mensaje');
    return key ? String(row[key] ?? '') : '';
  }

  private mapRow(row: any): ListarNotificadorResult {
    return {
      codigo_autoridad: this.col(row, 'codigo_autoridad'),
      iniciales: String(this.col(row, 'Inicial') ?? ''),
      notificador: String(this.col(row, 'Notificador') ?? ''),
      estado: String(this.col(row, 'Estado') ?? ''),
    };
  }

  async listar(): Promise<MantenimientoResult & { data: ListarNotificadorResult[] }> {
    try {
      const result = await this.db.executeProcedure<any>(this.SP_NAME, { busc: 11 });
      const data: ListarNotificadorResult[] = (result.recordset || []).map((row: any) =>
        this.mapRow(row),
      );
      return { success: true, data };
    } catch (err) {
      this.logger.error(`[MantenimientoNotificadores] listar SP error: ${err}`);
      return { success: false, data: [], error: 'Error al listar notificadores' };
    }
  }

  async guardar(dto: GuardarNotificadorDto): Promise<MantenimientoResult> {
    const { iniciales, notificador } = dto;

    // Pre-check: bloquear duplicados nombre/iniciales (case-insensitive) antes de escribir.
    const list = await this.listar();
    if (list.success && list.data.length) {
      const dupNombre = list.data.find(
        (r) => r.notificador.trim().toLowerCase() === notificador.trim().toLowerCase(),
      );
      if (dupNombre) {
        return { success: false, error: 'El nombre del notificador ya existe' };
      }
      const dupIniciales = list.data.find(
        (r) => r.iniciales.trim().toLowerCase() === iniciales.trim().toLowerCase(),
      );
      if (dupIniciales) {
        return { success: false, error: 'Las iniciales ya existen' };
      }
    }

    try {
      const result = await this.db.executeProcedure<any>(this.SP_NAME, {
        busc: 12,
        iniciales,
        notificador,
      });
      const mensaje = this.firstMensaje(result);
      // Whitelist de éxito: solo 'Se insertó...' cuenta como exitoso.
      // Cualquier otro texto (incl. 'Existe las Iniciales' o mensaje vacío) → fallo.
      if (/Se insertó/i.test(mensaje)) {
        return { success: true, message: mensaje };
      }
      return { success: false, error: mensaje || 'Operación no completada' };
    } catch (err) {
      this.logger.error(`[MantenimientoNotificadores] guardar SP error: ${err}`);
      return { success: false, error: 'Error al guardar notificador' };
    }
  }

  async actualizar(dto: ActualizarNotificadorDto): Promise<MantenimientoResult> {
    const { id_notificador, notificador } = dto;

    // Pre-check: el registro debe estar Activado y el nombre no debe colisionar
    // con otro (excluyendo el propio).
    const list = await this.listar();
    if (list.success && list.data.length) {
      const self = list.data.find(
        (r) => String(r.codigo_autoridad) === String(id_notificador),
      );
      if (self && self.estado === 'Desactivado') {
        return {
          success: false,
          error: 'No se puede actualizar registro eliminado',
        };
      }
      const dupNombre = list.data.find(
        (r) =>
          r.notificador.trim().toLowerCase() === notificador.trim().toLowerCase() &&
          String(r.codigo_autoridad) !== String(id_notificador),
      );
      if (dupNombre) {
        return { success: false, error: 'El nombre del notificador ya existe' };
      }
    }

    // iniciales (codigo_area) es inmutable: solo se envía notificador.
    try {
      const result = await this.db.executeProcedure<any>(this.SP_NAME, {
        busc: 14,
        id_notificador,
        notificador,
      });
      const mensaje = this.firstMensaje(result);
      // Whitelist de éxito: solo 'Se actualizó...' cuenta como exitoso.
      // Cualquier otro texto (incl. 'No se puede actualizar...' o vacío) → fallo.
      if (/Se actualizó/i.test(mensaje)) {
        return { success: true, message: mensaje };
      }
      return { success: false, error: mensaje || 'No se puede actualizar registro eliminado' };
    } catch (err) {
      this.logger.error(`[MantenimientoNotificadores] actualizar SP error: ${err}`);
      return { success: false, error: 'Error al actualizar notificador' };
    }
  }

  async activarEliminar(
    dto: ActivarEliminarNotificadorDto,
  ): Promise<MantenimientoResult> {
    const { id_notificador, estado } = dto;

    try {
      const result = await this.db.executeProcedure<any>(this.SP_NAME, {
        busc: 13,
        id_notificador,
        estado,
      });
      const mensaje = this.firstMensaje(result);
      if (/eliminó|restauró/i.test(mensaje)) {
        return { success: true, message: mensaje };
      }
      return { success: false, error: mensaje || 'Operación no completada' };
    } catch (err) {
      this.logger.error(
        `[MantenimientoNotificadores] activarEliminar SP error: ${err}`,
      );
      return { success: false, error: 'Error al activar/eliminar notificador' };
    }
  }
}
