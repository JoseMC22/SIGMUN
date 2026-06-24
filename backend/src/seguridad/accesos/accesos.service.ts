import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchAccesoDto } from './dto/search-acceso.dto';
import {
  AccesoRow,
  PaginatedResponse,
  MenuOption,
} from './dto/accesos.types';

// ── Pure pagination helper ──

export function calculatePaginationParams(page: number, pageSize: number) {
  const inicio = (page - 1) * pageSize + 1;
  const final = page * pageSize;
  return { inicio, final };
}

// ── Service ──

@Injectable()
export class AccesosService {
  constructor(private readonly db: DatabaseService) {}

  async search(dto: SearchAccesoDto): Promise<PaginatedResponse<AccesoRow>> {
    const { id_acceso, nombre, orden, menu, pantalla, page, pageSize } = dto;
    const { inicio, final } = calculatePaginationParams(page, pageSize);

    // Total count (@busc='6' — solo filtros, sin paginación)
    const totalResult = await this.db.executeProcedure<any>(
      '[Acceso].[SP_MAcceso]',
      {
        busc: 6,
        id_acceso: id_acceso || '',
        nombre: nombre || '',
        orden: orden || '',
        menu: menu || '',
        pantalla: pantalla || '',
      },
    );
    const totalRow = totalResult.recordset[0];
    const total = totalRow ? (Object.values(totalRow)[0] as number) : 0;

    // Paginated rows (@busc='5' — filtros + paginación)
    const rowsResult = await this.db.executeProcedure<any>(
      '[Acceso].[SP_MAcceso]',
      {
        busc: 5,
        id_acceso: id_acceso || '',
        nombre: nombre || '',
        orden: orden || '',
        menu: menu || '',
        pantalla: pantalla || '',
        inicio,
        final,
      },
    );

    const data: AccesoRow[] = rowsResult.recordset.map((row: any) => ({
      id_acceso: row.id_acceso ?? '',
      orden: row.orden ?? '',
      nombre: row.nombre ?? '',
      id_objeto: row.id_objeto ?? '',
      icono: row.icono ?? '',
      doform: row.doform ?? '',
      nestado: String(row.nestado),
    }));

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }

  // ── Menús (@busc='8') ─────────────────────────────────

  async getMenus(): Promise<MenuOption[]> {
    const result = await this.db.executeProcedure<any>(
      '[Acceso].[SP_MAcceso]',
      { busc: 8 },
    );
    return (result.recordset || []).map((row: any) => ({
      id_acceso: row.id_acceso ?? '',
      nommenu: row.nommenu ?? '',
    }));
  }

  // ── Módulos por menú (@busc='9') ──────────────────────

  async getModulos(menuId: string): Promise<MenuOption[]> {
    if (!menuId) return [];

    const result = await this.db.executeProcedure<any>(
      '[Acceso].[SP_MAcceso]',
      { busc: 9, id_acceso: menuId },
    );
    return (result.recordset || []).map((row: any) => ({
      id_acceso: row.id_acceso ?? '',
      nommenu: row.nommenu ?? '',
    }));
  }
}
