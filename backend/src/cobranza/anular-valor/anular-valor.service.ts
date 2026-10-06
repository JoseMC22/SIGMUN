import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  AnularValorContribuyenteRow,
  AnularValorResult,
  ValorEmitidoRow,
  ValoresResult,
} from './anular-valor.types';
import { SearchAnularValorDto } from './dto/search-anular-valor.dto';

/**
 * Listado de contribuyentes para anular-valor (fase 1: sin anulación).
 *
 * Fuente: Rentas.ssp_Mcontribuyente @busc=5 (rama msconsulta). El SP filtra
 * según @tipo_busqueda (C/N/R/D) y pagina con @inicio/@final 1-based, pero NO
 * tiene COUNT: para el total exacto se trae todo lo filtrado (@inicio=0,
 * @final=0, sin límite) y se pagina en memoria.
 *
 * Columnas mostradas (8 identificatorias de las ~29 del SP): el resto son
 * códigos internos, partes de dirección (DireFis ya la trae armada) y auditoría.
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
    TipoPersona: row.TipoPersona ?? '',
  };
}

@Injectable()
export class AnularValorService {
  private readonly logger = new Logger(AnularValorService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(dto: SearchAnularValorDto): Promise<AnularValorResult> {
    try {
      const result = await this.db.executeProcedure(
        'Rentas.ssp_Mcontribuyente',
        {
          busc: 5,
          tipo_busqueda: dto.TipoBusqueda,
          codigo: dto.Codigo ?? '',
          paterno: dto.Paterno ?? '',
          materno: dto.Materno ?? '',
          nombres: dto.Nombres ?? '',
          razon: dto.Razon ?? '',
          num_doc: dto.NumDoc ?? '',
          inicio: 0,
          final: 0,
        },
      );

      const allRows: AnularValorContribuyenteRow[] = (
        result.recordset ?? []
      ).map(mapRow);
      const total = allRows.length;

      // Modo exportación interna: todo sin paginar.
      if (dto.pageSize === 100000) {
        return {
          success: true,
          data: allRows,
          total,
          page: 1,
          pageSize: 100000,
          totalPages: total > 0 ? 1 : 0,
        };
      }

      const start = (dto.page - 1) * dto.pageSize;
      const data = allRows.slice(start, start + dto.pageSize);

      return {
        success: true,
        data,
        total,
        page: dto.page,
        pageSize: dto.pageSize,
        totalPages: total > 0 ? Math.ceil(total / dto.pageSize) : 0,
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
