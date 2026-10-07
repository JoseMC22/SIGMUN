import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  AnularValorContribuyenteRow,
  AnularValorResult,
  SearchAnularValorResult,
  ValorEmitidoRow,
  ValoresResult,
} from './anular-valor.types';
import { SearchAnularValorDto } from './dto/search-anular-valor.dto';
import { AnularValorDto } from './dto/anular-valor.dto';

/**
 * Listado de contribuyentes para anular-valor.
 *
 * Fuente: Rentas.sp_Mcontribuyente, el mismo SP de declaración jurada
 * (standard mode): @busc=6 COUNT + @busc=5 página con @inicio/@final
 * String 1-based inclusivo. Paginación server-side: con filtro vacío ya no
 * se traen 86k filas a memoria.
 *
 * Columnas mostradas (8): sp_ trae `documento` y `DireFis` pero NO trae
 * `TipoPersona` (era computada de ssp_Mcontribuyente): se mapea ''.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpRow = Record<string, any>;

function mapRow(row: SpRow): AnularValorContribuyenteRow {
  return {
    codigo: row.codigo ?? '',
    nombres: row.nombres ?? '',
    paterno: row.paterno ?? '',
    materno: row.materno ?? '',
    documento: row.documento ?? '',
    num_doc: row.num_doc ?? '',
    DireFis: row.DireFis ?? '',
    // sp_Mcontribuyente no devuelve TipoPersona: se deja vacío (no inventar).
    TipoPersona: '',
  };
}

@Injectable()
export class AnularValorService {
  private readonly logger = new Logger(AnularValorService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(dto: SearchAnularValorDto): Promise<SearchAnularValorResult> {
    // Mismos params base que DJ standard mode (más cod_pred/checkfrac fijos).
    const baseParams = {
      codigo: dto.Codigo ?? '',
      nombres: dto.Nombres ?? '',
      paterno: dto.Paterno ?? '',
      materno: dto.Materno ?? '',
      razon: dto.Razon ?? '',
      num_doc: dto.NumDoc ?? '',
      tipo_busqueda: dto.TipoBusqueda,
      cod_pred: '',
      checkfrac: 0,
    };

    try {
      // COUNT (@busc=6), igual que DJ.
      const countResult = await this.db.executeProcedure(
        'Rentas.sp_Mcontribuyente',
        { ...baseParams, busc: 6 },
      );
      const countRow = countResult.recordset?.[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const total = countRow ? Number(Object.values(countRow as any)[0] ?? 0) : 0;

      if (total === 0) {
        return {
          success: true,
          data: [],
          total: 0,
          page: dto.pageSize === 100000 ? 1 : dto.page,
          pageSize: dto.pageSize,
          totalPages: 0,
        };
      }

      // Modo exportación interna: un solo fetch 1..total.
      if (dto.pageSize === 100000) {
        const expResult = await this.db.executeProcedure(
          'Rentas.sp_Mcontribuyente',
          { ...baseParams, busc: 5, inicio: String(1), final: String(total) },
        );
        const data: AnularValorContribuyenteRow[] = (
          expResult.recordset ?? []
        ).map(mapRow);
        return {
          success: true,
          data,
          total,
          page: 1,
          pageSize: 100000,
          totalPages: 1,
        };
      }

      // Modo grilla: página 1-based inclusiva, igual que DJ.
      const inicio = (dto.page - 1) * dto.pageSize + 1;
      const final = dto.page * dto.pageSize;
      const rowsResult = await this.db.executeProcedure(
        'Rentas.sp_Mcontribuyente',
        { ...baseParams, busc: 5, inicio: String(inicio), final: String(final) },
      );
      const data: AnularValorContribuyenteRow[] = (
        rowsResult.recordset ?? []
      ).map(mapRow);

      return {
        success: true,
        data,
        total,
        page: dto.page,
        pageSize: dto.pageSize,
        totalPages: Math.ceil(total / dto.pageSize),
      };
    } catch (error) {
      this.logger.error(
        `[AnularValor] search SP error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        data: [],
        total: 0,
        page: dto.page,
        pageSize: dto.pageSize,
        totalPages: 0,
        error: 'Error al consultar los contribuyentes',
      };
    }
  }

  /**
   * Valores emitidos de un contribuyente.
   * Fuente: Rentas.ssp_Consultadocu @msquery=3 con @codigo exacto. Sin
   * paginación (un contribuyente trae decenas, no miles): inicio=0/final=0.
   */
  async getValores(codigo: string): Promise<ValoresResult> {
    try {
      const result = await this.db.executeProcedure(
        'Rentas.ssp_Consultadocu',
        { msquery: 3, codigo: codigo ?? '', inicio: 0, final: 0 },
      );
      const data: ValorEmitidoRow[] = (result.recordset ?? []).map(mapValor);
      return { success: true, data, total: data.length };
    } catch (error) {
      this.logger.error(
        `[AnularValor] getValores SP error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        data: [],
        total: 0,
        error: 'Error al consultar los valores',
      };
    }
  }

  /**
   * Anulación de un valor (fase 2). Fuente: Rentas.ssp_Mvalores @msquery=10.
   *
   * El SP NO devuelve resultset ni en éxito ni en error (verificado en su
   * definición), así que el flujo es: 1) re-leer la llave con
   * ssp_Consultadocu @msquery=3 y exigir nestado='Pendiente' sin tocar la BD
   * si no cumple, 2) ejecutar @msquery=10 (@observacion = motivo,
   * @id_user = operador), 3) re-leer y exigir nestado='Anulado' para dar
   * por buena la operación.
   */
  async anularValor(dto: AnularValorDto): Promise<AnularValorResult> {
    try {
      const actual = await this.leerValor(dto);
      if (!actual) {
        return { success: false, error: 'Valor no encontrado' };
      }
      if (estadoDe(actual) !== 'Pendiente') {
        return {
          success: false,
          error: 'Solo se pueden anular valores en estado Pendiente',
        };
      }

      await this.db.executeProcedure('Rentas.ssp_Mvalores', {
        msquery: 10,
        id_valor: dto.IdValor,
        num_val: dto.NumVal,
        ano_val: dto.AnoVal,
        codigo: dto.Codigo,
        observacion: dto.Motivo,
        id_user: dto.Operador ?? '',
      });

      const despues = await this.leerValor(dto);
      if (despues && estadoDe(despues) === 'Anulado') {
        return { success: true, message: 'Valor anulado correctamente' };
      }
      return { success: false, error: 'No se pudo confirmar la anulación' };
    } catch (error) {
      this.logger.error(
        `[AnularValor] anularValor SP error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { success: false, error: 'Error al anular el valor' };
    }
  }

  /**
   * Re-lee la llave del valor con ssp_Consultadocu @msquery=3 filtrado a las
   * cuatro claves. Devuelve undefined si el SP no trae filas.
   */
  private async leerValor(dto: AnularValorDto): Promise<SpRow | undefined> {
    const result = await this.db.executeProcedure('Rentas.ssp_Consultadocu', {
      msquery: 3,
      codigo: dto.Codigo,
      id_valor: dto.IdValor,
      num_val: dto.NumVal,
      ano_val: dto.AnoVal,
      inicio: 0,
      final: 0,
    });
    return (result.recordset ?? [])[0] as SpRow | undefined;
  }
}

/**
 * Estado resuelto de @msquery=3 ('Pendiente', 'Anulado', ...). El SP trae el
 * texto, no el int; se recorta por si viene con espacios.
 */
function estadoDe(row: SpRow): string {
  const nestado: unknown = row.nestado;
  if (typeof nestado === 'string') return nestado.trim();
  if (typeof nestado === 'number') return String(nestado);
  return '';
}

/**
 * Mapea una fila cruda de @msquery=3. Descarta ROW; null → ''.
 * fecha '1900-01-01' (isnull sin registro de motivo) se mapea a ''.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapValor(raw: any): ValorEmitidoRow {
  const pick = (key: string): string => {
    const v = raw?.[key];
    return v === null || v === undefined ? '' : String(v).trim();
  };
  const monto = raw?.MontoTotal;
  const fechaRaw = pick('fecha');
  return {
    codigo: pick('codigo'),
    nombre: pick('nombre'),
    nomb_val: pick('nomb_val'),
    num_val: pick('num_val'),
    ano_val: pick('ano_val'),
    MontoTotal:
      monto === null || monto === undefined || monto === ''
        ? 0
        : Number(monto),
    fec_val: pick('fec_val'),
    id_valor: pick('id_valor'),
    num_exp: pick('num_exp'),
    ano_exp: pick('ano_exp'),
    nestado: pick('nestado'),
    fec_vence: pick('fec_vence'),
    id_mvalores: Number(raw?.id_mvalores ?? 0),
    motivo: pick('motivo'),
    operador: pick('operador'),
    fecha: fechaRaw.startsWith('1900') ? '' : fechaRaw,
  };
}
