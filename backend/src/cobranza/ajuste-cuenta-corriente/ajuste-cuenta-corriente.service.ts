import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  AjusteTiposDocResult,
  TipoDocSustentoItem,
} from './ajuste-cuenta-corriente.types';

/** SP que alimenta el ajuste de cuenta corriente. */
const SP_CUENTA_CORRIENTE = 'Rentas.sp_cuentacorriente';

/**
 * Mapea una fila cruda del combo a TipoDocSustentoItem POR POSICIÓN.
 * El legacy PHP consumía el resultset con RegistrosCombo($rows, 0, 1)
 * (columna 0 = value/id, columna 1 = label), así que acá se hace lo mismo:
 * Object.values respeta el orden de columnas del SP y no se dependen de sus
 * nombres (desconocidos). null/undefined se mapean a ''.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(raw: any): TipoDocSustentoItem {
  const values = Object.values(raw ?? {});
  return {
    id: String(values[0] ?? '').trim(),
    nombre: String(values[1] ?? '').trim(),
  };
}

@Injectable()
export class AjusteCuentaCorrienteService {
  private readonly logger = new Logger(AjusteCuentaCorrienteService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Tipos de documento de sustento (Rentas.sp_cuentacorriente @msquery=11).
   * Filas con id vacío se descartan (no entran al combo).
   */
  async getTiposDocSustento(): Promise<AjusteTiposDocResult> {
    try {
      const result = await this.db.executeProcedure(SP_CUENTA_CORRIENTE, {
        msquery: 11,
      });
      const data: TipoDocSustentoItem[] = (result.recordset ?? [])
        .map(mapRow)
        .filter((item) => item.id !== '');
      return { success: true, data };
    } catch (error) {
      this.logger.error(
        `[AjusteCuentaCorriente] getTiposDocSustento SP error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        data: [],
        error: 'Error al consultar los tipos de documento de sustento',
      };
    }
  }
}
