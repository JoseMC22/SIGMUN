import { Controller, Get, Param, Post, Req, Body, Query, UseGuards, HttpCode, HttpStatus, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Request } from 'express';
import * as os from 'os';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DeterminarAlcabalaService } from './determinar-alcabala.service';
import {
  SearchContribuyenteSchema,
  SearchContribuyenteDto,
} from './dto/search-contribuyente.dto';
import { CrearAlcabalaSchema, CrearAlcabalaDto } from './dto/crear-alcabala.dto';
import { ContribuyenteSearchResult, AlcabalasResult, DetalleAlcabalaResult, CrearAlcabalaResult } from './determinar-alcabala.types';
import { z } from 'zod';

@Controller('alcabala/determinar-alcabala')
@UseGuards(JwtAuthGuard)
export class DeterminarAlcabalaController {
  constructor(private readonly service: DeterminarAlcabalaService) {}

  @Get('buscar-contribuyente')
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

  @Get('alcabalas/:codigo')
  async getAlcabalas(
    @Param('codigo') codigo: string,
  ): Promise<AlcabalasResult> {
    return this.service.getAlcabalasByContribuyente(codigo);
  }

  @Get('detalle/:idAlcabala')
  async getDetalle(
    @Param('idAlcabala') idAlcabala: string,
  ): Promise<DetalleAlcabalaResult> {
    const id = parseInt(idAlcabala, 10);
    if (isNaN(id)) {
      return {
        success: false,
        data: null,
        error: 'ID de alcabala inválido',
      };
    }
    return this.service.getDetalleAlcabala(id);
  }

  @Post('crear')
  @HttpCode(HttpStatus.CREATED)
  async crear(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<CrearAlcabalaResult> {
    let dto: CrearAlcabalaDto;
    try {
      dto = CrearAlcabalaSchema.parse(body);
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

    const usuario = (req.user as any)?.username || '';
    const estacion = os.hostname();

    const result = await this.service.crear(dto, usuario, estacion);
    if (!result.success) {
      throw new InternalServerErrorException(result);
    }
    return result;
  }
}