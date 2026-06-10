import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchUsuarioDto } from './dto/search-usuario.dto';
import { UpdateUsuarioDto, CambiarClaveDto } from './dto/update-usuario.dto';
import {
  SpUsuariosRow,
  SpAreaRow,
  SpPerfilRow,
  SpUsuarioDetalleRow,
  SpTipoDocumentoRow,
  SpCajeroRow,
  UsuarioRow,
  UsuarioDetalle,
  AreaOption,
  PerfilOption,
  TipoDocumentoOption,
  CajeroOption,
  PaginatedResponse,
} from './dto/usuarios.types';

// ── Pure pagination helper (tested directly via T3) ──

export interface PaginationParams {
  inicio: number;
  final: number;
  totalPages?: number;
}

export function calculatePaginationParams(
  page: number,
  pageSize: number,
  total?: number,
): PaginationParams {
  const inicio = (page - 1) * pageSize + 1;
  const final = page * pageSize;
  const result: PaginationParams = { inicio, final };
  if (total !== undefined) {
    result.totalPages = Math.ceil(total / pageSize);
  }
  return result;
}

// ── Service ──

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(dto: SearchUsuarioDto): Promise<PaginatedResponse<UsuarioRow>> {
    const { codigo, nombre, usuario, area, perfil, estado, page, pageSize } = dto;

    const { inicio, final } = calculatePaginationParams(page, pageSize);

    // Total count — extract the first numeric value from whatever column the SP returns
    const totalResult = await this.db.executeProcedure<any>(
      '[Acceso].[sp_TblUsuarios]',
      {
        busc: 6,
        id_usuario: codigo || '',
        nombres: nombre || '',
        vlogin: usuario || '',
        area: area || '',
        id_perfil: perfil || '',
        nest: estado ?? '',
      },
    );
    const totalRow = totalResult.recordset[0];
    const total = totalRow ? Object.values(totalRow)[0] as number : 0;
    this.logger.log(`Total usuarios: ${total}`);

    // Rows
    const rowsResult = await this.db.executeProcedure<any>(
      '[Acceso].[sp_TblUsuarios]',
      {
        busc: 5,
        id_usuario: codigo || '',
        nombres: nombre || '',
        vlogin: usuario || '',
        area: area || '',
        id_perfil: perfil || '',
        nest: estado ?? '',
        inicio,
        final,
      },
    );

    this.logger.log(`Filas obtenidas: ${rowsResult.recordset.length}`);

    const data = rowsResult.recordset.map((row: any) => ({
      id: row.id_usuario ?? '',
      nombre: row.nombre ?? '',
      area: row.area ?? '',
      perfil: row.perfil ?? '',
      usuario: row.vlogin ?? '',
      estado: String(row.nestado) === '1' ? 'ACTIVADO' : 'DESACTIVADO',
    }));

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }

  async getAreas(): Promise<AreaOption[]> {
    const result = await this.db.executeProcedure<SpAreaRow>('dbo.sp_tccostos', {
      busc: '1',
    });
    return result.recordset.map((row) => ({
      area: row.area,
      nombre: row.nombre,
    }));
  }

  async getPerfiles(): Promise<PerfilOption[]> {
    const result = await this.db.executeProcedure<SpPerfilRow>(
      '[Acceso].[sp_TblPerfil]',
      {
        busc: '4',
      },
    );
    return result.recordset
      .filter((row) => row.nestado === 1)
      .map((row) => ({
        id_perfil: row.id_perfil,
        nombre: row.nombre,
      }));
  }

  async getUserDetail(id_usuario: string): Promise<UsuarioDetalle | null> {
    const result = await this.db.executeProcedure<SpUsuarioDetalleRow>(
      '[Acceso].[sp_TblUsuarios]',
      { busc: '9', id_usuario },
    );
    const row = result.recordset[0];
    if (!row) return null;
    return {
      id_usuario, // <-- usamos el parámetro, el SP no devuelve esta columna
      nombres: row.nombres,
      apellidos: row.apellidos,
      area: row.area,
      vlogin: row.vlogin,
      id_perfil: row.id_perfil,
      id_doc: row.id_doc,
      num_doc: row.num_doc,
      cargo: row.cargo,
      cajero: row.cajero,
      nestado: String(row.nestado),
    };
  }

  async getTiposDocumento(): Promise<TipoDocumentoOption[]> {
    const result = await this.db.executeProcedure<SpTipoDocumentoRow>(
      '[Acceso].[sp_TblUsuarios]',
      { busc: '8' },
    );
    return result.recordset.map((row) => {
      const parts = (row.id_doc ?? '').split('/');
      return {
        codigo: parts[0] ?? '',
        nombre: row.documento ?? '',
        maxLength: parseInt(parts[1], 10) || 0,
      };
    });
  }

  async getCajeros(): Promise<CajeroOption[]> {
    const result = await this.db.executeProcedure<SpCajeroRow>(
      '[Acceso].[sp_TblUsuarios]',
      { busc: '10' },
    );
    return result.recordset.map((row) => ({
      codigo: row.caja,
      nombre: row.caja,
    }));
  }

  async updateUsuario(dto: UpdateUsuarioDto): Promise<{ success: boolean; message: string }> {
    await this.db.executeProcedure(
      '[Acceso].[sp_TblUsuarios]',
      {
        busc: dto.busc ?? '2',
        id_usuario: dto.id_usuario,
        area: dto.area,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        id_doc: dto.id_doc,
        num_doc: dto.num_doc,
        vlogin: dto.vlogin,
        password: dto.password ?? '',
        confir: dto.confir ?? '',
        cargo: dto.cargo,
        cajero: dto.cajero,
        caja: dto.caja,
        id_perfil: dto.id_perfil,
        nestado: dto.nestado,
      },
    );
    return { success: true, message: 'Usuario actualizado correctamente' };
  }

  async eliminarUsuario(id_usuario: string): Promise<{ success: boolean; message: string }> {
    await this.db.executeProcedure(
      '[Acceso].[sp_TblUsuarios]',
      { busc: '3', id_usuario },
    );
    return { success: true, message: 'Usuario eliminado correctamente' };
  }

  async cambiarClave(dto: CambiarClaveDto): Promise<{ success: boolean; message: string }> {
    await this.db.executeProcedure(
      '[Acceso].[sp_TblUsuarios]',
      {
        busc: '15',
        id_usuario: dto.id_usuario,
        password: dto.password,
        confir: dto.confir,
      },
    );
    return { success: true, message: 'Contraseña actualizada correctamente' };
  }
}
