import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchPredioUsoDto } from './dto/search-predio-uso.dto';
import { DetallePredioUsoDto } from './dto/detalle-predio-uso.dto';
import {
  PredioUsoRow,
  PaginatedResponse,
} from './dto/predios-uso.types';

// ── Case-insensitive column accessor (mssql v12+ preserves SP casing) ──

function col(row: Record<string, any>, name: string): any {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key !== undefined ? row[key] : undefined;
}

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

  async getDetail(dto: DetallePredioUsoDto): Promise<Record<string, any>[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[Rpt_Rentas_General]',
      {
        BUSC: 9,
        CODIGO: dto.codigo,
        ANNO: dto.anno,
        ID_USO: dto.id_uso,
        FLAG: dto.flag,
      },
    );
    return result.recordset ?? [];
  }

  async getUsoOptions(): Promise<{ value: string; label: string }[]> {
    const result = await this.db.executeProcedure<any>(
      '[Rentas].[sp_predio]',
      {
        msquery: 3,
        tipo_predi: 1,
      },
    );
    return (result.recordset || []).map((row: any) => {
      const keys = Object.keys(row);
      const value = String(keys.length > 0 ? row[keys[0]] : '');
      const label = String(keys.length > 1 ? row[keys[1]] : value);
      return { value, label };
    });
  }
}
