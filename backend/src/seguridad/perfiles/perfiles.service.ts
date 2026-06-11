import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchPerfilDto } from './dto/search-perfil.dto';
import {
  SpPerfilRow,
  SpPerfilTotal,
  PerfilRow,
  PaginatedResponse,
} from './dto/perfiles.types';

// ── Pure pagination helper ──

function calculatePaginationParams(page: number, pageSize: number) {
  const inicio = (page - 1) * pageSize + 1;
  const final = page * pageSize;
  return { inicio, final };
}

// ── Service ──

@Injectable()
export class PerfilesService {
  private readonly logger = new Logger(PerfilesService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(dto: SearchPerfilDto): Promise<PaginatedResponse<PerfilRow>> {
    const { codigo, nombre, estado, page, pageSize } = dto;
    const { inicio, final } = calculatePaginationParams(page, pageSize);

    // Total count
    const totalResult = await this.db.executeProcedure<any>(
      '[Acceso].[sp_TblPerfil]',
      {
        busc: 6,
        id_perfil: codigo || '',
        nombre: nombre || '',
        nest: estado ?? '',
      },
    );
    const totalRow = totalResult.recordset[0];
    const total = totalRow ? Object.values(totalRow)[0] as number : 0;
    this.logger.log(`Total perfiles: ${total}`);

    // Rows
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

    this.logger.log(`Filas obtenidas: ${rowsResult.recordset.length}`);

    const data = rowsResult.recordset.map((row: any) => ({
      id: row.id_perfil ?? '',
      nombre: row.nombre ?? '',
      estado: String(row.nestado) === '1' ? 'ACTIVADO' : 'DESACTIVADO',
    }));

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }
}
