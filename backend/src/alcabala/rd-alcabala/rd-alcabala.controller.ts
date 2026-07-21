import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RdAlcabalaService } from './rd-alcabala.service';
import {
  SearchContribuyenteSchema,
  SearchContribuyenteDto,
} from './dto/search-contribuyente.dto';
import {
  SearchPendientesSchema,
  SearchPendientesDto,
} from './dto/search-pendientes.dto';
import { GenerarRdSchema, GenerarRdDto } from './dto/generar-rd.dto';
import { ContribuyenteSearchResult, PendienteAlcabalaResult, GenerarRdResult } from './rd-alcabala.types';
import { z } from 'zod';

@Controller('alcabala/rd-alcabala')
@UseGuards(JwtAuthGuard)
export class RdAlcabalaController {
  constructor(private readonly service: RdAlcabalaService) {}

  @Get('contribuyentes')
  async searchContribuyente(
    @Query() query: Record<string, string>,
  ): Promise<ContribuyenteSearchResult> {
    let dto: SearchContribuyenteDto;
    try {
      dto = SearchContribuyenteSchema.parse(query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          data: [],
          total: 0,
          page: 1,
          pageSize: 15,
          totalPages: 0,
          error: error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos',
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
    return this.service.searchContribuyente(dto);
  }

  @Get('pendientes')
  async searchPendientes(
    @Query() query: Record<string, string>,
  ): Promise<PendienteAlcabalaResult> {
    let dto: SearchPendientesDto;
    try {
      dto = SearchPendientesSchema.parse(query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          data: [],
          total: 0,
          error: error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos',
        };
      }
      return {
        success: false,
        data: [],
        total: 0,
        error: 'Parámetros inválidos',
      };
    }
    return this.service.searchPendientes(dto);
  }

  @Post('generar-rd')
  async generarRD(@Body() body: Record<string, any>): Promise<GenerarRdResult> {
    let dto: GenerarRdDto;
    try {
      dto = GenerarRdSchema.parse(body);
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
    return this.service.generarRD(dto);
  }
}
