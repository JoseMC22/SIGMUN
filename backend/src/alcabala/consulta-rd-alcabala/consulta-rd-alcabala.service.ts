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

  private normalize(str: string): string {
    return str
      .replace(/_/g, '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private translateMonths(text: string): string {
    const months: Record<string, string> = {
      january: 'ENERO', jan: 'ENERO',
      february: 'FEBRERO', feb: 'FEBRERO',
      march: 'MARZO', mar: 'MARZO',
      april: 'ABRIL', apr: 'ABRIL',
      may: 'MAYO', mayo: 'MAYO',
      june: 'JUNIO', jun: 'JUNIO',
      july: 'JULIO', jul: 'JULIO',
      august: 'AGOSTO', aug: 'AGOSTO',
      september: 'SETIEMBRE', sep: 'SETIEMBRE',
      october: 'OCTUBRE', oct: 'OCTUBRE',
      november: 'NOVIEMBRE', nov: 'NOVIEMBRE',
      december: 'DICIEMBRE', dec: 'DICIEMBRE',
    };
    let result = text;
    for (const [en, es] of Object.entries(months)) {
      result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), es);
    }
    return result;
  }

  async getImprimir(dto: ImprimirRdAlcabalaDto): Promise<ImprimirRDResult> {
    const { num_val, ano_val } = dto;

    try {
      // 1. Fetch HTML plantilla from caja.plantillas_html WHERE id_html = 36
      const plantillaResult = await this.db.query<{ plantilla: string }>(
        'SELECT plantilla FROM caja.plantillas_html WHERE id_html = 36',
      );
      const plantillaHtml = plantillaResult.recordset?.[0]?.plantilla ?? '';

      if (!plantillaHtml) {
        this.logger.error('[ConsultaRdAlcabala] Plantilla id_html=36 vacía o inexistente en caja.plantillas_html');
        return { success: false, error: 'Plantilla de impresión (id_html=36) no encontrada o vacía en la base de datos' };
      }

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

      this.logger.log(`[ConsultaRdAlcabala] getImprimir dataRow keys: ${JSON.stringify(Object.keys(dataRow))}`);
      // 3. Merge: replace @column_name (or @_column_name) placeholders with row values
      // Pass 1: case-insensitive match for each SP key, longest-first
      // Use Unicode-aware word boundary (\p{L} = any letter) so ñ, á, etc. are treated as word chars
      let merged = plantillaHtml;
      const spKeys = Object.keys(dataRow).sort((a, b) => b.length - a.length);
      this.logger.log(`[ConsultaRdAlcabala] getImprimir SP columns (longest-first): ${spKeys.join(', ')}`);

      for (const key of spKeys) {
        const value = String(dataRow[key] ?? '');
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`@_?${escapedKey}(?![\\p{L}0-9_])`, 'giu');
        const before = merged;
        merged = merged.replace(regex, value);
        if (before !== merged) {
          this.logger.log(`[ConsultaRdAlcabala] getImprimir replaced @${key} -> "${value.slice(0, 50)}"`);
        }
      }

      // Pass 2: fuzzy fallback — match remaining @placeholder patterns against SP keys
      // by normalizing both sides (strip underscores, lowercase, remove accents)
      const remaining = merged.match(/@_?\w+/g);
      if (remaining && remaining.length > 0) {
        this.logger.log(`[ConsultaRdAlcabala] getImprimir pass-2 fuzzy: ${remaining.length} unresolved placeholders`);
        for (const placeholder of remaining) {
          const normalized = this.normalize(placeholder.replace(/^@_?/, ''));
          const match = spKeys.find(
            (k) => this.normalize(k) === normalized,
          );
          if (match !== undefined) {
            const value = String(dataRow[match] ?? '');
            this.logger.log(`[ConsultaRdAlcabala] getImprimir fuzzy matched "${placeholder}" -> SP key "${match}" = "${value.slice(0, 50)}"`);
            const escapedKey = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            merged = merged.replace(new RegExp(escapedKey, 'gi'), value);
          } else {
            this.logger.warn(`[ConsultaRdAlcabala] getImprimir NO match for placeholder "${placeholder}" — SP keys: ${spKeys.join(', ')}`);
          }
        }
      }

      // Pass 3: fuzzy similarity fallback — LCS + subsequence check for
      // placeholders whose normalized name differs from all SP keys
      const remaining3 = merged.match(/@_?\w+/g);
      if (remaining3 && remaining3.length > 0) {
        this.logger.log(`[ConsultaRdAlcabala] getImprimir pass-3 similarity: ${remaining3.length} unresolved placeholders`);
        for (const placeholder of remaining3) {
          const normalized = this.normalize(placeholder.replace(/^@_?/, ''));
          let bestKey: string | undefined;
          let bestScore = 0;
          for (const key of spKeys) {
            const kn = this.normalize(key);
            const maxLen = Math.max(normalized.length, kn.length);
            if (maxLen === 0) continue;
            const m = normalized.length, n = kn.length;
            const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
            for (let i = 1; i <= m; i++) {
              for (let j = 1; j <= n; j++) {
                dp[i][j] = normalized[i - 1] === kn[j - 1]
                  ? dp[i - 1][j - 1] + 1
                  : Math.max(dp[i - 1][j], dp[i][j - 1]);
              }
            }
            const lcsScore = dp[m][n] / maxLen;
            // Also check if one is a subsequence of the other
            const isSubseq = (needle: string, haystack: string): boolean => {
              let i = 0;
              for (const ch of haystack) {
                if (needle[i] === ch) i++;
                if (i === needle.length) return true;
              }
              return false;
            };
            const subseqBonus =
              (isSubseq(normalized, kn) || isSubseq(kn, normalized)) ? 0.2 : 0;
            const score = Math.min(lcsScore + subseqBonus, 1);
            if (score > bestScore) {
              bestScore = score;
              bestKey = key;
            }
          }
          if (bestKey && bestScore >= 0.4) {
            const value = String(dataRow[bestKey] ?? '');
            this.logger.log(`[ConsultaRdAlcabala] getImprimir similarity matched "${placeholder}" -> SP key "${bestKey}" (score=${bestScore.toFixed(2)}) = "${value.slice(0, 50)}"`);
            const escapedKey = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            merged = merged.replace(new RegExp(escapedKey, 'gi'), value);
          } else {
            this.logger.warn(`[ConsultaRdAlcabala] getImprimir NO similarity match for "${placeholder}" — best score ${bestScore.toFixed(2)} for key "${bestKey ?? 'none'}"`);
          }
        }
      }

      // Pass 4: translate English month names to Spanish in the merged output
      merged = this.translateMonths(merged);

      const unresolvedAfter = merged.match(/@_?\w+/g);
      if (unresolvedAfter && unresolvedAfter.length > 0) {
        this.logger.warn(`[ConsultaRdAlcabala] getImprimir still unresolved: ${unresolvedAfter.join(', ')}`);
      }

      return { success: true, html: merged };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[ConsultaRdAlcabala] getImprimir error: ${message}`);
      return { success: false, error: `Error al generar impresión del RD: ${message}` };
    }
  }
}
