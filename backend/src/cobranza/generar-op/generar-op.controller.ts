import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GenerarOpService } from './generar-op.service';
import { ProcesarOpSchema, ProcesarOpDto } from './dto/procesar-op.dto';
import { ProcesarOpResult } from './generar-op.types';
import { z } from 'zod';

@Controller('cobranza/generar-op')
@UseGuards(JwtAuthGuard)
export class GenerarOpController {
  constructor(private readonly service: GenerarOpService) {}

  /** Proyección de estado de cuenta (Caja.sp_EstCta_Rentasop_proyectado). */
  @Post('procesar')
  @HttpCode(HttpStatus.OK)
  async procesar(@Body() body: unknown): Promise<ProcesarOpResult> {
    let dto: ProcesarOpDto;
    try {
      dto = ProcesarOpSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMsg =
          error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos';
        return {
          success: false,
          data: [],
          total: 0,
          error: errorMsg,
        };
      }
      return {
        success: false,
        data: [],
        total: 0,
        error: 'Parámetros inválidos',
      };
    }
    return this.service.procesar(dto);
  }
}
