import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { OpPdfRow, OpPdfRowSchema } from './dto/op-pdf-row.dto';

// ── Case-insensitive column accessor (mssql v12+ preserves SP casing) ──

function col(row: Record<string, any>, name: string): any {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key !== undefined ? row[key] : undefined;
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

@Injectable()
export class ImpresionDjAlcabalaService {
  private readonly logger = new Logger(ImpresionDjAlcabalaService.name);

  constructor(private readonly db: DatabaseService) {}
}
