import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ContribuyentesSinValoresService } from './contribuyentes-sin-valores.service';
import {
  SearchContribuyentesSinValoresSchema,
  SearchContribuyentesSinValoresDto,
} from './dto/search-contribuyentes-sin-valores.dto';
import {
  ContribuyenteSinValoresRow,
  PaginatedResponse,
  ErrorResponse,
} from './contribuyentes-sin-valores.types';

@Controller('cobranza/contribuyentes-sin-valores')
@UseGuards(JwtAuthGuard)
export class ContribuyentesSinValoresController {
  constructor(
    private readonly contribuyentesSinValoresService: ContribuyentesSinValoresService,
  ) {}

  @Post('search')
  async search(
    @Body() dto: SearchContribuyentesSinValoresDto,
  ): Promise<
    | ({ success: true } & PaginatedResponse<ContribuyenteSinValoresRow>)
    | ErrorResponse
  > {
    let parsed: SearchContribuyentesSinValoresDto;
    try {
      parsed = SearchContribuyentesSinValoresSchema.parse(dto);
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

    try {
      const result = await this.contribuyentesSinValoresService.search(parsed);
      return { success: true, ...result };
    } catch (error) {
      // Las HttpException conservan su status y payload (p. ej. 400 de
      // validación); cualquier otro fallo se reporta como error de negocio.
      if (error instanceof HttpException) {
        throw error;
      }
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al consultar contribuyentes sin valores tributarios.',
      };
    }
  }
}
