import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchRdAlcabalaDto } from './dto/search-rd-alcabala.dto';
import { ConsultaRDRow, ConsultaRDResult } from './consulta-rd-alcabala.types';

@Injectable()
export class ConsultaRdAlcabalaService {
  private readonly SP_NAME = 'Rentas.SP_ConsultadocuAlcabala';
  private readonly ID_VALOR_ALCABALA = '08';
  private readonly logger = new Logger(ConsultaRdAlcabalaService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(dto: SearchRdAlcabalaDto): Promise<ConsultaRDResult> {
    const { codigo, contribuyente, estado, page, pageSize } = dto;

    // SP params — exact match to: exec Rentas.SP_ConsultadocuAlcabala @msquery=1, @codigo='',@unombre='',@inicio='',@final='',@id_valor='08'
    // @inicio/@final are DATE filters, leave empty for ALL records. Paginate client-side.
    // Note: @num_val is NOT a param of this SP — it's an output field. Filtering by num_val is done client-side.
    const spParams: Record<string, any> = {
      msquery: '1',           // msquery=1 returns data rows
      codigo: codigo || '',
      unombre: contribuyente || '',
      inicio: '',
      final: '',
      id_valor: this.ID_VALOR_ALCABALA,
    };

    let rawRows: any[] = [];
    try {
      this.logger.log(`[ConsultaRdAlcabala] calling SP with params: ${JSON.stringify(spParams)}`);
      const result = await this.db.executeProcedure<any>(this.SP_NAME, spParams);
      rawRows = result.recordset || [];
      this.logger.log(`[ConsultaRdAlcabala] SP returned ${rawRows.length} rows`);
      if (rawRows.length > 0) {
        this.logger.log(`[ConsultaRdAlcabala] first row keys: ${JSON.stringify(Object.keys(rawRows[0]))}`);
      }
    } catch (err) {
      this.logger.error(`[ConsultaRdAlcabala] SP error: ${err}`);
      return {
        success: false,
        data: [],
        total: 0,
        page,
        totalPages: 0,
        error: 'Error al consultar registros',
      };
    }

    // Map ALL SP fields to ConsultaRDRow — use case-insensitive matching
    // because mssql v12+ preserves SP output column casing
    function col(row: Record<string, any>, name: string): any {
      const key = Object.keys(row).find((k) => k.toLowerCase() === name.toLowerCase());
      return key !== undefined ? row[key] : undefined;
    }

    let data: ConsultaRDRow[] = rawRows.map((row: any) => ({
      ROW: Number(col(row, 'ROW') ?? 0),
      codigo: String(col(row, 'codigo') ?? ''),
      nombre: String(col(row, 'nombre') ?? ''),
      nomb_val: String(col(row, 'nomb_val') ?? ''),
      num_val: String(col(row, 'num_val') ?? ''),
      ano_val: Number(col(row, 'ano_val') ?? 0),
      MontoTotal: Number(col(row, 'MontoTotal') ?? 0),
      fec_val: String(col(row, 'fec_val') ?? ''),
      estado: String(col(row, 'estado') ?? ''),
      fpago: String(col(row, 'fpago') ?? ''),
      recibo: String(col(row, 'recibo') ?? ''),
    }));

    // Client-side filtering for estado (SP doesn't support this filter)
    if (estado) {
      data = data.filter(
        (r) => r.estado?.toUpperCase() === estado.toUpperCase(),
      );
    }

    // Client-side pagination
    const total = data.length;
    const start = (page - 1) * pageSize;
    const end = page * pageSize;
    const paginatedData = data.slice(start, end);
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return {
      success: true,
      data: paginatedData,
      total,
      page,
      totalPages,
    };
  }
}
