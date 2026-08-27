import {
  Controller,
  Get,
  Query,
  UseGuards,
  Post,
  Req,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { ConsultaRdAlcabalaService } from './consulta-rd-alcabala.service';
import {
  SearchRdAlcabalaSchema,
  SearchRdAlcabalaDto,
} from './dto/search-rd-alcabala.dto';
import {
  DetalleRdAlcabalaSchema,
  DetalleRdAlcabalaDto,
} from './dto/detalle-rd-alcabala.dto';
import {
  RutaRdAlcabalaSchema,
  RutaRdAlcabalaDto,
} from './dto/ruta-rd-alcabala.dto';
import {
  EliminarRdAlcabalaSchema,
  EliminarRdAlcabalaDto,
} from './dto/eliminar-rd-alcabala.dto';
import {
  ConsultaRDResult,
  DetalleRDResult,
  RutaRDResult,
  ImprimirRDResult,
  EliminarRDResult,
} from './consulta-rd-alcabala.types';
import * as os from 'os';
import { z } from 'zod';

@Controller('alcabala/consulta-rd')
@UseGuards(JwtAuthGuard)
export class ConsultaRdAlcabalaController {
  constructor(private readonly service: ConsultaRdAlcabalaService) {}

  @Get()
  async search(@Query() query: Record<string, string>): Promise<ConsultaRDResult> {
    let dto: SearchRdAlcabalaDto;
    try {
      dto = SearchRdAlcabalaSchema.parse(query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          data: [],
          total: 0,
          page: 1,
          totalPages: 0,
          error: error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos',
        };
      }
      return {
        success: false,
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
        error: 'Parámetros inválidos',
      };
    }
    return this.service.search(dto);
  }

  @Get('detail')
  async detail(@Query() query: Record<string, string>): Promise<DetalleRDResult> {
    let dto: DetalleRdAlcabalaDto;
    try {
      dto = DetalleRdAlcabalaSchema.parse(query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          nombre: '',
          nomb_val: '',
          num_val: '',
          ano_val: 0,
          data: [],
          error: error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos',
        };
      }
      return {
        success: false,
        nombre: '',
        nomb_val: '',
        num_val: '',
        ano_val: 0,
        data: [],
        error: 'Parámetros inválidos',
      };
    }
    return this.service.getDetail(dto);
  }

  @Get('ruta')
  async ruta(@Query() query: Record<string, string>): Promise<RutaRDResult> {
    let dto: RutaRdAlcabalaDto;
    try {
      dto = RutaRdAlcabalaSchema.parse(query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          nombre: '',
          nomb_val: '',
          num_val: '',
          ano_val: 0,
          data: [],
          error: error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos',
        };
      }
      return {
        success: false,
        nombre: '',
        nomb_val: '',
        num_val: '',
        ano_val: 0,
        data: [],
        error: 'Parámetros inválidos',
      };
    }
    return this.service.getRuta(dto);
  }

  @Get('imprimir')
  async imprimir(
    @Query() query: Record<string, string>,
  ): Promise<ImprimirRDResult> {
    const num_val = query.num_val ?? '';
    const ano_val = query.ano_val ?? '';
    if (!num_val || !ano_val) {
      return {
        success: false,
        error: 'num_val y ano_val son requeridos',
      };
    }
    return this.service.imprimir(num_val, ano_val);
  }

  @Post('eliminar')
  @HttpCode(HttpStatus.OK)
  async eliminar(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<EliminarRDResult> {
    let dto: EliminarRdAlcabalaDto;
    try {
      dto = EliminarRdAlcabalaSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestException({
          success: false,
          error: error.issues.map((i) => i.message).join(', '),
        });
      }
      throw new BadRequestException({
        success: false,
        error: 'Parámetros inválidos',
      });
    }

    const operador = (req.user as any)?.username || '';
    const estacion = os.hostname();

    const result = await this.service.eliminar(dto, operador, estacion);
    if (!result.success) {
      throw new InternalServerErrorException(result);
    }
    return result;
  }
}
