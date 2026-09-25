import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchPrediosContribuyentesDto } from './dto/search-predios-contribuyentes.dto';
import {
  PredioContribuyenteRow,
  PaginatedResponse,
  SpPredioContribuyenteRow,
} from './dto/predios-contribuyentes.types';

@Injectable()
export class PrediosContribuyentesService {
  /**
   * Branch de consulta de predios por contribuyente dentro de Rentas.sp_Mcontribuyente.
   * `@busc=29` → `GOTO predios_por_contribuyente` → SELECT las 8 columnas
   * (Codigo, Nombre, Categoria, CodPredio, Anexo, Sub_Anexo, Predio, Junta).
   */
  private readonly SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';

  constructor(private readonly db: DatabaseService) {}

  /**
   * Consulta el listado de predios por contribuyente ejecutando
   * `Rentas.sp_Mcontribuyente @busc=29` con el parámetro `@categoria`
   * (PRICO/MECO/PECO; '' = TODOS). La rama 29 filtra por
   * `(@categoria = '' OR RENTAS.GET_TIPO_CONTRIBUYENTE(wc.codigo) = @categoria)`;
   * se traen todas las filas coincidentes y se pagina en memoria.
   */
  async search(
    dto: SearchPrediosContribuyentesDto,
  ): Promise<PaginatedResponse<PredioContribuyenteRow>> {
    const { page, pageSize, categoria } = dto;

    const result = await this.db.executeProcedure<SpPredioContribuyenteRow>(
      this.SP_MCONTRIBUYENTE,
      { busc: 29, categoria },
    );

    const allRows = result.recordset ?? [];
    const total = allRows.length;

    // Paginación en memoria
    const start = (page - 1) * pageSize;
    const paginatedRows = allRows.slice(start, start + pageSize);

    // Las columnas de texto pueden venir como string/null: se mapean a '' para
    // que el frontend no reciba null.
    const data: PredioContribuyenteRow[] = paginatedRows.map(
      (row: SpPredioContribuyenteRow) => ({
        codigo: row.Codigo ?? '',
        nombre: row.Nombre ?? '',
        categoria: row.Categoria ?? '',
        codPredio: row.CodPredio ?? '',
        anexo: row.Anexo ?? '',
        subAnexo: row.Sub_Anexo ?? '',
        predio: row.Predio ?? '',
        junta: row.Junta ?? '',
      }),
    );

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }
}