import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchReporteCargosDto } from './dto/search-reporte-cargos.dto';
import {
  CargoNotificacionRow,
  ReporteCargosResult,
  TipoValorOption,
  TipoValorResult,
} from './reporte-cargos.types';

// ── Case-insensitive column accessor (mssql v12+ preserves SP casing) ──

function col(row: Record<string, any>, name: string): any {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key !== undefined ? row[key] : undefined;
}

/** Pad a numeric code to 7 chars with leading zeros (SP expects this width). */
function padNumValor(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(0, 7).padStart(7, '0');
}

@Injectable()
export class ReporteCargosService {
  private readonly SP_NAME = 'notificacion.ssp_cargos_notificacion';
  private readonly TIPO_VALOR_TABLE = 'Contenedor.TblTipo_valor';
  private readonly logger = new Logger(ReporteCargosService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Lista los Tipos de Valor disponibles para el combo del filtro,
   * del año en curso (Contenedor.TblTipo_valor — tabla/vista, no SP).
   */
  async listarTiposValor(): Promise<TipoValorResult> {
    try {
      const sql =
        `SELECT id_valor, nomb_val FROM ${this.TIPO_VALOR_TABLE} ` +
        `WHERE estado = '1' and anno_gen = year(getdate()) ORDER BY 2`;
      const result = await this.db.query<any>(sql);
      const rows: TipoValorOption[] = (result.recordset || []).map(
        (row: any) => ({
          id_valor: String(col(row, 'id_valor') ?? ''),
          nomb_val: String(col(row, 'nomb_val') ?? ''),
        }),
      );
      return { success: true, data: rows };
    } catch (err) {
      this.logger.error(`[ReporteCargos] listarTiposValor error: ${err}`);
      return { success: false, data: [], error: 'Error al listar tipos de valor' };
    }
  }

  /**
   * Busca cargos de notificación según el modo indicado:
   *  - modo 'tipo_valor' -> @busc=15 (id_valor, num_valor, ano_valor)
   *  - modo 'fecha'      -> @busc=7  (rango de fechas)
   */
  async search(dto: SearchReporteCargosDto): Promise<ReporteCargosResult> {
    const { mode, id_valor, num_valor, ano_valor, fecha_inicio, fecha_fin } = dto;

    let spParams: Record<string, any>;

    if (mode === 'tipo_valor') {
      if (!id_valor) {
        return {
          success: false,
          data: [],
          total: 0,
          error: 'Debe seleccionar un Tipo de Valor',
        };
      }
      spParams = {
        busc: '15',
        id_valor: id_valor || '',
        num_valor: padNumValor(num_valor),
        ano_valor: ano_valor ?? '',
      };
    } else {
      // modo 'fecha' — rango de fechas, por defecto el día actual
      spParams = {
        busc: '7',
        inicio: fecha_inicio || '',
        final: fecha_fin || '',
      };
    }

    this.logger.log(
      `[ReporteCargos] SP params: ${JSON.stringify(spParams)}`,
    );

    try {
      const result = await this.db.executeProcedure<any>(
        this.SP_NAME,
        spParams,
      );
      const rawRows: any[] = result.recordset || [];
      this.logger.log(`[ReporteCargos] SP returned ${rawRows.length} rows`);

      const data: CargoNotificacionRow[] = rawRows.map((row: any) => {
        const mapped: Record<string, any> = {};
        for (const key of Object.keys(row)) {
          mapped[key] = row[key];
        }
        return mapped;
      });

      return { success: true, data, total: data.length };
    } catch (err) {
      this.logger.error(`[ReporteCargos] search SP error: ${err}`);
      return {
        success: false,
        data: [],
        total: 0,
        error: 'Error al consultar el reporte de cargos',
      };
    }
  }
}
