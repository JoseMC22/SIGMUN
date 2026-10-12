import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchMantenimientoIngresosDto } from './dto/search-mantenimiento-ingresos.dto';
import {
  MantenimientoIngresoRow,
  PaginatedResponse,
  SpMantenimientoIngresoRow,
} from './dto/mantenimiento-ingresos.types';

@Injectable()
export class MantenimientoIngresosService {
  /**
   * Clasificador de ingresos vía `dbo.t_tipo_sing @msquery=15`.
   * Contrato real del SP (definición verificada):
   * - `@tipo` no vacío → `TI.buscar LIKE '<valor>%'` (filtro por código).
   * - `@nombre` no vacío → ROMPE (`TI.nombre` no existe en `t_tiposing`,
   *   la columna es `concepto`): nunca se envía con contenido.
   * - `@area` fijo ''.
   * Por eso: criterio `C` → `@tipo=valor`; criterio `N` → se trae el listado
   * y se filtra en memoria por `Nombre_Tipo` (contiene, case-insensitive),
   * igual que la paginación en memoria del patrón del repo.
   */
  private readonly SP_T_TIPO_SING = 'dbo.t_tipo_sing';

  constructor(private readonly db: DatabaseService) {}

  /**
   * Consulta el clasificador ejecutando el SP con filtros y pagina en memoria
   * (el SP no recibe @inicio/@final para este branch).
   */
  async search(
    dto: SearchMantenimientoIngresosDto,
  ): Promise<PaginatedResponse<MantenimientoIngresoRow>> {
    const { criterio, valor, page, pageSize } = dto;
    const criterioCodigo = (criterio ?? 'C') === 'C';
    const valorTrim = (valor ?? '').trim();

    const result = await this.db.executeProcedure<SpMantenimientoIngresoRow>(
      this.SP_T_TIPO_SING,
      {
        msquery: 15,
        tipo: criterioCodigo ? valorTrim : '',
        nombre: '',
        area: '',
      },
    );

    let allRows: SpMantenimientoIngresoRow[] = result.recordset ?? [];

    // Criterio N: el SP no puede filtrar por nombre (columna inexistente),
    // se filtra en memoria sobre Nombre_Tipo.
    if (!criterioCodigo && valorTrim !== '') {
      const needle = valorTrim.toUpperCase();
      allRows = allRows.filter((row) =>
        ((row.Nombre_Tipo ?? row.NOMBRE_TIPO ?? '') as string)
          .toUpperCase()
          .includes(needle),
      );
    }

    const total = allRows.length;

    // Paginación en memoria
    const start = (page - 1) * pageSize;
    const paginatedRows = allRows.slice(start, start + pageSize);

    const data: MantenimientoIngresoRow[] = paginatedRows.map(
      (row: SpMantenimientoIngresoRow) => ({
        codigo: ((row.Tipo ?? row.TIPO ?? '') as string) ?? '',
        concepto: ((row.Nombre_Tipo ?? row.NOMBRE_TIPO ?? '') as string) ?? '',
        partida: ((row.Partida ?? row.PARTIDA ?? '') as string) ?? '',
        nombre: ((row.Nombre ?? row.NOMBRE ?? '') as string) ?? '',
        ftefin: ((row.Ftefin ?? row.FTEFIN ?? '') as string) ?? '',
        valor: (row.Valor ?? row.VALOR ?? 0) as number,
      }),
    );

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }
}
