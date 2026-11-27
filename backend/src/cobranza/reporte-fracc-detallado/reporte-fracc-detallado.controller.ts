import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReporteFraccDetalladoService } from './reporte-fracc-detallado.service';
import {
  SearchFraccDetalladoDto,
  SearchFraccDetalladoSchema,
} from './dto/search-fracc-detallado.dto';
import {
  CatalogosFraccDetalladoDto,
  CatalogosFraccDetalladoSchema,
} from './dto/catalogos-fracc-detallado.dto';
import {
  FraccDetalladoCatalogos,
  FraccDetalladoResult,
} from './reporte-fracc-detallado.types';

@Controller('cobranza/reporte-fracc-detallado')
@UseGuards(JwtAuthGuard)
export class ReporteFraccDetalladoController {
  constructor(private readonly service: ReporteFraccDetalladoService) {}

  /** Búsqueda del reporte (SP Rentas.Rpt_Rentas_General @BUSC=40). */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(@Body() body: unknown): Promise<FraccDetalladoResult> {
    let dto: SearchFraccDetalladoDto;
    try {
      dto = SearchFraccDetalladoSchema.parse(body);
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

  /** Catálogos de los combos Año Corte / Mes Corte (@BUSC=38 y @BUSC=39). */
  @Post('catalogos')
  @HttpCode(HttpStatus.OK)
  async catalogos(@Body() body: unknown): Promise<FraccDetalladoCatalogos> {
    let dto: CatalogosFraccDetalladoDto;
    try {
      dto = CatalogosFraccDetalladoSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMsg =
          error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos';
        return {
          success: false,
          anios: [],
          meses: [],
          error: errorMsg,
        };
      }
      return {
        success: false,
        anios: [],
        meses: [],
        error: 'Parámetros inválidos',
      };
    }
    return this.service.getCatalogos(dto);
  }
}
