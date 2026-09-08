import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchConstanciaExigibilidadDto } from './dto/search-constancia-exigibilidad.dto';
import {
  ConstanciaExigibilidadResult,
  ConstanciaExigibilidadRow,
} from './reporte-constancia-exigibilidad.types';

@Injectable()
export class ReporteConstanciaExigibilidadService {
  private readonly SP_NAME = 'COACTIVO.USP_EXIGIBILIDAD';
  private readonly OPCION = '5';
  private readonly logger = new Logger(ReporteConstanciaExigibilidadService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Busca constancias de exigibilidad según el SP COACTIVO.USP_EXIGIBILIDAD
   * con @opcion=5, @codigo (opcional) y rango de fechas @fdesde/@fhasta.
   */
  async search(
    dto: SearchConstanciaExigibilidadDto,
  ): Promise<ConstanciaExigibilidadResult> {
    const { codigo, fdesde, fhasta } = dto;

    const spParams: Record<string, any> = {
      opcion: this.OPCION,
      codigo: codigo || '',
      fdesde: fdesde || '',
      fhasta: fhasta || '',
    };

    this.logger.log(`[ReporteConstanciaExigibilidad] SP params: ${JSON.stringify(spParams)}`);

    try {
      const result = await this.db.executeProcedure<any>(
        this.SP_NAME,
        spParams,
      );
      const rawRows: any[] = result.recordset || [];
      this.logger.log(`[ReporteConstanciaExigibilidad] SP returned ${rawRows.length} rows`);

      const data: ConstanciaExigibilidadRow[] = rawRows.map((row: any) => {
        const mapped: Record<string, any> = {};
        for (const key of Object.keys(row)) {
          mapped[key] = row[key];
        }
        return mapped;
      });

      return { success: true, data, total: data.length };
    } catch (err) {
      this.logger.error(`[ReporteConstanciaExigibilidad] search SP error: ${err}`);
      return {
        success: false,
        data: [],
        total: 0,
        error: 'Error al consultar el reporte de constancias',
      };
    }
  }
}
