import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchReporteInafectosDto } from './dto/search-reporte-inafectos.dto';
import {
  ReporteInafectosRow,
  AnnoOption,
  UsoOption,
  PaginatedResponse,
} from './dto/reporte-inafectos.types';

@Injectable()
export class ReporteInafectosService {
  private readonly logger = new Logger(ReporteInafectosService.name);
  private readonly SP_REPORTE = 'Rentas.Reporte_recaudacion';

  constructor(private readonly db: DatabaseService) {}

  /**
   * Obtiene los años disponibles (@buscar=3).
   * El SP retorna una fila: col[0]=año_max, col[1]=año_min.
   */
  async getAnios(): Promise<AnnoOption[]> {
    try {
      const result = await this.db.executeProcedure<any>(this.SP_REPORTE, {
        buscar: 3,
      });

      const row = result.recordset?.[0];
      if (!row) return this._fallbackAnios();

      const vals = Object.values(row);
      let anioMax = new Date().getFullYear();
      let anioMin = 1998;

      if (vals.length >= 2) {
        const v0 = Number(vals[0]);
        const v1 = Number(vals[1]);
        if (!isNaN(v0) && v0 > 1900) anioMax = v0;
        if (!isNaN(v1) && v1 > 1900) anioMin = v1;
        if (anioMax < anioMin) [anioMax, anioMin] = [anioMin, anioMax];
      } else if (vals.length === 1) {
        const v0 = Number(vals[0]);
        if (!isNaN(v0) && v0 > 1900) anioMax = v0;
      }

      const options: AnnoOption[] = [];
      for (let y = anioMax; y >= anioMin; y--) {
        options.push({ anno: String(y) });
      }
      return options;
    } catch (error) {
      this.logger.error('Error al obtener años para reporte de inafectos', error);
      return this._fallbackAnios();
    }
  }

  private _fallbackAnios(): AnnoOption[] {
    const current = new Date().getFullYear();
    const fallback: AnnoOption[] = [];
    for (let y = current; y >= 2000; y--) {
      fallback.push({ anno: String(y) });
    }
    return fallback;
  }

  /**
   * Obtiene los usos disponibles (@buscar=2).
   */
  async getUsos(): Promise<UsoOption[]> {
    try {
      const result = await this.db.executeProcedure<any>(this.SP_REPORTE, {
        buscar: 2,
      });

      const records = result.recordset ?? [];
      return records.map((r: any) => {
        const vals = Object.values(r);
        const idUso = (
          r.id_uso ?? r.ID_USO ?? r.Id_Uso ?? vals[0] ?? ''
        ).toString().trim();
        const uso = (
          r.uso ?? r.USO ?? r.Uso ?? r.descripcion ?? r.Descripcion ?? vals[1] ?? ''
        ).toString().trim();
        return { id_uso: idUso, uso };
      });
    } catch (error) {
      this.logger.error('Error al obtener usos para reporte de inafectos', error);
      return [];
    }
  }

  /**
   * Ejecuta el SP @buscar=1 en una única sesión creando la tabla temporal #TMP_PREDIOS
   * para prevenir el error SQL 3701 (DROP TABLE en el SP antiguo).
   */
  private async _executeSP1(anno: string, id_uso: string): Promise<any[]> {
    const sql = `
      IF OBJECT_ID('tempdb..#TMP_PREDIOS') IS NULL
        CREATE TABLE #TMP_PREDIOS (_init BIT);

      EXEC [Rentas].[Reporte_recaudacion]
        @buscar = @buscar,
        @anno   = @anno,
        @id_uso = @id_uso;
    `;

    const result = await this.db.queryWithParams<any>(sql, {
      buscar: 1,
      anno: anno,
      id_uso: id_uso || '',
    });

    const rs: any[][] = (result as any).recordsets ?? [result.recordset ?? []];
    const dataRecordset = rs.find((r) => r.length > 0) ?? rs[rs.length - 1] ?? [];

    this.logger.debug(
      `[_executeSP1 Inafectos] recordsets=${rs.length}, rows=${dataRecordset.length}`,
    );

    return dataRecordset;
  }

  /**
   * Mapea una fila cruda a ReporteInafectosRow
   */
  private _mapRow(r: any): ReporteInafectosRow {
    const vals = Object.values(r);
    return {
      codigo: (r.codigo ?? r.Codigo ?? vals[0] ?? '').toString().trim(),
      nombre: (r.nombre ?? r.Nombre ?? r.contribuyente ?? vals[1] ?? '').toString().trim(),
      anno: (r.anno ?? r.Anno ?? vals[2] ?? '').toString().trim(),
      cod_pred: (r.cod_pred ?? r.CodPred ?? r.codpred ?? vals[3] ?? '').toString().trim(),
      anexo: (r.anexo ?? r.Anexo ?? vals[4] ?? '').toString().trim(),
      sub_anexo: (r.sub_anexo ?? r.Sub_Anexo ?? r.subanexo ?? vals[5] ?? '').toString().trim(),
      uso_predio: (r.uso_predio ?? r.uso ?? r.Uso ?? vals[6] ?? '').toString().trim(),
      direccion: (r.direccion ?? r.Direccion ?? vals[7] ?? '').toString().trim(),
      area_terreno: (r.area_terreno ?? r.AreaTerreno ?? vals[8] ?? '0').toString().trim(),
      area_construccion: (r.area_construccion ?? r.AreaConstruccion ?? vals[9] ?? '0').toString().trim(),
      sector: (r.sector ?? r.Sector ?? vals[10] ?? '').toString().trim(),
      insoluto_ip: (r.insoluto_ip ?? r.insoluto_predial ?? r.Deuda_IP ?? vals[16] ?? '0.00').toString().trim(),
      insoluto_arb: (r.insoluto_arb ?? r.insoluto_arbitrios ?? r.Deuda_Arbitrio ?? vals[17] ?? '0.00').toString().trim(),
    };
  }

  /**
   * Búsqueda paginada del reporte de inafectos
   */
  async search(
    dto: SearchReporteInafectosDto,
  ): Promise<PaginatedResponse<ReporteInafectosRow>> {
    const { anno, id_uso, page, pageSize } = dto;

    try {
      const allRows = await this._executeSP1(anno, id_uso ?? '');
      const total = allRows.length;
      const start = (page - 1) * pageSize;
      const paginatedRows = allRows.slice(start, start + pageSize);
      const data = paginatedRows.map((r) => this._mapRow(r));
      const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
      return { data, total, page, pageSize, totalPages };
    } catch (error) {
      this.logger.error('Error al consultar Reporte de Inafectos', error);
      throw error;
    }
  }

  /**
   * Exportar todos los registros para archivo Excel
   */
  async exportAll(anno: string, id_uso: string): Promise<ReporteInafectosRow[]> {
    try {
      const allRows = await this._executeSP1(anno, id_uso ?? '');
      return allRows.map((r) => this._mapRow(r));
    } catch (error) {
      this.logger.error('Error al exportar Reporte de Inafectos', error);
      throw error;
    }
  }
}
