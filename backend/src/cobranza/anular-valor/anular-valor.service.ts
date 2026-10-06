import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  AnularValorContribuyenteRow,
  AnularValorResult,
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
}
