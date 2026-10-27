import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchReporteIngresosGerenciaDto } from './dto/search-reporte-ingresos-gerencia.dto';
import {
  AreaOption,
  ReporteIngresosGerenciaResponse,
  ReporteIngresosGerenciaRow,
} from './dto/reporte-ingresos-gerencia.types';

@Injectable()
export class ReporteIngresosGerenciaService {
  private readonly logger = new Logger(ReporteIngresosGerenciaService.name);
  private readonly SP_REPORTE = 'Caja.sp_rptTesoreriaPartidas';
  private readonly SP_COMBO = 'Calculo.sp_ListaCombo';

  constructor(private readonly db: DatabaseService) {}

  /**
   * Obtiene la lista de áreas/gerencias disponibles (@busc=16)
   */
  async getAreas(): Promise<AreaOption[]> {
    try {
      const result = await this.db.executeProcedure<any>(this.SP_COMBO, {
        busc: 16,
      });
      const records = result.recordset || [];
      return records.map((r: any) => {
        const vals = Object.values(r);
        return {
          id: String(vals[0] ?? '').trim(),
          descripcion: String(vals[1] ?? '').trim(),
        };
      });
    } catch (error) {
      this.logger.error('Error al obtener combo de áreas', error);
      return [];
    }
  }

  /**
   * Obtiene la lista de cajeros disponibles desde Caja.Mcajero
   */
  async getCajas(): Promise<AreaOption[]> {
    try {
      const result = await this.db.query<any>(
        'SELECT RTRIM(caja) AS id, RTRIM(nombre_caja) AS descripcion FROM Caja.Mcajero ORDER BY nombre_caja',
      );
      const records = result.recordset || [];
      return records.map((r: any) => ({
        id: String(r.id ?? '').trim(),
        descripcion: String(r.descripcion ?? r.id ?? '').trim(),
      }));
    } catch (error: any) {
      this.logger.error('Error al obtener combo de cajeros: ' + (error?.message || error));
      return [];
    }
  }

  /**
   * Ejecuta el reporte de ingresos / partidas presupuestales
   */
  async search(
    dto: SearchReporteIngresosGerenciaDto,
  ): Promise<ReporteIngresosGerenciaResponse> {
    try {
      const formatToDMY = (dateStr: string): string => {
        if (!dateStr) return '';
        if (dateStr.includes('/')) return dateStr;
        const [year, month, day] = dateStr.split('-');
        if (year && month && day) {
          return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        }
        return dateStr;
      };

      const fecDesdeDMY = formatToDMY(dto.desde);
      const fecHastaDMY = formatToDMY(dto.hasta);

      this.logger.debug(
        `Consultando reporte partidas: desde=${fecDesdeDMY}, hasta=${fecHastaDMY}, cajero=${dto.cajero}`,
      );

      const result = await this.db.executeProcedure<any>(this.SP_REPORTE, {
        buscar: 1,
        cajero: dto.cajero ?? '--',
        fec_desde: fecDesdeDMY,
        fec_hasta: fecHastaDMY,
      });

      const records = result.recordset || [];
      this.logger.debug(`SP ${this.SP_REPORTE} devolvió ${records.length} filas`);

      const data: ReporteIngresosGerenciaRow[] = [];
      let total = 0;

      for (const row of records) {
        const vals = Object.values(row);

        const partida = String(
          (row as any).nro_partida ?? (row as any).nropartida ?? vals[2] ?? vals[3] ?? '',
        ).replace(/<[^>]*>?/gm, '').trim();

        const descripcion = String(
          (row as any).descripcion ?? vals[3] ?? vals[4] ?? '',
        ).replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();

        const rawMonto =
          (row as any).monto_total ?? (row as any).monto_total2 ?? vals[8] ?? vals[7] ?? 0;
        const cleanMontoStr = String(rawMonto).replace(/<[^>]*>?/gm, '').replace(/[^0-9.-]/g, '');
        const monto = parseFloat(cleanMontoStr) || 0;

        const color = String((row as any).color ?? vals[13] ?? '').trim();
        const espacio = Number((row as any).espacio ?? vals[12] ?? 0) || 0;
        const nivel_suma = Number((row as any).nivel_suma ?? vals[0] ?? 0) || 0;

        if (monto === 0 && !partida) continue;

        data.push({
          partida,
          descripcion,
          monto: Number(monto.toFixed(2)),
          color,
          espacio,
          nivel_suma,
        });
      }

      // En el SP original, el total general viene en row[14] o en la partida principal de nivel mayor (01.00.0.00.000)
      if (records.length > 0) {
        const rawTotal = (records[0] as any).total ?? Object.values(records[0])[14] ?? null;
        if (rawTotal) {
          const cleanTotal = String(rawTotal).replace(/[^0-9.-]/g, '');
          total = parseFloat(cleanTotal) || 0;
        } else {
          // Si no está en [14], la partida raíz es el total general (o la suma de nivel_suma = 1)
          const rootRow = data.find((d) => d.partida === '01.00.0.00.000' || d.partida === '01.00.0.00.00');
          if (rootRow) {
            total = rootRow.monto;
          } else {
            // O sumamos únicamente las partidas de nivel_suma === 0 (hojas) para no duplicar sumas jerárquicas
            total = data
              .filter((d) => d.nivel_suma === 0)
              .reduce((sum, d) => sum + d.monto, 0);
          }
        }
      }

      return {
        nombreArea: '',
        data,
        total: Number(total.toFixed(2)),
      };
    } catch (error) {
      this.logger.error(
        'Error al consultar reporte ingresos por gerencia / partidas',
        error,
      );
      throw error;
    }
  }
}
