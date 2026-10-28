import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CuadreCajaService } from './cuadre-caja.service';
import {
  SearchCuadreCajaSchema,
  SearchCuadreCajaDto,
} from './dto/cuadre-caja.dto';
import { CuadreCajaRow } from './dto/cuadre-caja.types';

@Controller('tesoreria/cuadre-caja')
@UseGuards(JwtAuthGuard)
export class CuadreCajaController {
  constructor(private readonly cuadreCajaService: CuadreCajaService) {}

  @Post('search')
  async search(
    @Body() dto: SearchCuadreCajaDto,
  ): Promise<{ success: true; data: CuadreCajaRow | null }> {
    let parsed: SearchCuadreCajaDto;
    try {
      parsed = SearchCuadreCajaSchema.parse(dto);
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
    const data = await this.cuadreCajaService.search(parsed);
    return { success: true, data };
  }
}
