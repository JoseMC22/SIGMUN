import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ProcesarOpDto } from './dto/procesar-op.dto';
import { ProcesarOpResult, ProcesarOpRow } from './generar-op.types';

/**
 * Proyección de estado de cuenta de rentas para generar orden de pago.
 *
 * Fuente, según el tributo:
 * - predial:   Caja.sp_EstCta_Rentasop_proyectado     (concepto 02.01)
 * - vehicular: Caja.sp_EstCta_Rentasopveh_proyectado  (conceptos 00.30, 25.10)
 *
 * Los dos SP son gemelos: mismos 8 parámetros y mismas columnas de salida, con
 * la misma convención de comillas dobles en @annos/@perio. Solo cambia el
 * filtro de conceptos, por eso el servicio los elige con un mapa.
 */
const SP_POR_TIPO: Record<string, string> = {
  predial: 'Caja.sp_EstCta_Rentasop_proyectado',
  vehicular: 'Caja.sp_EstCta_Rentasopveh_proyectado',
};

@Injectable()
export class GenerarOpService {
  private readonly logger = new Logger(GenerarOpService.name);

  constructor(private readonly db: DatabaseService) {}

  async procesar(dto: ProcesarOpDto): Promise<ProcesarOpResult> {
    // El enum del DTO ya restringe el valor; el fallback cubre llamadas
    // internas que no pasen por el pipe de validación.
    const sp = SP_POR_TIPO[dto.Tipo] ?? SP_POR_TIPO.predial;

    const params = {
      codigo: dto.Codigo ?? '',
      annos: dto.Annos ?? '',
      tipos: dto.Tipos ?? '',
      perio: dto.Perio ?? '',
      predio: dto.Predio ?? '',
      // @estado se concatena crudo en el SQL dinámico del SP: vacío lo rompe.
      estado: dto.Estado || '0',
      fecha_proyectada: dto.FechaProyectada ?? '',
    };

    try {
      const result = await this.db.executeProcedure<ProcesarOpRow>(sp, params);
      const data = result.recordset ?? [];
      return { success: true, data, total: data.length };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[GenerarOp] procesar ${sp} error (codigo=${dto.Codigo}): ${detail}`,
      );
      return {
        success: false,
        data: [],
        total: 0,
        error: 'Error al procesar la orden de pago',
        // En desarrollo se devuelve el mensaje del motor para poder diagnosticar
        // el contrato del SP (nombre, parámetros, tipos). En producción no se
        // expone detalle interno de la base.
        ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
      };
    }
  }
}
