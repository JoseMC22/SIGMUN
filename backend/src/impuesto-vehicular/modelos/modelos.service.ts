import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchModeloDto } from './dto/search-modelo.dto';
import { SaveModeloDto } from './dto/save-modelo.dto';
import {
  SpModeloRow,
  SpBuscarRow,
  ModeloRow,
  ModeloDetalle,
  CatalogoOption,
  PaginatedResponse,
} from './dto/modelos.types';

// ── PHP-correct pagination (NOT the same as usuarios) ──

function calculateModeloPagination(page: number, pageSize: number) {
  const inicio = page > 1 ? (page - 1) * pageSize + 1 : 0;
  const fin = page * pageSize;
  return { inicio, fin };
}

// ── Service ──

@Injectable()
export class ModelosService {
  private readonly logger = new Logger(ModelosService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(dto: SearchModeloDto): Promise<PaginatedResponse<ModeloRow>> {
    const { tipoBusqueda, criterio, page, pageSize } = dto;
    const tipo = tipoBusqueda ?? '';
    const crit = criterio ?? '';

    // Total count
    const countResult = await this.db.executeProcedure<any>(
      'sp_vehiculo_modelo_contar',
      { tipo, criterio: crit },
    );
    const totalRow = countResult.recordset[0];
    const total = totalRow ? (Object.values(totalRow)[0] as number) : 0;
    this.logger.log(`Total modelos: ${total}`);

    // Rows with PHP-correct pagination
    const { inicio, fin } = calculateModeloPagination(page, pageSize);
    const rowsResult = await this.db.executeProcedure<any>(
      'sp_vehiculo_modelo_listar',
      { tipo, criterio: crit, inicio, fin },
    );

    this.logger.log(`Filas obtenidas: ${rowsResult.recordset.length}`);

    const data: ModeloRow[] = rowsResult.recordset.map((row: any) => {
      // SP sp_vehiculo_modelo_listar column names:
      //   id_modelo | id_marca | nombre_mar | nombre_mod | estado | nombre_cat | id | ROW
      return {
        codmodelo: row.id_modelo ?? '',
        marca: row.nombre_mar ?? '',
        nombre: row.nombre_mod ?? '',
        estado: String(row.estado) === '1' ? 'ACTIVO' : 'INACTIVO',
        categoria: row.nombre_cat ?? '',
        id: row.id ?? '',
      };
    });

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }

  async getDetail(id: string): Promise<ModeloDetalle | null> {
    const result = await this.db.executeProcedure<any>(
      'sp_vehiculo_modelo_buscar',
      { tipo: '1', datos: id },
    );
    const row = result.recordset[0];
    if (!row) return null;

    // SP does SELECT * FROM contenedor.tblvehiculomodelo
    // Column names: id | id_modelo | nombre | id_categoria | id_marca | estado

    return {
      id: row.id ?? id,
      codmodelo: row.id_modelo ?? '',
      nombre: row.nombre ?? '',
      id_marca: row.id_marca ?? '',
      marca: '',
      id_categoria: row.id_categoria ?? '',
      categoria: '',
      estado: String(row.estado) === '1' ? 'ACTIVO' : 'INACTIVO',
    };
  }

  async getMarcas(): Promise<CatalogoOption[]> {
    const result = await this.db.executeProcedure<any>(
      'sp_vehiculo_modelo_buscar',
      { tipo: '3', datos: '1' },
    );
    // SP: SELECT * FROM tblvehiculomarca → columnas: id_marca, nombre, ...
    return result.recordset.map((row: any) => ({
      id: row.id_marca ?? row.id ?? '',
      nombre: row.nombre ?? '',
    }));
  }

  async getCategorias(): Promise<CatalogoOption[]> {
    const result = await this.db.executeProcedure<any>(
      'sp_vehiculo_modelo_buscar',
      { tipo: '2', datos: '1' },
    );
    // SP: SELECT id_categoria, nombre FROM tblvehiculocategoria
    return result.recordset.map((row: any) => ({
      id: row.id_categoria ?? row.id ?? '',
      nombre: row.nombre ?? '',
    }));
  }

  async save(
    dto: SaveModeloDto,
  ): Promise<{ success: boolean; message: string }> {
    const mquery = dto.id ? '2' : '1';

    await this.db.executeProcedure('sp_vehiculo_modelo_grabar', {
      mquery,
      xid_modelo: dto.id ?? '',
      xnombre: dto.nombre,
      xid_categoria: dto.id_categoria,
      xid_marca: dto.id_marca,
      xestado: dto.estado,
    });

    return { success: true, message: 'Modelo guardado correctamente' };
  }

  async eliminar(id: string): Promise<{ success: boolean; message: string }> {
    await this.db.executeProcedure('sp_vehiculo_modelo_grabar', {
      mquery: '3',
      xid_modelo: id,
    });

    return { success: true, message: 'Modelo eliminado correctamente' };
  }
}
