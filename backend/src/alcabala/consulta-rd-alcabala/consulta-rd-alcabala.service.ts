import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchRdAlcabalaDto } from './dto/search-rd-alcabala.dto';
import { DetalleRdAlcabalaDto } from './dto/detalle-rd-alcabala.dto';
import { RutaRdAlcabalaDto } from './dto/ruta-rd-alcabala.dto';
import { ImprimirRdAlcabalaDto } from './dto/imprimir-rd-alcabala.dto';
import {
  ConsultaRDRow,
  ConsultaRDResult,
  DetalleRDRow,
  DetalleRDResult,
  RutaRDRow,
  RutaRDResult,
  ImprimirRDResult,
} from './consulta-rd-alcabala.types';

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

  async getDetail(dto: DetalleRdAlcabalaDto): Promise<DetalleRDResult> {
    const { num_val, ano_val, nombre, nomb_val } = dto;

    const spParams: Record<string, any> = {
      msquery: '1',
      id_valor: this.ID_VALOR_ALCABALA,
      num_val: num_val || '',
      ano_val: ano_val || '',
    };

    const emptyResult: DetalleRDResult = {
      success: false,
      nombre: nombre || '',
      nomb_val: nomb_val || '',
      num_val,
      ano_val: Number(ano_val) || 0,
      data: [],
      error: 'Error al consultar detalle del RD',
    };

    try {
      this.logger.log(`[ConsultaRdAlcabala] getDetail calling SP with params: ${JSON.stringify(spParams)}`);
      const result = await this.db.executeProcedure<any>(
        'Rentas.SP_Dvalores',
        spParams,
      );
      const rawRows: any[] = result.recordset || [];
      this.logger.log(`[ConsultaRdAlcabala] getDetail SP returned ${rawRows.length} rows`);
      if (rawRows.length > 0) {
        this.logger.log(`[ConsultaRdAlcabala] getDetail first row keys: ${JSON.stringify(Object.keys(rawRows[0]))}`);
      }

      // Case-insensitive column mapping
      function col(row: Record<string, any>, name: string): any {
        const key = Object.keys(row).find(
          (k) => k.toLowerCase() === name.toLowerCase(),
        );
        return key !== undefined ? row[key] : undefined;
      }

      const knownCols = [
        'no_name_1', 'id', 'anno', 'imp_insol', 'imp_reaj',
        'costo_emis', 'mora', 'total', 'anio',
      ];

      const data: DetalleRDRow[] = rawRows.map((row: any) => {
        const mapped: DetalleRDRow = {
          row_num: Number(col(row, 'no_name_1') ?? 0),
          id: Number(col(row, 'id') ?? 0),
          anno: String(col(row, 'anno') ?? ''),
          imp_insol: Number(col(row, 'imp_insol') ?? 0),
          imp_reaj: Number(col(row, 'imp_reaj') ?? 0),
          costo_emis: Number(col(row, 'costo_emis') ?? 0),
          mora: Number(col(row, 'mora') ?? 0),
          total: Number(col(row, 'total') ?? 0),
          anio: String(col(row, 'anio') ?? ''),
        };
        // Preserve extra columns not explicitly mapped
        for (const key of Object.keys(row)) {
          const lower = key.toLowerCase();
          if (!knownCols.includes(lower)) {
            (mapped as any)[key] = row[key];
          }
        }
        return mapped;
      });

      return {
        success: true,
        nombre: nombre || '',
        nomb_val: nomb_val || '',
        num_val,
        ano_val: Number(ano_val) || 0,
        data,
      };
    } catch (err) {
      this.logger.error(`[ConsultaRdAlcabala] getDetail SP error: ${err}`);
      return emptyResult;
    }
  }

  async getRuta(dto: RutaRdAlcabalaDto): Promise<RutaRDResult> {
    const { num_val, ano_val, nombre, nomb_val } = dto;

    const spParams: Record<string, any> = {
      msquery: '3',
      id_valor: this.ID_VALOR_ALCABALA,
      num_val: num_val || '',
      ano_val: ano_val || '',
    };

    const emptyResult: RutaRDResult = {
      success: false,
      nombre: nombre || '',
      nomb_val: nomb_val || '',
      num_val,
      ano_val: Number(ano_val) || 0,
      data: [],
      error: 'Error al consultar ruta del RD',
    };

    try {
      this.logger.log(`[ConsultaRdAlcabala] getRuta calling SP with params: ${JSON.stringify(spParams)}`);
      const result = await this.db.executeProcedure<any>(
        'Rentas.SP_MHRuta',
        spParams,
      );
      const rawRows: any[] = result.recordset || [];
      this.logger.log(`[ConsultaRdAlcabala] getRuta SP returned ${rawRows.length} rows`);
      if (rawRows.length > 0) {
        this.logger.log(`[ConsultaRdAlcabala] getRuta first row keys: ${JSON.stringify(Object.keys(rawRows[0]))}`);
      }

      // Dynamic column mapping — preserve all SP columns as-is
      const data: RutaRDRow[] = rawRows.map((row: any) => {
        const mapped: RutaRDRow = {};
        for (const key of Object.keys(row)) {
          mapped[key] = row[key];
        }
        return mapped;
      });

      return {
        success: true,
        nombre: nombre || '',
        nomb_val: nomb_val || '',
        num_val,
        ano_val: Number(ano_val) || 0,
        data,
      };
    } catch (err) {
      this.logger.error(`[ConsultaRdAlcabala] getRuta SP error: ${err}`);
      return emptyResult;
    }
  }

  async getImprimir(dto: ImprimirRdAlcabalaDto): Promise<ImprimirRDResult> {
    const { num_val, ano_val } = dto;

    try {
      // 1. Fetch HTML plantilla from caja.plantillas WHERE id = 36
      const plantillaResult = await this.db.query<{ plantillas_html: string }>(
        'SELECT plantillas_html FROM caja.plantillas WHERE id = 36',
      );
      const plantillaHtml = plantillaResult.recordset?.[0]?.plantillas_html ?? '';

      // 2. Call SP to get dynamic data row
      const spParams: Record<string, any> = {
        buscar: 1,
        id_valor: this.ID_VALOR_ALCABALA,
        num_val: num_val || '',
        ano_val: ano_val || '',
      };

      this.logger.log(`[ConsultaRdAlcabala] getImprimir calling SP with params: ${JSON.stringify(spParams)}`);
      const result = await this.db.executeProcedure<any>('Rentas.sp_Imprime_alcabala', spParams);
      const rawRows: any[] = result.recordset || [];
      this.logger.log(`[ConsultaRdAlcabala] getImprimir SP returned ${rawRows.length} rows`);

      const dataRow = rawRows[0];
      if (!dataRow) {
        return { success: false, error: 'No se encontraron datos para imprimir' };
      }

      // 3. Merge: replace @column_name placeholders with row values (case-insensitive)
      // Word boundary \b avoids clobbering emails like @gmail.com or decorative @SAT
      let merged = plantillaHtml;
      for (const key of Object.keys(dataRow)) {
        const regex = new RegExp(`@${key}\\b`, 'gi');
        merged = merged.replace(regex, String(dataRow[key] ?? ''));
      }

      return { success: true, html: merged };
    } catch (err) {
      this.logger.error(`[ConsultaRdAlcabala] getImprimir error: ${err}`);
      return { success: false, error: 'Error al generar impresión del RD' };
    }
  }
}
