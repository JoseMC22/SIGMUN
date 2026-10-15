import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ComparaLiquidacionService } from './compara-liquidacion.service';
import {
  BuscarLiquidacionSchema,
  BuscarLiquidacionDto,
} from './dto/compara-liquidacion.dto';
import { LiquidacionComparativoResponse } from './dto/compara-liquidacion.types';

@Controller('administracion-tributaria/compara-liquidacion')
@UseGuards(JwtAuthGuard)
export class ComparaLiquidacionController {
  constructor(
    private readonly comparaLiquidacionService: ComparaLiquidacionService,
  ) {}

  @Post('buscar')
  async buscar(
    @Body() dto: BuscarLiquidacionDto,
  ): Promise<{ success: true } & LiquidacionComparativoResponse> {
    let parsed: BuscarLiquidacionDto;
    try {
      parsed = BuscarLiquidacionSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((issue) => issue.message).join(', ');
        throw new BadRequestException({
          success: false,
          error: messages || 'Datos de entrada inválidos.',
        });
      }
      throw new BadRequestException({
        success: false,
        error: 'Datos de entrada inválidos.',
      });
    }
    const result = await this.comparaLiquidacionService.buscarLiquidacion(
      parsed.numero,
    );
    return { success: true, ...result };
  }
}
