import { Injectable, Logger } from '@nestjs/common';
import { PrediosInconsistenciaResult } from './predios-inconsistencia.types';

@Injectable()
export class PrediosInconsistenciaService {
  private readonly logger = new Logger(PrediosInconsistenciaService.name);

  /** Placeholder temporal: el SP real se conectará cuando lleguen los detalles. */
  async listar(): Promise<PrediosInconsistenciaResult> {
    this.logger.log('[PrediosInconsistencia] scaffold placeholder call');
    return {
      success: true,
      data: [],
      message: 'Scaffold inicial: SP pendiente de definición',
    };
  }
}
