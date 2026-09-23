import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrediosInconsistenciaService } from './predios-inconsistencia.service';
import {
  SearchInconsistenciaPrediosDto,
  SearchInconsistenciaPrediosSchema,
} from './dto/search-inconsistencia-predios.dto';
import {
  PaginatedResponse,
  PredioInconsistenciaRow,
  TipoInconsistenciaOption,
  UsoPredioOption,
} from './predios-inconsistencia.types';

@Controller('inconsistencia/predios')
@UseGuards(JwtAuthGuard)
export class PrediosInconsistenciaController {
  constructor(private readonly service: PrediosInconsistenciaService) {}

  @Post('search')
  async search(
    @Body() body: unknown,
  ): Promise<PaginatedResponse<PredioInconsistenciaRow>> {
    let dto: SearchInconsistenciaPrediosDto;
    try {
      dto = SearchInconsistenciaPrediosSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          code: 'validation_error',
          message: 'Validation failed',
          details: {
            errors: error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
        });
      }
      throw error;
    }

    return this.service.search(dto);
  }

  @Get('combos/tipos')
  async getTipos(): Promise<{
    success: true;
    data: TipoInconsistenciaOption[];
  }> {
    const data = await this.service.getTiposInconsistencia();
    return { success: true, data };
  }

  @Get('combos/usos')
  async getUsos(): Promise<{ success: true; data: UsoPredioOption[] }> {
    const data = await this.service.getUsosPredio();
    return { success: true, data };
  }
}
