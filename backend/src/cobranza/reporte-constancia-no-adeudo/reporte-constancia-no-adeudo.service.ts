import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchConstanciaNoAdeudoDto } from './dto/search-constancia-no-adeudo.dto';
import {
  ConstanciaNoAdeudoResult,
  ConstanciaNoAdeudoRow,
} from './reporte-constancia-no-adeudo.types';

@Injectable()
export class ReporteConstanciaNoAdeudoService {
  private readonly SP_NAME = 'Certificado.sp_certificado';
  private readonly logger = new Logger(ReporteConstanciaNoAdeudoService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Busca constancias de no adeudos ejecutando Certificado.sp_certificado
   * con @BUSC = '5', @Codigo (opcional), @fini, @ffin (opcional).
   * El SP no tiene paginación → se traen todas las filas y se pagina en memoria.
   *
   * Precedencia del filtro: si @Codigo viene informado, el rango de fechas se
   * descarta y se mandan @fini/@ffin vacíos. Un código es un identificador
   * exacto, así que acotarlo por fechas sólo puede vaciar el resultado (p. ej.
   * una constancia emitida fuera del rango elegido). La decisión vive acá y
   * no en el cliente para que todos los que consulten el SP respeten lo mismo.
   */
  async search(dto: SearchConstanciaNoAdeudoDto): Promise<ConstanciaNoAdeudoResult> {
    const { page, pageSize, Codigo, fini, ffin } = dto;

    // Un código compuesto solo de espacios se trata como ausente.
    const buscaPorCodigo = (Codigo ?? '').trim() !== '';

    if (buscaPorCodigo && (fini || ffin)) {
      this.logger.log(
        `[ReporteConstanciaNoAdeudo] Codigo informado: se ignora el rango de fechas ` +
          `(fini="${fini}", ffin="${ffin}")`,
      );
    }

    const spParams: Record<string, any> = {
      BUSC: '5', // fijo
      Codigo: Codigo || '',
      fini: buscaPorCodigo ? '' : fini || '',
      ffin: buscaPorCodigo ? '' : ffin || '',
    };

    this.logger.log(
      `[ReporteConstanciaNoAdeudo] SP params: ${JSON.stringify(spParams)}`,
    );

    try {
      const result = await this.db.executeProcedure<any>(
        this.SP_NAME,
        spParams,
      );
      const allRows = (result.recordset ?? []) as any[];
      this.logger.log(
        `[ReporteConstanciaNoAdeudo] SP returned ${allRows.length} rows`,
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
        `[ReporteConstanciaNoAdeudo] search SP error: ${err}`,
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