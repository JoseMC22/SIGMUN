import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchDeAlcabalaDto } from './dto/search-de-alcabala.dto';
import {
  DeAlcabalaRow,
  PaginatedResponse,
} from './de-alcabala.types';

// ── Case-insensitive column accessor (mssql v12+ preserves SP casing) ──

function col(row: Record<string, any>, name: string): any {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key !== undefined ? row[key] : undefined;
}

// ── Normalize SP estado text to lowercase standard values ──

function normalizeEstado(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === 'Cancelado') return 'Pagado';
  if (trimmed === 'Pendiente') return 'Pagado';
  if (trimmed === 'Pagado') return 'Pagado';
  return trimmed;
}

// ── Pure pagination helper (in-memory slice indices) ──

export function calculatePaginationParams(page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  const end = page * pageSize;
  return { start, end };
}

// ── Service ──

@Injectable()
export class ReporteDeAlcabalaService {
  private readonly SP_NAME = 'Alcabala.sp_DJAlcabala';
  private readonly logger = new Logger(ReporteDeAlcabalaService.name);

  constructor(private readonly db: DatabaseService) {}

  async search(
    dto: SearchDeAlcabalaDto,
  ): Promise<PaginatedResponse<DeAlcabalaRow>> {
    const { codigo, anio, estado, page, pageSize } = dto;
    const { start, end } = calculatePaginationParams(page, pageSize);

    this.logger.log(
      `[ReporteDeAlcabala] DTO received: ${JSON.stringify(dto)}`,
    );

    const spParams: Record<string, any> = {
      buscar: '11',
      codigo: codigo || '',
      anio: anio ?? new Date().getFullYear(),
      flag_check: parseInt(estado || '1', 10),
    };

    this.logger.log(
      `[ReporteDeAlcabala] SP params: ${JSON.stringify(spParams)}`,
    );

    let rawRows: any[] = [];
    try {
      const result = await this.db.executeProcedure<any>(
        this.SP_NAME,
        spParams,
      );
      rawRows = result.recordset || [];
      this.logger.log(
        `[ReporteDeAlcabala] SP returned ${rawRows.length} rows`,
      );
      if (rawRows.length > 0) {
        this.logger.log(
          `[ReporteDeAlcabala] First row keys: ${JSON.stringify(Object.keys(rawRows[0]))}`,
        );
        this.logger.log(
          `[ReporteDeAlcabala] First row: ${JSON.stringify(rawRows[0])}`,
        );
      }
    } catch (err) {
      this.logger.error(`[ReporteDeAlcabala] SP error: ${err}`);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    // Map all 25 SP columns directly
    const allRows: DeAlcabalaRow[] = rawRows.map((row: any) => ({
      id_alcabala: Number(col(row, 'id_alcabala') ?? 0),
      codigo_compra: String(col(row, 'codigo_compra') ?? ''),
      comprador: String(col(row, 'comprador') ?? ''),
      comprador_fiscal: String(col(row, 'comprador_fiscal') ?? ''),
      comprador_dni: String(col(row, 'comprador_dni') ?? ''),
      codigo_venta: String(col(row, 'codigo_venta') ?? ''),
      vendedor: String(col(row, 'vendedor') ?? ''),
      vendedor_fiscal: String(col(row, 'vendedor_fiscal') ?? ''),
      vendedor_dni: String(col(row, 'vendedor_dni') ?? ''),
      contrato: String(col(row, 'contrato') ?? ''),
      direccion_predio: String(col(row, 'direccion_predio') ?? ''),
      fecha_contrato: String(col(row, 'fecha_contrato') ?? ''),
      tipo_Pred: String(col(row, 'tipo_Pred') ?? ''),
      base_imponible: Number(col(row, 'base_imponible') ?? 0),
      transferencia: Number(col(row, 'transferencia') ?? 0),
      autoavaluo: Number(col(row, 'autoavaluo') ?? 0),
      monto_inafecto: Number(col(row, 'monto_inafecto') ?? 0),
      monto_afecto: Number(col(row, 'monto_afecto') ?? 0),
      mora: Number(col(row, 'mora') ?? 0),
      monto_alcabala: Number(col(row, 'monto_alcabala') ?? 0),
      total_alcabala: Number(col(row, 'total_alcabala') ?? 0),
      tasa_impuesto: String(col(row, 'tasa_impuesto') ?? ''),
      observacion: String(col(row, 'observacion') ?? ''),
      estado: normalizeEstado(String(col(row, 'estado') ?? '')),
      monto_letras: String(col(row, 'monto_letras') ?? ''),
    }));

    this.logger.log(
      `[ReporteDeAlcabala] Mapped ${allRows.length} rows. flag_check: ${spParams.flag_check}`,
    );
    if (allRows.length > 0) {
      this.logger.log(
        `[ReporteDeAlcabala] First mapped row: ${JSON.stringify(allRows[0])}`,
      );
    }

    // Client-side pagination (SP already filtered by flag_check)
    const total = allRows.length;
    const data = allRows.slice(start, end);
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }
}
