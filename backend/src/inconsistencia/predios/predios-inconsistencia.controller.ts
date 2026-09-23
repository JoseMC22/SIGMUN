import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrediosInconsistenciaService } from './predios-inconsistencia.service';
import { PrediosInconsistenciaResult } from './predios-inconsistencia.types';

@Controller('inconsistencia/predios')
@UseGuards(JwtAuthGuard)
export class PrediosInconsistenciaController {
  constructor(private readonly service: PrediosInconsistenciaService) {}

  /** Placeholder GET: devuelve envoltorio vacío hasta definir el SP real. */
  @Get()
  async listar(): Promise<PrediosInconsistenciaResult> {
    return this.service.listar();
  }
}
