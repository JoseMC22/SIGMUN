import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  AnularValorContribuyenteRow,
  AnularValorResult,
} from './anular-valor.types';
import { SearchAnularValorDto } from './dto/search-anular-valor.dto';

/**
 * Fase 1 de anular-valor: solo listado de contribuyentes.
 * Espejo de maestro-contribuyentes: `Rentas.sp_Mcontribuyente @busc=28` trae
 * todas las filas (la vista tiene ~86k) y se pagina en memoria porque esa rama
 * del SP no pagina. NO hay lógica de anulación acá (fase 2).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpRow = Record<string, any>;

function mapRow(row: SpRow): AnularValorContribuyenteRow {
  return {
    codigo: row.CODIGO ?? '',
    nombre: row.NOMBRE ?? '',
    direccion: row.DIRECCION ?? '',
    junta: row.JUNTA ?? '',
    dni: row.DNI ?? '',
    correo: row.CORREO ?? '',
    idVia: row.ID_VIA ?? '',
    telefono1: row.TELEFONO1 ?? '',
    baseImponible: row.BASE_IMPONIBLE ?? 0,
    inafecto: row.INAFECTO ?? 0,
    categoria: row.CATEGORIA ?? '',
    gestor: row.GESTOR ?? '',
    impAnual: row.IMP_ANUAL ?? 0,
    impTrime: row.IMP_TRIME ?? 0,
    costoEmi: row.COSTO_EMI ?? 0,
    impTotal: row.IMPTOTAL ?? 0,
  };
}

@Injectable()
export class AnularValorService {
  private readonly logger = new Logger(AnularValorService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(dto: SearchAnularValorDto): Promise<AnularValorResult> {
    try {
      const result = await this.db.executeProcedure(
        'Rentas.sp_Mcontribuyente',
        { busc: 28 },
      );

      const allRows: AnularValorContribuyenteRow[] = (
        result.recordset ?? []
      ).map(mapRow);
      const total = allRows.length;

      // Modo exportación: todo sin paginar.
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
