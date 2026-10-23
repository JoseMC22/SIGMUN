import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AjusteCuentaCorrienteService } from './ajuste-cuenta-corriente.service';
import { AjusteTiposDocResult } from './ajuste-cuenta-corriente.types';

@Controller('cobranza/ajuste-cuenta-corriente')
@UseGuards(JwtAuthGuard)
export class AjusteCuentaCorrienteController {
  constructor(private readonly service: AjusteCuentaCorrienteService) {}

  /** Combo de tipos de documento de sustento (SP Rentas.sp_cuentacorriente @msquery=11). */
  @Get('tipos-doc-sustento')
  async getTiposDocSustento(): Promise<AjusteTiposDocResult> {
    return this.service.getTiposDocSustento();
  }
}
