import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchPerfilDto } from './dto/search-perfil.dto';
import {
  PerfilRow,
  PaginatedResponse,
  PerfilDetail,
  ModuloRow,
  AccesoRow,
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

  // ── Detail (@busc='3') ─────────────────────────────────

  async getPerfilById(id: string): Promise<PerfilDetail> {
    const result = await this.db.executeProcedure<any>(
      '[Acceso].[sp_TblPerfil]',
      { busc: 3, id_perfil: id },
    );
    const row = result.recordset[0];
    if (!row) throw new Error(`Perfil ${id} no encontrado`);
    return {
      id: row.id_perfil ?? '',
      nombre: row.nombre ?? '',
      estado: String(row.nestado) === '1',
    };
  }

  // ── Módulos (@busc='7') ───────────────────────────────

  async getModulos(): Promise<ModuloRow[]> {
    const result = await this.db.executeProcedure<any>(
      '[Acceso].[sp_TblPerfil]',
      { busc: 7 },
    );
    return (result.recordset || []).map((row: any) => ({
      id_acceso: row.id_acceso ?? '',
      nombre: row.nombre ?? '',
    }));
  }

  // ── Accesos por módulo (@busc='8') ────────────────────

  async getAccesosByModulo(id_acceso: string): Promise<AccesoRow[]> {
    const accesosResult = await this.db.executeProcedure<any>(
      '[Acceso].[sp_TblPerfil]',
      { busc: 8, id_acceso },
    );
    return (accesosResult.recordset || []).map((row: any) => ({
      id_acceso: row.id_acceso ?? '',
      nombre: row.nombre ?? '',
      checked: false,
    }));
  }

  // ── Accesos con checked state (@busc='8' + @busc='10') ─

  async getAccesosByModuloConPermisos(
    id_acceso: string,
    id_perfil: string,
  ): Promise<AccesoRow[]> {
    const [accesosResult, permisosResult] = await Promise.all([
      this.db.executeProcedure<any>('[Acceso].[sp_TblPerfil]', {
        busc: 8,
        id_acceso,
      }),
      this.db.executeProcedure<any>('[Acceso].[sp_TblPerfil]', {
        busc: 10,
        id_perfil,
      }),
    ]);

    const accesos: AccesoRow[] = (accesosResult.recordset || []).map(
      (row: any) => ({
        id_acceso: row.id_acceso ?? '',
        nombre: row.nombre ?? '',
        checked: false,
      }),
    );

    // Build a set of checked acceso IDs from busc='10' results
    const checkedIds = new Set<string>(
      (permisosResult.recordset || [])
        .filter((r: any) => String(r.bacceso) === '1')
        .map((r: any) => r.id_acceso),
    );

    return accesos.map((a) => ({
      ...a,
      checked: checkedIds.has(a.id_acceso),
    }));
  }

  // ── Perfil-access mappings (@busc='10') ────────────────

  async getPerfilAccesos(id_perfil: string): Promise<
    { id_acceso: string; bacceso: boolean }[]
  > {
    const result = await this.db.executeProcedure<any>(
      '[Acceso].[sp_TblPerfil]',
      { busc: 10, id_perfil },
    );
    return (result.recordset || []).map((row: any) => ({
      id_acceso: row.id_acceso ?? '',
      bacceso: String(row.bacceso) === '1',
    }));
  }
}
