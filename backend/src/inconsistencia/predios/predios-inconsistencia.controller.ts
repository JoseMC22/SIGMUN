import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('inconsistencia/predios')
@UseGuards(JwtAuthGuard)
export class PrediosInconsistenciaController {
  // Placeholder temporal: mantiene el route previo mientras el contrato real
  // (search + combos) llega en el slice HTTP. No depende del tipo eliminado.
  @Get()
  listar(): { success: boolean; data: unknown[] } {
    return { success: true, data: [] };
  }
}
