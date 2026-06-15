import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchPerfilDto } from './dto/search-perfil.dto';
import {
  PerfilRow,
  PaginatedResponse,
} from './dto/perfiles.types';

// ── Pure pagination helper ──

export function calculatePaginationParams(page: number, pageSize: number) {
  const inicio = (page - 1) * pageSize + 1;
  const final = page * pageSize;
  return { inicio, final };
}

// ── Service ──

@Injectable()
export class PerfilesService {
  constructor(private readonly db: DatabaseService) {}

  async search(dto: SearchPerfilDto): Promise<PaginatedResponse<PerfilRow>> {
    const { codigo, nombre, estado, page, pageSize } = dto;
    const { inicio, final } = calculatePaginationParams(page, pageSize);

    // Total count (@busc='6' — params: id_perfil, nombre, nestado, returns single scalar)
    const totalResult = await this.db.executeProcedure<any>(
      '[Acceso].[sp_TblPerfil]',
      {
        busc: 6,
        id_perfil: codigo || '',
        nombre: nombre || '',
        nestado: estado ?? '',
      },
    );
    const totalRow = totalResult.recordset[0];
    const total = totalRow ? Object.values(totalRow)[0] as number : 0;

    // Paginated rows (@busc='5' — params: id_perfil, nombre, nest, inicio, final)
    const rowsResult = await this.db.executeProcedure<any>(
      '[Acceso].[sp_TblPerfil]',
      {
        busc: 5,
        id_perfil: codigo || '',
        nombre: nombre || '',
        nest: estado ?? '',
        inicio,
        final,
      },
    );

    const data = rowsResult.recordset.map((row: any) => ({
      id: row.id_perfil ?? '',
      nombre: row.nombre ?? '',
      estado: String(row.nestado) === '1' ? 'ACTIVADO' : 'DESACTIVADO',
    }));

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }
}
