import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchValorDto } from './dto/search-valor.dto';
import { SaveValorDto } from './dto/save-valor.dto';
import {
  ValorRow,
  ValorDetalle,
  CatalogoOption,
  PaginatedResponse,
} from './dto/valores.types';

// ── PHP-correct pagination (NOT the same as usuarios) ──

function calculateValoresPagination(page: number, pageSize: number) {
  const inicio = page > 1 ? (page - 1) * pageSize + 1 : 0;
  const fin = page * pageSize;
  return { inicio, fin };
}

// ── Service ──

@Injectable()
export class ValoresService {
  private readonly logger = new Logger(ValoresService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(
    dto: SearchValorDto,
  ): Promise<PaginatedResponse<ValorRow>> {
    const { criterio1, criterio2, criterio3, criterio4, page, pageSize } = dto;

    // SP params: empty string for undefined filters
    const criteria = {
      criterio1: criterio1 ?? '',
      criterio2: criterio2 ?? '',
      criterio3: criterio3 ?? '',
      criterio4: criterio4 ?? '',
    };

    // Total count
    const countResult = await this.db.executeProcedure<any>(
      'sp_vehiculo_valores_contar',
      criteria,
    );
    const totalRow = countResult.recordset[0];
    const total = totalRow ? (Object.values(totalRow)[0] as number) : 0;
    this.logger.log(`Total valores: ${total}`);

    // Rows with PHP-correct pagination
    const { inicio, fin } = calculateValoresPagination(page, pageSize);
    const rowsResult = await this.db.executeProcedure<any>(
      'sp_vehiculo_valores_listar',
      { ...criteria, inicio, fin },
    );

    this.logger.log(`Filas obtenidas: ${rowsResult.recordset.length}`);

    // SP returns named columns: id_valor, ejec, nomcate, nommarca, nommodelo, anio, monto, estado
    const data: ValorRow[] = rowsResult.recordset.map((row: any) => ({
      id: row.id_valor ?? '',
      ejercicio: row.ejec ?? '',
      categoria: row.nomcate ?? '',
      marca: row.nommarca ?? '',
      modelo: row.nommodelo ?? '',
      anio: row.anio ?? '',
      monto: row.monto ?? 0,
      estado: String(row.estado) === '1' ? 'ACTIVO' : 'INACTIVO',
    }));

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }

  async getDetail(id: string): Promise<ValorDetalle | null> {
    const result = await this.db.executeProcedure<any>(
      'sp_vehiculo_valores_buscar',
      { tipo: '1', datos: id },
    );
    const row = result.recordset[0];
    if (!row) return null;

    // SP returns: id_valor, id_anio, ejec, id_categoria, id_marca, nommarca,
    //             id_modelo, nommodelo, anio, monto, estado, mo.id (as xidmod)
    return {
      id: row.id_valor ?? id,
      id_anio: row.id_anio ?? '',
      ejercicio: row.ejec ?? '',
      id_categoria: row.id_categoria ?? '',
      categoria: '',
      id_marca: row.id_marca ?? '',
      marca: row.nommarca ?? '',
      id_modelo: row.id_modelo ?? '',
      modelo: row.nommodelo ?? '',
      anio: row.anio ?? '',
      monto: row.monto ?? 0,
      estado: String(row.estado),
      xidmod: row.xidmod ?? '',
    };
  }

  async getCategorias(): Promise<CatalogoOption[]> {
    const result = await this.db.executeProcedure<any>(
      'sp_vehiculo_valores_buscar',
      { tipo: '2' },
    );
    // SP SELECT: id_categoria, nombre FROM tblvehiculocategoria
    return result.recordset.map((row: any) => ({
      id: row.id_categoria ?? row.id ?? '',
      nombre: row.nombre ?? '',
    }));
  }

  async getMarcas(): Promise<CatalogoOption[]> {
    const result = await this.db.executeProcedure<any>(
      'sp_vehiculo_valores_buscar',
      { tipo: '3' },
    );
    // SP SELECT * FROM tblvehiculomarca → columns: id_marca, nombre, estado
    return result.recordset.map((row: any) => ({
      id: row.id_marca ?? row.id ?? '',
      nombre: row.nombre ?? '',
    }));
  }

  async getModelosFiltrados(
    id_categoria: string,
    id_marca: string,
  ): Promise<CatalogoOption[]> {
    const result = await this.db.executeProcedure<any>(
      'sp_vehiculo_valores_buscar',
      { tipo: '4', datos1: id_categoria, datos2: id_marca },
    );
    // SP SELECT: id, nombre FROM tblvehiculomodelo WHERE estado=1 AND id_categoria AND id_marca
    return result.recordset.map((row: any) => ({
      id: row.id ?? '',
      nombre: row.nombre ?? '',
    }));
  }

  async getAniosEjercicio(): Promise<CatalogoOption[]> {
    const result = await this.db.executeProcedure<any>(
      'sp_vehiculo_valores_buscar',
      { tipo: '5' },
    );
    // SP SELECT * FROM tblvehiculoanios → columns: id_anio, anio
    return result.recordset.map((row: any) => ({
      id: row.id_anio ?? row.id ?? '',
      nombre: row.anio ?? '',
    }));
  }

  async getAnios(): Promise<CatalogoOption[]> {
    const result = await this.db.executeProcedure<any>(
      'sp_vehiculo_valores_buscar',
      { tipo: '6' },
    );
    // SP SELECT: anio, anio1
    return result.recordset.map((row: any) => ({
      id: row.anio ?? '',
      nombre: row.anio1 ?? '',
    }));
  }

  async save(
    dto: SaveValorDto,
  ): Promise<{ success: boolean; message: string }> {
    const mquery = dto.id ? '2' : '1';

    await this.db.executeProcedure('sp_vehiculo_valores_grabar', {
      mquery,
      xid_valor: dto.id ?? 0,
      xanioeje: dto.id_anio,
      xid_categoria: dto.id_categoria,
      xid_marca: dto.id_marca,
      xid_modelo: dto.id_modelo ?? '',
      xanio: dto.anio,
      xmonto: dto.monto,
      xestado: dto.estado,
      xidmod: dto.xidmod,
    });

    return { success: true, message: 'Valor guardado correctamente' };
  }

  async eliminar(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.db.executeProcedure('sp_vehiculo_valores_grabar', {
      mquery: '3',
      xid_valor: id,
    });

    return { success: true, message: 'Valor anulado correctamente' };
  }
}
