import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchConstanciaNoAdeudosDto } from './dto/search-constancia-no-adeudos.dto';
import {
  ConstanciaNoAdeudoResult,
  ConstanciaNoAdeudoRow,
} from './reporte-constancia-no-adeudos.types';

@Injectable()
export class ReporteConstanciaNoAdeudosService {
  private readonly SP_NAME = 'Certificado.sp_certificado';
  private readonly logger = new Logger(ReporteConstanciaNoAdeudosService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Busca constancias de no adeudos ejecutando Certificado.sp_certificado
   * con @BUSC = '5', @Codigo (opcional), @fini, @ffin (opcional).
   * El SP no tiene paginación → se traen todas las filas y se pagina en memoria.
   */
  async search(dto: SearchConstanciaNoAdeudosDto): Promise<ConstanciaNoAdeudoResult> {
    const { page, pageSize, Codigo, fini, ffin } = dto;

    const spParams: Record<string, any> = {
      BUSC: '5', // fijo
      Codigo: Codigo || '',
      fini: fini || '',
      ffin: ffin || '',
    };

    this.logger.log(
      `[ReporteConstanciaNoAdeudos] SP params: ${JSON.stringify(spParams)}`,
    );

    try {
      const result = await this.db.executeProcedure<any>(
        this.SP_NAME,
        spParams,
      );
      const allRows = (result.recordset ?? []) as any[];
      this.logger.log(
        `[ReporteConstanciaNoAdeudos] SP returned ${allRows.length} rows`,
      );

      // Mapeo a ConstanciaNoAdeudoRow: respetar casing literal, mapear null → ''
      const mappedAllRows: ConstanciaNoAdeudoRow[] = allRows.map((row: any) => {
        const out: ConstanciaNoAdeudoRow = {};
        // Copiar todas las claves tal como vienen del SP
        for (const key of Object.keys(row)) {
          const val = row[key];
          // Mapear null -> '' para no enviar null al frontend
          if (val === null || val === undefined) {
            (out as any)[key] = '';
            continue;
          }
          (out as any)[key] = val;
        }
        return out;
      });

      const total = mappedAllRows.length;
      const start = (page - 1) * pageSize;
      const paginatedRows = mappedAllRows.slice(start, start + pageSize);
      const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

      return {
        success: true,
        data: paginatedRows,
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (err) {
      this.logger.error(
        `[ReporteConstanciaNoAdeudos] search SP error: ${err}`,
      );
      return {
        success: false,
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: 'Error al consultar el reporte de constancias de no adeudos',
      };
    }
  }
}
