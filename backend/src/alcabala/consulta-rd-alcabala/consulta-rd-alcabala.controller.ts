import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
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
  ImprimirRdAlcabalaSchema,
  ImprimirRdAlcabalaDto,
} from './dto/imprimir-rd-alcabala.dto';
import { ConsultaRDResult, DetalleRDResult, RutaRDResult, ImprimirRDResult } from './consulta-rd-alcabala.types';
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
  async imprimir(@Query() query: Record<string, string>): Promise<ImprimirRDResult> {
    let dto: ImprimirRdAlcabalaDto;
    try {
      dto = ImprimirRdAlcabalaSchema.parse(query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos',
        };
      }
      return {
        success: false,
        error: 'Parámetros inválidos',
      };
    }
    return this.service.getImprimir(dto);
  }
}
