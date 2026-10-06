import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchContribuyentesSinValoresDto } from './dto/search-contribuyentes-sin-valores.dto';
import {
  ContribuyenteSinValoresRow,
  PaginatedResponse,
  SpContribuyenteSinValoresRow,
} from './contribuyentes-sin-valores.types';

@Injectable()
export class ContribuyentesSinValoresService {
  /**
   * Branch de consulta de contribuyentes sin valores tributarios dentro de
   * Rentas.sp_Mvalores. `@msquery=13` → `contribuyentes_sin_valor_por_año` →
   * SELECT las 11 columnas (Codigo, Categoria, Nombre, Direccion, Junta, Anno,
   * periodos, TOTAL_INSOL, TOTAL_INTERES, TOTAL_COSTO_EMIS, TOTAL_GENERAL).
   */
  private readonly SP_MVALORES = 'Rentas.sp_Mvalores';

  constructor(private readonly db: DatabaseService) {}

  /**
   * Consulta el listado de contribuyentes sin valores tributarios ejecutando
   * `Rentas.sp_Mvalores @msquery=13` con el parámetro `@ano_val` (char(4)),
   * que siempre se envía: el año lo determina el frontend, el backend no
   * aplica defaults. El SP no pagina, por lo que se traen todas las filas
   * coincidentes y se pagina en memoria.
   */
  async search(
    dto: SearchContribuyentesSinValoresDto,
  ): Promise<PaginatedResponse<ContribuyenteSinValoresRow>> {
    const { page, pageSize, anoVal } = dto;

    const result = await this.db.executeProcedure<SpContribuyenteSinValoresRow>(
      this.SP_MVALORES,
      { msquery: 13, ano_val: anoVal },
    );

    const allRows = result.recordset ?? [];
    const total = allRows.length;

    // Paginación en memoria
    const start = (page - 1) * pageSize;
    const paginatedRows = allRows.slice(start, start + pageSize);

    // Las columnas de texto pueden venir como string/null: se mapean a '' y las
    // numéricas a 0 para que el frontend no reciba null.
    const data: ContribuyenteSinValoresRow[] = paginatedRows.map(
      (row: SpContribuyenteSinValoresRow) => ({
        codigo: row.Codigo ?? '',
        categoria: row.Categoria ?? '',
        nombre: row.Nombre ?? '',
        direccion: row.Direccion ?? '',
        junta: row.Junta ?? '',
        anno: row.Anno ?? '',
        periodos: row.periodos ?? '',
        totalInsol: row.TOTAL_INSOL ?? 0,
        totalInteres: row.TOTAL_INTERES ?? 0,
        totalCostoEmis: row.TOTAL_COSTO_EMIS ?? 0,
        totalGeneral: row.TOTAL_GENERAL ?? 0,
      }),
    );

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }
}
