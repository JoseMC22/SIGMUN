import { Injectable } from '@nestjs/common';
import * as mssql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import {
  LiquidacionCabecera,
  LiquidacionComparativoResponse,
  LiquidacionDetalle,
  SpLiquidacionCabeceraRow,
  SpLiquidacionDetalleRow,
} from './dto/compara-liquidacion.types';

@Injectable()
export class ComparaLiquidacionService {
  private readonly SP_LIQUIDACION = '[Caja].[pa_liquidacion]';
  private readonly MSQUERY_CABECERA = 12;
  private readonly MSQUERY_DETALLE = 13;

  constructor(private readonly db: DatabaseService) {}

  /**
   * Compara una liquidación consigo misma: trae la cabecera (modo 12) y el
   * detalle (modo 13) de `[Caja].[pa_liquidacion]` para un `@numero` dado.
   *
   * - Modo 12 → `SELECT * FROM CAJA.TBL_LIQUIDACION WHERE numero = @numero`.
   * - Modo 13 → detalle de cuotas con columnas NOMBRADAS (no leer por
   *   posición) ya ordenado por `dl.secuencia` en el SP; NO se re-ordena.
   *
   * Ambos son SELECT puros (sin escritura ni transacción).
   */
  async buscarLiquidacion(
    numero: string,
  ): Promise<LiquidacionComparativoResponse> {
    const params = { numero };
    const types = { msquery: mssql.Int, numero: mssql.VarChar(15) };

    const [cabeceraResult, detalleResult] = await Promise.all([
      this.db.executeProcedure<SpLiquidacionCabeceraRow>(
        this.SP_LIQUIDACION,
        { msquery: this.MSQUERY_CABECERA, ...params },
        types,
      ),
      this.db.executeProcedure<SpLiquidacionDetalleRow>(
        this.SP_LIQUIDACION,
        { msquery: this.MSQUERY_DETALLE, ...params },
        types,
      ),
    ]);

    const cabeceraRow = cabeceraResult.recordset?.[0];
    const cabecera = cabeceraRow
      ? this.mapCabecera(cabeceraRow)
      : null;

    const detalle = (detalleResult.recordset ?? []).map((row) =>
      this.mapDetalle(row),
    );

    return { cabecera, detalle };
  }

  private toIso(value: string | Date | null): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value ?? '';
  }

  private mapCabecera(row: SpLiquidacionCabeceraRow): LiquidacionCabecera {
    return {
      idLiquidacion: row.idliquidacion ?? null,
      numero: row.numero ?? '',
      codigo: row.codigo ?? '',
      monto: row.Monto ?? null,
      observacion: row.Observacion ?? '',
      estado: row.estado ?? '',
      usuario: row.usuario ?? '',
      terminal: row.terminal ?? '',
      fregistro: this.toIso(row.fregistro),
      fvencimiento: this.toIso(row.fvencimiento),
      observacion2: row.observacion2 ?? '',
    };
  }

  private mapDetalle(row: SpLiquidacionDetalleRow): LiquidacionDetalle {
    return {
      secuencia: row.SECUENCIA ?? null,
      tipo: row.tipo ?? '',
      tipoRec: row.tipo_rec ?? '',
      anno: row.ANNO ?? '',
      periodo: row.PERIODO ?? '',
      impInsol: row.imp_insol ?? null,
      impMora: row.imp_mora ?? null,
      costoEmi: row.COSTO_EMI ?? null,
      total: row.Total ?? null,
      nombre: row.Nombre ?? '',
      femision: row['F.Emisión'] ?? '',
    };
  }
}
