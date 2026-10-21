import { Injectable, Logger } from '@nestjs/common';
import * as mssql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import { ProcesarOpDto } from './dto/procesar-op.dto';
import { GenerarOpDto } from './dto/generar-op.dto';
import {
  GenerarOpResult,
  ProcesarOpResult,
  ProcesarOpRow,
} from './generar-op.types';
import { buildDataXml } from './generar-op.dataxml';

/**
 * Proyección de estado de cuenta de rentas para generar orden de pago.
 *
 * Fuente, según el tributo:
 * - predial:   Caja.sp_EstCta_Rentasop_proyectado     (concepto 02.01)
 * - vehicular: Caja.sp_EstCta_Rentasopveh_proyectado  (conceptos 00.30, 25.10)
 *
 * Los dos SP son gemelos: mismos 8 parámetros y mismas columnas de salida, con
 * la misma convención de comillas dobles en @annos/@perio. Solo cambia el
 * filtro de conceptos, por eso el servicio los elige con un mapa.
 */
const SP_POR_TIPO: Record<string, string> = {
  predial: 'Caja.sp_EstCta_Rentasop_proyectado',
  vehicular: 'Caja.sp_EstCta_Rentasopveh_proyectado',
};

/**
 * SP de generación real de la OP, con su id_valor en
 * Contenedor.TblTipo_valor. Whitelist: el cliente nunca manda el SP.
 */
const SP_GENERACION_POR_TIPO: Record<
  string,
  { sp: string; idValor: string }
> = {
  predial: { sp: 'Rentas.sp_Genera_OP', idValor: '01' },
  vehicular: { sp: 'Rentas.sp_Genera_OPVEH', idValor: '11' },
};

/** Convierte un valor de la proyección a número (null/'' => 0). */
function toNum(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Parsea 'DD/MM/YYYY' a Date local. No usar `new Date('dd/mm/yyyy')`: no es
 * ISO y el motor de JS lo interpreta como mm/dd o lo invalida.
 * Devuelve null si no hay tres partes numéricas o si la fecha no existe
 * (por ejemplo 31/02/2026, que `new Date` redondearía en silencio).
 */
export function parseFechaDdMmAaaa(value: string): Date | null {
  const partes = String(value ?? '').trim().split('/');
  if (partes.length !== 3) return null;

  const [diaTxt, mesTxt, anioTxt] = partes;
  if (!/^\d+$/.test(diaTxt) || !/^\d+$/.test(mesTxt) || !/^\d+$/.test(anioTxt)) {
    return null;
  }

  const dia = Number(diaTxt);
  const mes = Number(mesTxt);
  const anio = Number(anioTxt);
  const fecha = new Date(anio, mes - 1, dia);
  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }
  return fecha;
}

interface CorrelativoRow {
  nros_gen: string | number | null;
}

interface GeneracionRow {
  id_valor?: string;
  num_val?: string | number | null;
  ano_val?: string | number | null;
}

@Injectable()
export class GenerarOpService {
  private readonly logger = new Logger(GenerarOpService.name);

  constructor(private readonly db: DatabaseService) {}

  async procesar(dto: ProcesarOpDto): Promise<ProcesarOpResult> {
    // El enum del DTO ya restringe el valor; el fallback cubre llamadas
    // internas que no pasen por el pipe de validación.
    const sp = SP_POR_TIPO[dto.Tipo] ?? SP_POR_TIPO.predial;

    const params = {
      codigo: dto.Codigo ?? '',
      annos: dto.Annos ?? '',
      tipos: dto.Tipos ?? '',
      perio: dto.Perio ?? '',
      predio: dto.Predio ?? '',
      // @estado se concatena crudo en el SQL dinámico del SP: vacío lo rompe.
      estado: dto.Estado || '0',
      fecha_proyectada: dto.FechaProyectada ?? '',
    };

    try {
      const result = await this.db.executeProcedure<ProcesarOpRow>(sp, params);
      const data = result.recordset ?? [];
      return { success: true, data, total: data.length };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[GenerarOp] procesar ${sp} error (codigo=${dto.Codigo}): ${detail}`,
      );
      return {
        success: false,
        data: [],
        total: 0,
        error: 'Error al procesar la orden de pago',
        // En desarrollo se devuelve el mensaje del motor para poder diagnosticar
        // el contrato del SP (nombre, parámetros, tipos). En producción no se
        // expone detalle interno de la base.
        ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
      };
    }
  }

  /**
   * Genera la orden de pago real.
   *
   * Llama a Rentas.sp_Genera_OP (predial, id_valor '01') o
   * Rentas.sp_Genera_OPVEH (vehicular, id_valor '11'). Los dos SP, en su propia
   * transacción (NO envolver acá en otra):
   * - insertan la cabecera en Rentas.Mvalores,
   * - el detalle por recibo en Rentas.Dvalores,
   * - los datos del comprobante en Rentas.DatosOP,
   * - actualizan Caja.MRecibos.ubica = 'VE',
   * - escriben Rentas.MHRuta.
   *
   * NO es idempotente: cada llamada consume correlativo y vuelve a insertar.
   * Por eso el flujo re-proyecta server-side, aborta si no hay filas y no
   * reintenta solo.
   */
  async generar(dto: GenerarOpDto): Promise<GenerarOpResult> {
    // 1. Re-proyección server-side: los importes del XML salen de la base, no
    //    del cliente. El cliente solo manda filtros.
    const proyeccion = await this.procesar(dto as ProcesarOpDto);
    if (!proyeccion.success) {
      return {
        success: false,
        error: proyeccion.error ?? 'Error al procesar la orden de pago',
        ...(proyeccion.detail ? { detail: proyeccion.detail } : {}),
      };
    }

    const rows = proyeccion.data;
    if (rows.length === 0) {
      return {
        success: false,
        error: 'No hay recibos pendientes para los filtros seleccionados',
      };
    }

    const seleccion =
      SP_GENERACION_POR_TIPO[dto.Tipo] ?? SP_GENERACION_POR_TIPO.predial;
    const { sp, idValor } = seleccion;

    try {
      // 2. Guarda del correlativo. Si no hay fila para id_valor + año en curso,
      //    el SP inserta igual con num_val vacío (basura silenciosa).
      const correlativo = await this.db.queryWithParams<CorrelativoRow>(
        `SELECT nros_gen FROM Contenedor.TblTipo_valor
         WHERE id_valor = @idValor AND anno_gen = YEAR(GETDATE())`,
        { idValor },
      );
      if ((correlativo.recordset ?? []).length === 0) {
        const anio = new Date().getFullYear();
        return {
          success: false,
          error: `No hay correlativo configurado para el año ${anio}`,
        };
      }

      // 3. La fecha del modal llega como 'DD/MM/YYYY' y viaja como DateTime.
      const fechProyectado = parseFechaDdMmAaaa(dto.FechaProyectada);
      if (!fechProyectado) {
        return {
          success: false,
          error: 'Fecha proyectada inválida (formato esperado DD/MM/YYYY)',
        };
      }

      // 4. XML de recibos para Caja.fn_Mrecibo(@dataxml).
      const dataxml = buildDataXml(rows);

      // 5. Generación. Los parámetros que el SP recalcula o ignora viajan con
      //    los defaults del contrato: @num_val/@ano_val vacíos los calcula y
      //    devuelve el SP; @fec_val, @imp_insol, @imp_reaj, @costo_emis y
      //    @mora son ignorados por el SP, así que van en 0/'' y NUNCA se usan
      //    como fuente de importes (esos salen de la proyección y del XML).
      const params = {
        codigo: dto.Codigo,
        dataxml,
        id_valor: idValor,
        num_val: '',
        ano_val: '',
        fec_val: '',
        imp_insol: 0,
        imp_reaj: 0,
        costo_emis: 0,
        mora: 0,
        id_usuario: dto.IdUsuario || 'WEB',
        observacion: '',
        num_exp: '0000000',
        ano_exp: '0000',
        numexig: '0000000',
        anoexig: '0000',
        nestado: 1,
        operador: dto.Operador || '',
        estacion: dto.Estacion || 'WEB',
        // Solo el SP vehicular usa estos tres; el predial los sobrescribe con
        // Rentas.getNombres / Rentas.getDirfisca. Se mandan igual.
        nombre: dto.Nombre ?? '',
        dirfiscal: dto.DirFiscal ?? '',
        num_doc: dto.NumDoc ?? '',
        orden: '',
        fech_proyectado: fechProyectado,
      };

      const result = await this.db.executeProcedure<GeneracionRow>(sp, params, {
        dataxml: mssql.NVarChar(mssql.MAX),
        fech_proyectado: mssql.DateTime,
      });

      const fila = (result.recordset ?? [])[0];
      if (!fila) {
        return {
          success: false,
          error: 'El SP de generación no devolvió número de OP',
        };
      }

      const numVal = String(fila.num_val ?? '').trim();
      const anoVal = String(fila.ano_val ?? '').trim();
      if (!numVal || !anoVal) {
        return {
          success: false,
          error: 'El SP de generación devolvió un número de OP vacío',
        };
      }

      const suma = (key: keyof ProcesarOpRow) =>
        rows.reduce((acc, row) => acc + toNum(row[key]), 0);

      return {
        success: true,
        id_valor: String(fila.id_valor ?? idValor),
        num_val: numVal,
        ano_val: anoVal,
        total: rows.length,
        imp_insol: suma('imp_insol'),
        imp_reaj: suma('imp_reaj'),
        mora: suma('mora'),
        costo_emis: suma('costo_emis'),
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[GenerarOp] generar ${sp} error (codigo=${dto.Codigo}): ${detail}`,
      );
      return {
        success: false,
        error: 'Error al generar la orden de pago',
        ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
      };
    }
  }
}
