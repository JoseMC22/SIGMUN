import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchContribuyenteDto } from './dto/search-contribuyente.dto';
import {
  SpMContribuyenteSearchRow,
  ContribuyenteSearchResult,
  ContribuyenteSearchItem,
} from './rd-alcabala.types';

@Injectable()
export class RdAlcabalaService {
  private readonly SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';
  private readonly logger = new Logger(RdAlcabalaService.name);

  constructor(private readonly db: DatabaseService) {}

  async searchContribuyente(
    dto: SearchContribuyenteDto,
  ): Promise<ContribuyenteSearchResult> {
    const { tipoBusqueda, codigo, nombres, paterno, materno, razonSocial, numDoc, page, pageSize } = dto;

    const inicio = (page - 1) * pageSize + 1;
    const final = page * pageSize;

    const baseParams = {
      codigo: codigo || '',
      nombres: nombres || '',
      paterno: paterno || '',
      materno: materno || '',
      num_doc: numDoc || '',
      tipo_busqueda: tipoBusqueda || '',
      razon: razonSocial || '',
      cod_pred: '',
      checkfrac: '0',
    };

    // Total count
    const totalResult = await this.db.executeProcedure<any>(
      this.SP_MCONTRIBUYENTE,
      { ...baseParams, busc: 6 },
    );
    const totalRow = totalResult.recordset?.[0];
    const total = totalRow ? Number(Object.values(totalRow)[0]) : 0;

    // Paginated rows
    const rowsResult = await this.db.executeProcedure<SpMContribuyenteSearchRow>(
      this.SP_MCONTRIBUYENTE,
      { ...baseParams, busc: 5, inicio: String(inicio), final: String(final) },
    );

    const data: ContribuyenteSearchItem[] = (
      rowsResult.recordset || []
    ).map((row) => ({
      codigo: row.codigo ?? '',
      paterno: row.paterno ?? '',
      materno: row.materno ?? '',
      nombres: row.nombres ?? '',
      numDoc: row.num_doc ?? '',
      direccion: row.DireFis ?? '',
      row: row.ROW ?? 0,
    }));

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return {
      success: true,
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }
}
