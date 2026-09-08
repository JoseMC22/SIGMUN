import { Injectable, Logger } from '@nestjs/common';
import { extname } from 'path';
import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import smb2 from '@awo00/smb2';
import { DatabaseService } from '../../database/database.service';
import { ValidarValorDto } from './dto/validar-valor.dto';
import { GrabarCargoDto } from './dto/grabar-cargo.dto';
import {
  TipoValorComboResult,
  NotificadoresComboResult,
  ParentescosComboResult,
  ValidarValorResult,
  TributosResult,
  GrabarCargoResult,
  SubirCargoResult,
  NasUploadFile,
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

/** Max size (bytes) for the uploaded notification-charge file (10 MB). */
export const NAS_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class CargosNotificacionesService {
  private readonly SP_MAESTRO = 'notificacion.ssp_cargos_notificacion';
  private readonly SP_VALORES = '[Rentas].[ssp_mvalores]';
  private readonly SP_GRABAR = 'notificacion.sp_cargos_notificacion';
  private readonly SP_TRIBUTOS = '[Rentas].[ssp_dvalores]';
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
   * Retorna la tabla de tributos del valor tributario.
   * SP `[Rentas].[ssp_dvalores]` @msquery=4.
   */
  async listarTributos(dto: ValidarValorDto): Promise<TributosResult> {
    const { id_valor, num_valor, ano_valor } = dto;
    try {
      const result = await this.db.executeProcedure<any>(this.SP_TRIBUTOS, {
        msquery: 4,
        id_valor: id_valor || '',
        num_val: padNumValor(num_valor),
        ano_val: ano_valor ?? '',
      });
      return { success: true, data: result.recordset || [] };
    } catch (err) {
      this.logger.error(`[CargosNotificaciones] listarTributos SP error: ${err}`);
      return { success: false, data: [], error: 'Error al consultar los tributos' };
    }
  }

  /**
   * Detalle del cargo ya registrado para un valor (si existe).
   * SP `notificacion.sp_cargos_notificacion` @busc=10.
   */
  async detalleCargo(dto: ValidarValorDto): Promise<ValidarValorResult> {
    const { id_valor, num_valor, ano_valor } = dto;
    try {
      const result = await this.db.executeProcedure<any>(this.SP_GRABAR, {
        busc: 10,
        id_valor: id_valor || '',
        num_valor: padNumValor(num_valor),
        ano_valor: ano_valor ?? '',
      });
      return { success: true, data: result.recordset || [] };
    } catch (err) {
      this.logger.error(`[CargosNotificaciones] detalleCargo SP error: ${err}`);
      return { success: false, data: [], error: 'Error al consultar el cargo' };
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
      busc: dto.actualizar ? 6 : 2,
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
      busc: spParams.busc,
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
      let mensaje = row ? this.firstMensaje(row) : '';
      // @busc=6 devuelve '1' (ok) / '2' (sin registro coincidente) en una
      // columna sin nombre legible: se busca el valor en cualquier columna.
      if (dto.actualizar) {
        const raw = row
          ? String(
              Object.values(row).find(
                (v) => String(v) === '1' || String(v) === '2',
              ) ?? '',
            )
          : '';
        if (raw === '1') {
          mensaje = 'Cargo de notificación actualizado correctamente';
        } else {
          // Cualquier otro resultado (recordset vacío, '2', forma inesperada)
          // es un fallo: nunca se reporta éxito sin confirmación del update.
          return {
            success: false,
            error:
              raw === '2'
                ? 'No se pudo actualizar el cargo (no existe registro coincidente)'
                : 'No se pudo confirmar la actualización del cargo',
          };
        }
      }
      if (mensaje) {
        if (/error|ya existe|no se puede|invalid/i.test(mensaje)) {
          return { success: false, error: mensaje };
        }
        return { success: true, message: mensaje };
      }
      return { success: true, message: 'Cargo de notificación registrado correctamente' };
    } catch (err) {
      this.logger.error(`[CargosNotificaciones] grabarCargo SP error: ${err}`);
      // Resumen sanitizado: sin ruta1/imagen1 (topología interna del NAS) ni
      // usuario_reg/estacion_reg (datos operativos del operador).
      this.logger.error(
        `[CargosNotificaciones] grabarCargo params (resumen): ${JSON.stringify({
          busc: spParams.busc,
          id_valor: spParams.id_valor,
          num_valor: spParams.num_valor,
          ano_valor: spParams.ano_valor,
          num_cargo: spParams.num_cargo,
          ano_cargo: spParams.ano_cargo,
          id_notificador: spParams.id_notificador,
        })}`,
      );
      return { success: false, error: 'Error al grabar el cargo de notificación' };
    }
  }

  /** Reads the first `mensaje` column from an SP result (case-insensitive). */
  private firstMensaje(row: Record<string, any>): string {
    const key = Object.keys(row).find((k) => k.toLowerCase() === 'mensaje');
    return key ? String(row[key] ?? '') : '';
  }

  /**
   * Sube el archivo del cargo de notificación al NAS share
   * (configurado vía NAS_SERVER/NAS_SHARE/NAS_FOLDER env vars). El archivo se
   * nombra `{num_cargo}_{ano_cargo}_{YYYYMMDD}_{HHmmss}{ext}`.
   */
  async subirCargoNotificacion(
    file: NasUploadFile | undefined,
    dto: GrabarCargoDto,
    operador: string,
    estacion: string,
  ): Promise<SubirCargoResult> {
    if (!file) {
      return { success: false, error: 'Debe seleccionar un archivo' };
    }
    const ext = extname(file.originalname || '').toLowerCase();
    const allowedMime =
      ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype);
    if (!['.pdf', '.jpg', '.jpeg', '.png'].includes(ext) || !allowedMime) {
      return {
        success: false,
        error: 'Solo se permiten archivos PDF o imágenes (JPG, PNG)',
      };
    }
    if (
      file.size > NAS_UPLOAD_MAX_BYTES ||
      file.buffer.length > NAS_UPLOAD_MAX_BYTES
    ) {
      return { success: false, error: 'El archivo supera el tamaño máximo de 10 MB' };
    }
    if (!file.buffer || file.buffer.length === 0) {
      return { success: false, error: 'El archivo está vacío' };
    }

    const numCargoClean = (dto.num_cargo || '').replace(/\D/g, '');
    const anoCargoClean = String(dto.ano_cargo ?? '').replace(/\D/g, '');
    if (!numCargoClean || anoCargoClean.length !== 4) {
      return { success: false, error: 'Nro y Año de cargo inválidos' };
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `${numCargoClean}_${anoCargoClean}_${stamp}${ext}`;
    // Riesgo aceptado (revisión 4R): la resolución es de 1 segundo, un segundo
    // upload del mismo cargo dentro del mismo segundo sobrescribe el archivo, y
    // si la persistencia (SP @busc=6) falla tras el write, el archivo queda
    // huérfano en el NAS. @awo00/smb2 no soporta delete, así que no hay
    // rollback; se controla con limpieza periódica del share.

    const server = process.env.NAS_SERVER;
    const share = process.env.NAS_SHARE;
    const folder = process.env.NAS_FOLDER;
    const username = process.env.NAS_USER;
    const password = process.env.NAS_PASSWORD;
    const domain = process.env.NAS_DOMAIN || 'WORKGROUP';
    if (!server || !share || !folder || !username || !password) {
      this.logger.error(
        '[CargosNotificaciones] subirCargoNotificacion: NAS env vars missing',
      );
      return { success: false, error: 'No se pudo conectar al servidor NAS' };
    }

    // Estrategia de escritura NAS (env NAS_STRATEGY; default: native en
    // Windows, smb2 en el resto). 'native' usa la red SMB del propio Windows
    // (net use + fs) y evita las limitaciones de @awo00/smb2 (dialectos
    // ≤2.1, sin firma/cifrado): los NAS con cifrado/firma obligatorios lo
    // rechazan con STATUS_ACCESS_DENIED en el TreeConnect aunque el usuario
    // tenga permisos (verificado contra Synology SATICA_NAS).
    // Se usa HOSTNAME (NAS_HOSTNAME) y no IP: Windows no permite dos
    // credenciales distintas contra el mismo servidor y la IP suele tener
    // sesión abierta con el usuario de Windows; el hostname cuenta como
    // servidor distinto.
    const host = process.env.NAS_HOSTNAME || server;
    const strategy = (
      process.env.NAS_STRATEGY ||
      (process.platform === 'win32' ? 'native' : 'smb2')
    ).toLowerCase();
    const nasWrite =
      strategy === 'native'
        ? await this.writeFileNative(
            host,
            share,
            folder,
            username,
            password,
            filename,
            file.buffer,
          )
        : await this.writeFileSmb2(
            server,
            share,
            folder,
            domain,
            username,
            password,
            filename,
            file.buffer,
          );
    if (!nasWrite.ok) {
      return {
        success: false,
        error:
          nasWrite.stage === 'connect'
            ? 'No se pudo conectar al servidor NAS'
            : 'No se pudo guardar el archivo en el NAS',
      };
    }
    this.logger.log(
      `[CargosNotificaciones] subirCargoNotificacion NAS OK (${strategy}): ` +
        `${server}\\${share}\\${folder}\\${filename}`,
    );

    // Persistir ruta1/imagen1 en el cargo (SP @busc=6, update).
    const ruta = `\\\\${server}\\${share}\\${folder}\\${filename}`;
    const dbRes = await this.grabarCargo(
      { ...dto, actualizar: true, ruta1: ruta, imagen1: filename },
      operador,
      estacion,
    );
    if (!dbRes.success) {
      const cargoNoRegistrado = /no existe registro coincidente/i.test(
        dbRes.error || '',
      );
      return {
        success: false,
        error: cargoNoRegistrado
          ? 'El archivo se subió al NAS, pero el cargo no está registrado todavía. Grabe el cargo y vuelva a subir el archivo.'
          : `El archivo se subió al NAS, pero no se pudo actualizar el registro del cargo: ${dbRes.error ?? ''}`,
      };
    }
    return {
      success: true,
      message: 'Cargo de notificación subido correctamente',
      filename,
      ruta,
    };
  }

  /**
   * Escritura NAS por UNC nativo de Windows: asegura el mapeo con `net use`
   * (usuario NAS_USER, sin persistencia) y escribe con fs/promises.
   * Sin shell: execFile con args (la password nunca se interpola en texto).
   */
  private async writeFileNative(
    host: string,
    share: string,
    folder: string,
    username: string,
    password: string,
    filename: string,
    content: Buffer,
  ): Promise<{ ok: boolean; stage?: 'connect' | 'write' }> {
    const uncRoot = `\\\\${host}\\${share}`;
    const uncFile = `${uncRoot}\\${folder}\\${filename}`;
    const alreadyMapped = await this.netUse(['use', uncRoot]);
    if (!alreadyMapped) {
      const mapped = await this.netUse([
        'use',
        uncRoot,
        password,
        `/user:${username}`,
        '/persistent:no',
      ]);
      if (!mapped) return { ok: false, stage: 'connect' };
    }
    try {
      await writeFile(uncFile, content);
      return { ok: true };
    } catch {
      return { ok: false, stage: 'write' };
    }
  }

  /** Ejecuta `net use ...`; true si exit 0. */
  private netUse(args: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      execFile('net', args, { timeout: 15000 }, (error) =>
        resolve(!error),
      );
    });
  }

  /** Escritura NAS vía @awo00/smb2 (fallback / no-Windows). */
  private async writeFileSmb2(
    server: string,
    share: string,
    folder: string,
    domain: string,
    username: string,
    password: string,
    filename: string,
    content: Buffer,
  ): Promise<{ ok: boolean; stage?: 'connect' | 'write' }> {
    const client = new smb2.Client(server, {
      connectTimeout: 10000,
      requestTimeout: 30000,
    });
    let connected = false;
    try {
      const session = await client.authenticate({ domain, username, password });
      connected = true;
      const tree = await session.connectTree(share);
      await tree.createFile(`/${folder}/${filename}`, content);
      return { ok: true };
    } catch (err) {
      // El error de @awo00/smb2 es un objeto (no un Error estándar, puede
      // contener BigInt). El logging NUNCA debe poder romper el flujo: se
      // serializa con BigInt-safe replacer y, si aún así falla, String(err).
      let detail = String(err);
      try {
        const nasErr = err as Record<string, unknown> & { message?: string };
        const replacer = (_k: string, v: unknown) =>
          typeof v === 'bigint' ? v.toString() : v;
        detail =
          nasErr?.message ??
          JSON.stringify(nasErr, replacer) ??
          String(nasErr);
      } catch {
        // keep String(err) fallback
      }
      this.logger.error(
        `[CargosNotificaciones] subirCargoNotificacion NAS error: ${detail}`,
      );
      return { ok: false, stage: connected ? 'write' : 'connect' };
    } finally {
      await client.close().catch(() => undefined);
    }
  }
}
