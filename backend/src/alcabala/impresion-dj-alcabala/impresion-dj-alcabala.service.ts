import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { OpPdfRow, OpPdfRowSchema } from './dto/op-pdf-row.dto';
import {
  DeclaracionPdfRow,
  DeclaracionPdfRowSchema,
} from './dto/declaracion-pdf-row.dto';

// ── Case-insensitive column accessor (mssql v12+ preserves SP casing) ──

function col(row: Record<string, any>, name: string): any {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  if (key === undefined || row[key] === null) return undefined;
  const val = row[key];
  // mssql driver returns SQL datetime as JS Date objects; Zod string fields
  // reject raw Date, so normalize to ISO string before handing off to schema.
  return val instanceof Date ? val.toISOString() : val;
}

/**
 * Maps a raw `sp_ImprimeOP @buscar=2` row (case-insensitive lookup) into the
 * typed OpPdfRow, applying zod defaults for missing columns.
 */
export function mapOpPdfRow(row: Record<string, any>): OpPdfRow {
  return OpPdfRowSchema.parse({
    id_valor: col(row, 'id_valor'),
    num_val: col(row, 'num_val'),
    ano_val: col(row, 'ano_val'),
    numerOP: col(row, 'numerOP'),
    fec_val: col(row, 'fec_val'),
    fecvaln: col(row, 'fecvaln'),
    codigo: col(row, 'codigo'),
    nombre: col(row, 'nombre'),
    num_doc: col(row, 'num_doc'),
    Dirfiscal: col(row, 'Dirfiscal'),
    anno: col(row, 'anno'),
    cadenaUIT: col(row, 'cadenaUIT'),
    rtramo01: col(row, 'rtramo01'),
    rtramo02: col(row, 'rtramo02'),
    rtramo03: col(row, 'rtramo03'),
    base_imponible1: col(row, 'base_imponible1'),
    imp_anual1: col(row, 'imp_anual1'),
    cuotas: col(row, 'cuotas'),
    imp_insol: col(row, 'imp_insol'),
    imp_insoltexto: col(row, 'imp_insoltexto'),
    imp_reaj: col(row, 'imp_reaj'),
    mora: col(row, 'mora'),
    costo_emis: col(row, 'costo_emis'),
    costo_emistexto: col(row, 'costo_emistexto'),
    imp_total: col(row, 'imp_total'),
    imp_totaltexto: col(row, 'imp_totaltexto'),
    cuota_rej: col(row, 'cuota_rej'),
    cuota_mor: col(row, 'cuota_mor'),
    direccion: col(row, 'direccion'),
    fecha: col(row, 'fecha'),
    moratorio: col(row, 'moratorio'),
    fech_proyectado: col(row, 'fech_proyectado'),
    cod_pred: col(row, 'cod_pred'),
    fvencimiento: col(row, 'fvencimiento'),
    periodoRomano: col(row, 'periodoRomano'),
  });
}

/**
 * Maps a raw `Alcabala.RptAlcabala` row (case-insensitive lookup) into the
 * typed DeclaracionPdfRow, applying zod defaults for missing columns.
 */
export function mapDeclaracionPdfRow(
  row: Record<string, any>,
): DeclaracionPdfRow {
  return DeclaracionPdfRowSchema.parse({
    codigo_compra: col(row, 'codigo_compra'),
    comprador: col(row, 'comprador'),
    comprador_fiscal: col(row, 'comprador_fiscal'),
    comprador_dni: col(row, 'comprador_dni'),
    codigo_venta: col(row, 'codigo_venta'),
    vendedor: col(row, 'vendedor'),
    vendedor_fiscal: col(row, 'vendedor_fiscal'),
    vendedor_dni: col(row, 'vendedor_dni'),
    contrato: col(row, 'contrato'),
    direccion_predio: col(row, 'direccion_predio'),
    fecha_contrato: col(row, 'fecha_contrato'),
    tipo_pred: col(row, 'tipo_pred'),
    monto_letras: col(row, 'monto_letras'),
    observacion: col(row, 'observacion'),
    usuario_ing: col(row, 'usuario_ing'),
    fecha_ing: col(row, 'fecha_ing'),
    transferencia: col(row, 'transferencia'),
    autoavaluo: col(row, 'autoavaluo'),
    monto_inafecto: col(row, 'monto_inafecto'),
    monto_afecto: col(row, 'monto_afecto'),
    mora: col(row, 'mora'),
    tasa_impuesto: col(row, 'tasa_impuesto'),
    monto_alcabala: col(row, 'monto_alcabala'),
    total_alcabala: col(row, 'total_alcabala'),
    base_imponible: col(row, 'base_imponible'),
  });
}

@Injectable()
export class ImpresionDjAlcabalaService {
  private readonly SP_IMPRIME_OP = 'Rentas.sp_ImprimeOP';
  private readonly SP_RPT_ALCABALA = 'Alcabala.RptAlcabala';
  private readonly SP_DJ_ALCABALA = 'Alcabala.sp_DJAlcabala';
  private readonly ID_VALOR_ALCABALA = '08';
  private readonly logger = new Logger(ImpresionDjAlcabalaService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Resuelve el valor de la alcabala (idAlcabala → idrecibo → Dvalores '08')
   * y ejecuta sp_ImprimeOP con los parámetros exactos.
   */
  async resolveOpPrintData(
    idAlcabala: number,
  ): Promise<{ numVal: string; anoVal: string; rows: OpPdfRow[] }> {
    const alcabalaResult = await this.db.queryWithParams<{
      idrecibo: string;
    }>(
      'SELECT idrecibo FROM Alcabala.DJAlcabala WHERE id_alcabala = @id',
      { id: idAlcabala },
    );
    const idrecibo = alcabalaResult.recordset?.[0]
      ? String(col(alcabalaResult.recordset[0] as Record<string, any>, 'idrecibo') ?? '')
      : '';
    if (!idrecibo) {
      throw new NotFoundException({
        success: false,
        error: 'Alcabala no encontrada',
      });
    }

    const valorResult = await this.db.queryWithParams<{
      num_val: string;
      ano_val: string;
    }>(
      "SELECT num_val, ano_val FROM Rentas.Dvalores WHERE id_valor = @id_valor AND nestado <> '9' AND idrecibo = @idrecibo",
      { id_valor: this.ID_VALOR_ALCABALA, idrecibo },
    );
    const valorRow = valorResult.recordset?.[0];
    if (!valorRow) {
      throw new NotFoundException({
        success: false,
        error: 'No existe una orden de pago para la alcabala',
      });
    }
    const numVal = String(col(valorRow, 'num_val') ?? '');
    const anoVal = String(col(valorRow, 'ano_val') ?? '');

    const spResult = await this.db.executeProcedure<any>(
      this.SP_IMPRIME_OP,
      {
        buscar: 2,
        id_valor: this.ID_VALOR_ALCABALA,
        num_val: numVal,
        ano_val: anoVal,
      },
    );
    const rawRows: any[] = spResult.recordset ?? [];
    if (rawRows.length === 0) {
      throw new NotFoundException({
        success: false,
        error: 'No se encontraron datos para imprimir',
      });
    }

    return {
      numVal,
      anoVal,
      rows: rawRows.map((r) => mapOpPdfRow(r)),
    };
  }

  /**
   * Resuelve los datos de impresión de la Declaración de Alcabala ejecutando
   * `Alcabala.RptAlcabala @id_alcabala`. Si el SP no devuelve el sello de
   * auditoría (usuario_ing / fecha_ing), se complementa con
   * `Alcabala.sp_DJAlcabala @buscar=8` (columnas `usuario` / `fecha_ing`).
   */
  async resolveDeclaracionPrintData(
    idAlcabala: number,
  ): Promise<DeclaracionPdfRow> {
    const result = await this.db.executeProcedure<any>(this.SP_RPT_ALCABALA, {
      id_alcabala: idAlcabala,
    });
    const recordset = result.recordset ?? [];
    if (recordset.length === 0) {
      throw new NotFoundException({
        success: false,
        error: 'No se encontraron datos para la declaración',
      });
    }

    const firstRow = recordset[0];
    // Diagnostic: log the real SP column casing (unverified contract).
    this.logger.log(JSON.stringify(Object.keys(firstRow)));

    const mapped = mapDeclaracionPdfRow(firstRow);

    // Audit-stamp fallback: only when RptAlcabala omitted usuario_ing/fecha_ing.
    if (!mapped.usuario_ing || !mapped.fecha_ing) {
      try {
        const fallback = await this.db.executeProcedure<any>(
          this.SP_DJ_ALCABALA,
          { buscar: '8', id_alcabala: idAlcabala },
        );
        const fbRow = fallback.recordset?.[0];
        if (fbRow) {
          const usuario = col(fbRow, 'usuario');
          const fechaIng = col(fbRow, 'fecha_ing');
          mapped.usuario_ing =
            usuario === undefined ? mapped.usuario_ing : String(usuario);
          mapped.fecha_ing =
            fechaIng === undefined ? mapped.fecha_ing : String(fechaIng);
        }
      } catch {
        // Fallback SP/parse errors → keep empty strings, no throw (A2/R10).
      }
    }

    return mapped;
  }
}
