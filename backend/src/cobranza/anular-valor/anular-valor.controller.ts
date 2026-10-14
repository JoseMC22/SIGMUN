import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AnularValorService } from './anular-valor.service';
import {
  SearchAnularValorSchema,
  SearchAnularValorDto,
} from './dto/search-anular-valor.dto';
import {
  GetValoresSchema,
  GetValoresDto,
} from './dto/get-valores.dto';
import {
  GetMotivoSchema,
  GetMotivoDto,
} from './dto/get-motivo.dto';
import { AnularValorSchema, AnularValorDto } from './dto/anular-valor.dto';
import {
  AnularValorResult,
  MotivoResult,
  SearchAnularValorResult,
  ValoresResult,
} from './anular-valor.types';
import { z } from 'zod';

@Controller('cobranza/anular-valor')
@UseGuards(JwtAuthGuard)
export class AnularValorController {
  constructor(private readonly service: AnularValorService) {}

  /** Listado de contribuyentes (fase 1; sin anulación). */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(@Body() body: unknown): Promise<SearchAnularValorResult> {
    let dto: SearchAnularValorDto;
    try {
      dto = SearchAnularValorSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMsg =
          error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos';
        return {
          success: false,
          data: [],
          total: 0,
          page: 1,
          pageSize: 15,
          totalPages: 0,
          error: errorMsg,
        };
      }
      return {
        success: false,
        data: [],
        total: 0,
        page: 1,
        pageSize: 15,
        totalPages: 0,
        error: 'Parámetros inválidos',
      };
    }
    return this.service.search(dto);
  }

  /** Valores emitidos de un contribuyente (ssp_Consultadocu @msquery=3). */
  @Post('valores')
  @HttpCode(HttpStatus.OK)
  async valores(@Body() body: unknown): Promise<ValoresResult> {
    let dto: GetValoresDto;
    try {
      dto = GetValoresSchema.parse(body);
    } catch {
      return {
        success: false,
        data: [],
        total: 0,
        error: 'Código inválido',
      };
    }
    return this.service.getValores(dto.Codigo);
  }

  /** Motivo(s) de anulación (SP_Mvalores @msquery=14, solo lectura). */
  @Post('motivo')
  @HttpCode(HttpStatus.OK)
  async motivo(@Body() body: unknown): Promise<MotivoResult> {
    let dto: GetMotivoDto;
    try {
      dto = GetMotivoSchema.parse(body);
    } catch {
      return {
        success: false,
        data: [],
        total: 0,
        error: 'Llave del valor inválida',
      };
    }
    return this.service.getMotivo(dto);
  }

  /**
   * Anulación de un valor (fase 2). Mismo patrón de error-objeto que
   * valores(): nunca tira, devuelve { success:false, error }.
   */
  @Post('anular')
  @HttpCode(HttpStatus.OK)
  async anular(@Body() body: unknown): Promise<AnularValorResult> {
    let dto: AnularValorDto;
    try {
      dto = AnularValorSchema.parse(body);
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
    return this.service.anularValor(dto);
  }
}
