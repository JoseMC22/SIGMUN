import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchReporteIngresosCajeroDto } from './dto/search-reporte-ingresos-cajero.dto';
import {
  ReporteIngresosCajeroResponse,
  ReporteIngresosCajeroRow,
} from './dto/reporte-ingresos-cajero.types';

@Injectable()
export class ReporteIngresosCajeroService {
  private readonly logger = new Logger(ReporteIngresosCajeroService.name);
  private readonly SP_REPORTE = 'Caja.sp_rptTesoreria';

  constructor(private readonly db: DatabaseService) {}

  async search(
    dto: SearchReporteIngresosCajeroDto,
  ): Promise<ReporteIngresosCajeroResponse> {
    try {
      // El SP tiene 'set dateformat dmy' y hace:
      // set @fec_desde = @fec_desde + ' 00:00:00'
      // Por ende, requiere estrictamente formato DD/MM/YYYY
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
        `Consultando ingresos por cajero: fec_desde=${fecDesdeDMY}, fec_hasta=${fecHastaDMY}`,
      );

      const result = await this.db.executeProcedure<any>(this.SP_REPORTE, {
        buscar: 2,
        fec_desde: fecDesdeDMY,
        fec_hasta: fecHastaDMY,
      });

      const records = result.recordset || [];
      const data: ReporteIngresosCajeroRow[] = [];
      let totalOperaciones = 0;
      let totalImporte = 0;

      for (const row of records) {
        const vals = Object.values(row);
        const codigoCajero = String(vals[0] ?? '').trim();
        const nombreCajero = String(vals[1] ?? '').trim();
        const numOps = Number(vals[2]) || 0;
        const importe = Number(vals[3]) || 0;

        totalOperaciones += numOps;
        totalImporte += importe;

        data.push({
          codigoCajero,
          nombreCajero,
          numeroOperaciones: numOps,
          importe: Number(importe.toFixed(2)),
        });
      }

      return {
        data,
        totalOperaciones,
        totalImporte: Number(totalImporte.toFixed(2)),
      };
    } catch (error) {
      this.logger.error('Error al consultar reporte ingresos por cajero', error);
      throw error;
    }
  }
}
