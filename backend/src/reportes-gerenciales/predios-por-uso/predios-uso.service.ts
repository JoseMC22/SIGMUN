import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchPredioUsoDto } from './dto/search-predio-uso.dto';
import {
  PredioUsoRow,
  PaginatedResponse,
} from './dto/predios-uso.types';

// ── Pure pagination helper (in-memory slice indices) ──

export function calculatePaginationParams(page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  const end = page * pageSize;
  return { start, end };
}

// ── Service ──

@Injectable()
export class PrediosUsoService {
  constructor(private readonly db: DatabaseService) {}

  async search(dto: SearchPredioUsoDto): Promise<PaginatedResponse<PredioUsoRow>> {
    const { codigo, anno, uso, page, pageSize } = dto;
    const { start, end } = calculatePaginationParams(page, pageSize);

    // Single SP call — returns ALL matching rows (no @inicio/@final params)
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[Rpt_Rentas_General]',
      {
        BUSC: 1,
        CODIGO: codigo || '',
        anno: anno ?? new Date().getFullYear(),
        uso: uso || '',
      },
    );

    const allRows: PredioUsoRow[] = (result.recordset || []).map((row: any) => ({
      tipo: row.tipo ?? '',
      uso: row.uso ?? '',
      predios: row.predios ?? 0,
      condicion: row.condicion ?? '',
      count: row.count ?? 0,
      anno: row.anno ?? 0,
      id_uso: row.id_uso ?? '',
    }));

    const total = allRows.length;
    const data = allRows.slice(start, end);
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }
}
