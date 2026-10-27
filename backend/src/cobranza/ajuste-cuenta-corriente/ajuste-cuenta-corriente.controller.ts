import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AjusteCuentaCorrienteService } from './ajuste-cuenta-corriente.service';
import {
  AjusteTiposDocResult,
  ImputarMontoResult,
} from './ajuste-cuenta-corriente.types';
import {
  ImputarMontoDto,
  ImputarMontoSchema,
} from './dto/imputar-monto.dto';
import { z } from 'zod';

@Controller('cobranza/ajuste-cuenta-corriente')
@UseGuards(JwtAuthGuard)
export class AjusteCuentaCorrienteController {
  constructor(private readonly service: AjusteCuentaCorrienteService) {}

  /** Combo de tipos de documento de sustento (SP Rentas.sp_cuentacorriente @msquery=11). */
  @Get('tipos-doc-sustento')
  async getTiposDocSustento(): Promise<AjusteTiposDocResult> {
    return this.service.getTiposDocSustento();
  }

  /**
   * Imputación de monto (Rentas.sp_Compensarrecibosjson). Mismo patrón de
   * error-objeto que anular-valor: nunca tira, devuelve { success:false,
   * error }. La estación del SP legacy era el PRIMER OCTETO de la IP del
   * cliente (explode('.', REMOTE_ADDR)[0]): se deriva acá, no viaja en el
   * body.
   */
  @Post('imputar-monto')
  @HttpCode(HttpStatus.OK)
  async imputarMonto(
    @Body() body: unknown,
    @Request() req: Request & { socket: { remoteAddress?: string } },
  ): Promise<ImputarMontoResult> {
    let dto: ImputarMontoDto;
    try {
      dto = ImputarMontoSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error:
            error.issues.map((i) => i.message).join(', ') ||
            'Parámetros inválidos',
        };
      }
      return { success: false, error: 'Parámetros inválidos' };
    }

    // IP del cliente: primer valor de x-forwarded-for, si no el socket.
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      '';
    const estacion = ip.split('.')[0] || '';

    return this.service.imputarMonto(dto, estacion);
  }
}
