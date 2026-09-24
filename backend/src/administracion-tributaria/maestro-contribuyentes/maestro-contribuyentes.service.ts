import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchMaestroContribuyentesDto } from './dto/search-maestro-contribuyentes.dto';
import {
  ContribuyenteRow,
  PaginatedResponse,
  SpListaContribuyenteRow,
} from './dto/maestro-contribuyentes.types';

@Injectable()
export class MaestroContribuyentesService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Consulta el listado completo de contribuyentes desde la vista consolidada
   * REPORTS.VW_LISTACONTRIBUYENTE (primera consulta al schema REPORTS del repo).
   * La vista no recibe parámetros: se traen todas las filas y se pagina en memoria.
   */
  async search(
    dto: SearchMaestroContribuyentesDto,
  ): Promise<PaginatedResponse<ContribuyenteRow>> {
    const { page, pageSize } = dto;

    const result = await this.db.query<SpListaContribuyenteRow>(
      `SELECT wc.CODIGO, wc.NOMBRE, wc.DIRECCION, wc.JUNTA, wc.DNI, wc.CORREO, wc.ID_VIA,
              wc.TELEFONO1, wc.BASE_IMPONIBLE, wc.INAFECTO, wc.CATEGORIA, wc.GESTOR,
              wc.IMP_ANUAL, wc.IMP_TRIME, wc.COSTO_EMI, wc.IMPTOTAL
       FROM REPORTS.VW_LISTACONTRIBUYENTE wc`,
    );

    const allRows = result.recordset ?? [];
    const total = allRows.length;

    // Paginación en memoria
    const start = (page - 1) * pageSize;
    const paginatedRows = allRows.slice(start, start + pageSize);

    // Las columnas numéricas pueden venir como number/null: se mapean a 0
    // (y las de texto a '') para que el frontend no reciba null.
    const data: ContribuyenteRow[] = paginatedRows.map((row: SpListaContribuyenteRow) => ({
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
    }));

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }
}