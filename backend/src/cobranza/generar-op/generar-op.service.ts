import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ProcesarOpDto } from './dto/procesar-op.dto';
import { ProcesarOpResult, ProcesarOpRow } from './generar-op.types';

/**
 * Proyección de estado de cuenta de rentas para generar orden de pago.
 *
 * Fuente: Caja.sp_EstCta_Rentasop_proyectado (solo lectura).
 * @perio recibe el JSON de 4 elementos que arma el frontend; el resto de
 * filtros sin UI todavía viaja vacío para no inventar valores.
 */
@Injectable()
export class GenerarOpService {
  private readonly SP_PROYECTADO = 'Caja.sp_EstCta_Rentasop_proyectado';
  private readonly logger = new Logger(GenerarOpService.name);

  constructor(private readonly db: DatabaseService) {}

  async procesar(dto: ProcesarOpDto): Promise<ProcesarOpResult> {
    const params = {
      codigo: dto.Codigo ?? '',
      annos: dto.Annos ?? '',
      tipos: dto.Tipos ?? '',
      perio: dto.Perio ?? '',
      predio: dto.Predio ?? '',
      estado: dto.Estado ?? '',
      fecha_proyectada: dto.FechaProyectada ?? '',
    };

    try {
      const result = await this.db.executeProcedure<ProcesarOpRow>(
        this.SP_PROYECTADO,
        params,
      );
      const data = result.recordset ?? [];
      return { success: true, data, total: data.length };
    } catch (error) {
      this.logger.error(
        `[GenerarOp] procesar SP error (codigo=${dto.Codigo}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        success: false,
        data: [],
        total: 0,
        error: 'Error al procesar la orden de pago',
      };
    }
  }
}
